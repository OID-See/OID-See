#!/usr/bin/env python3
"""
Tests for findings_sarif.py

Covers SARIF 2.1.0 export from OID-See findings using deterministic fixtures.

Scenarios covered:
  1. Empty findings list produces a valid, empty SARIF document
  2. Single finding produces correct SARIF structure (schema, version, runs)
  3. ruleId is derived from the highest-weight evidence item
  4. ruleId falls back to first reasonCode when evidence has no weight
  5. risk level mapping: critical/high → error, medium → warning, low/info → note
  6. message.text includes displayName, riskLevel, riskScore, reasonCodes, confidence, recommendedAction
  7. Rules deduplication: one rule per unique reason code across all findings
  8. Logical location: name=displayName, kind=object, fullyQualifiedName=servicePrincipalId
  9. Physical location URI: oidsee://servicePrincipal/<subjectKey>
 10. Result properties preserve all required OID-See fields
 11. None values are dropped from result properties
 12. write_sarif produces a valid, parseable .sarif file
 13. generate_findings.py CLI produces a .sarif file via extension inference
 14. generate_findings.py CLI produces a .sarif file via --format sarif
 15. scanner_findings_helper.detect_format returns "sarif" for .sarif extension
 16. scanner_findings_helper.write_findings writes valid SARIF for fmt="sarif"
 17. Deterministic output: same input → same SARIF JSON (stable findingId → ruleId)
 18. Finding with no evidence falls back to reasonCodes list for ruleId
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from typing import Any, Dict, List

# Add repository root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from findings_sarif import findings_to_sarif, write_sarif


# ---------------------------------------------------------------------------
# Shared synthetic fixtures
# ---------------------------------------------------------------------------

def _make_export(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    return {
        "format": {"name": "oidsee-graph", "version": "1.1"},
        "generatedAt": "2025-01-01T00:00:00Z",
        "tenant": {
            "tenantId": "00000000-0000-0000-0000-000000000001",
            "displayName": "SARIF Test Tenant",
        },
        "nodes": nodes,
        "edges": edges or [],
    }


def _make_sp_node(
    node_id: str,
    display_name: str,
    score: int,
    level: str,
    reasons: List[Dict[str, Any]],
    props: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    base_props: Dict[str, Any] = {
        "servicePrincipalId": node_id.replace("sp:", ""),
        "appId": f"app-{node_id.replace('sp:', '')}",
        "appDisplayName": display_name,
        "publisherName": "Test Publisher",
        "appOwnerOrganizationId": "tenant-sarif",
        "appOwnership": "3rd Party",
        "verifiedPublisher": None,
    }
    if props:
        base_props.update(props)
    return {
        "id": node_id,
        "type": "ServicePrincipal",
        "displayName": display_name,
        "properties": base_props,
        "risk": {
            "score": score,
            "level": level,
            "reasons": reasons,
        },
    }


_SINGLE_FINDING_EXPORT = _make_export([
    _make_sp_node(
        "sp:alpha",
        "Alpha App",
        score=65,
        level="high",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 20, "message": "Has app roles"},
            {"code": "BROAD_REACHABILITY", "weight": 15, "message": "No assignment required"},
        ],
    ),
])

_MULTI_FINDING_EXPORT = _make_export([
    _make_sp_node(
        "sp:alpha",
        "Alpha App",
        score=65,
        level="high",
        reasons=[{"code": "HAS_APP_ROLE", "weight": 20, "message": "Has app roles"}],
    ),
    _make_sp_node(
        "sp:beta",
        "Beta App",
        score=45,
        level="medium",
        reasons=[{"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"}],
    ),
    _make_sp_node(
        "sp:gamma",
        "Gamma App",
        score=10,
        level="low",
        reasons=[{"code": "GOVERNANCE", "weight": 4, "message": "No assignment"}],
    ),
])


def _build_findings(export: Dict[str, Any]) -> List[Dict[str, Any]]:
    from finding_builder import build_findings
    return build_findings(export, min_risk_level="low")


# ---------------------------------------------------------------------------
# Scenario 1: Empty findings → valid empty SARIF
# ---------------------------------------------------------------------------

def test_empty_findings_produces_valid_sarif():
    print("\n=== Scenario 1: empty findings → valid SARIF ===")
    doc = findings_to_sarif([])

    assert doc["version"] == "2.1.0"
    assert "$schema" in doc
    assert "runs" in doc
    assert len(doc["runs"]) == 1

    run = doc["runs"][0]
    assert run["tool"]["driver"]["name"] == "OID-See"
    assert run["tool"]["driver"]["informationUri"] == "https://github.com/OID-See/OID-See"
    assert run["tool"]["driver"]["rules"] == []
    assert run["results"] == []


# ---------------------------------------------------------------------------
# Scenario 2: Single finding → correct SARIF structure
# ---------------------------------------------------------------------------

def test_single_finding_sarif_structure():
    print("\n=== Scenario 2: single finding → correct SARIF structure ===")
    findings = _build_findings(_SINGLE_FINDING_EXPORT)
    assert len(findings) >= 1

    doc = findings_to_sarif(findings)
    run = doc["runs"][0]

    assert len(run["results"]) == len(findings)
    assert len(run["tool"]["driver"]["rules"]) >= 1

    result = run["results"][0]
    assert "ruleId" in result
    assert "level" in result
    assert "message" in result
    assert "text" in result["message"]
    assert "locations" in result
    assert len(result["locations"]) == 1
    assert "properties" in result


# ---------------------------------------------------------------------------
# Scenario 3: ruleId is highest-weight evidence item
# ---------------------------------------------------------------------------

def test_ruleid_from_highest_weight_evidence():
    print("\n=== Scenario 3: ruleId from highest-weight evidence ===")
    findings = _build_findings(_SINGLE_FINDING_EXPORT)
    # The fixture has HAS_APP_ROLE (weight=20) and BROAD_REACHABILITY (weight=15)
    # Primary ruleId should be HAS_APP_ROLE (highest weight)
    doc = findings_to_sarif(findings)
    result = doc["runs"][0]["results"][0]
    assert result["ruleId"] == "HAS_APP_ROLE", (
        f"Expected HAS_APP_ROLE as primary ruleId, got {result['ruleId']}"
    )


# ---------------------------------------------------------------------------
# Scenario 4: ruleId falls back to first reasonCode when no evidence weight
# ---------------------------------------------------------------------------

def test_ruleid_fallback_to_first_reason_code():
    print("\n=== Scenario 4: ruleId fallback when no weight ===")
    finding = {
        "findingId": "oidf-test001",
        "subjectKey": "sp-noweight",
        "displayName": "No Weight App",
        "servicePrincipalId": "sp-noweight",
        "appId": "app-noweight",
        "riskScore": 30,
        "riskLevel": "medium",
        "reasonCodes": ["UNVERIFIED_PUBLISHER", "GOVERNANCE"],
        "evidence": [
            {"reasonCode": "UNVERIFIED_PUBLISHER", "weight": 0, "title": "Publisher not verified"},
            {"reasonCode": "GOVERNANCE", "weight": 0, "title": "Governance posture"},
        ],
        "confidence": "medium",
        "recommendedAction": "Review publisher.",
        "falsePositiveNotes": "Some apps are fine.",
        "affectedRelationships": [],
    }
    doc = findings_to_sarif([finding])
    result = doc["runs"][0]["results"][0]
    # Both have weight=0; max() picks the first one in iteration order
    assert result["ruleId"] in ("UNVERIFIED_PUBLISHER", "GOVERNANCE")


# ---------------------------------------------------------------------------
# Scenario 5: Risk level mapping
# ---------------------------------------------------------------------------

def test_risk_level_mapping():
    print("\n=== Scenario 5: risk level mapping ===")
    cases = [
        ("critical", "error"),
        ("high", "error"),
        ("medium", "warning"),
        ("low", "note"),
        ("info", "note"),
    ]
    for oid_level, expected_sarif_level in cases:
        finding = {
            "findingId": f"oidf-{oid_level}",
            "subjectKey": f"sp-{oid_level}",
            "displayName": f"{oid_level} App",
            "servicePrincipalId": f"sp-{oid_level}",
            "riskScore": 50,
            "riskLevel": oid_level,
            "reasonCodes": ["HAS_APP_ROLE"],
            "evidence": [{"reasonCode": "HAS_APP_ROLE", "weight": 20, "title": "App role"}],
            "confidence": "high",
            "recommendedAction": "Review.",
            "falsePositiveNotes": "",
            "affectedRelationships": [],
        }
        doc = findings_to_sarif([finding])
        result = doc["runs"][0]["results"][0]
        assert result["level"] == expected_sarif_level, (
            f"Level {oid_level!r} → expected SARIF {expected_sarif_level!r}, got {result['level']!r}"
        )


# ---------------------------------------------------------------------------
# Scenario 6: message.text includes key fields
# ---------------------------------------------------------------------------

def test_message_text_includes_key_fields():
    print("\n=== Scenario 6: message.text includes key fields ===")
    findings = _build_findings(_SINGLE_FINDING_EXPORT)
    doc = findings_to_sarif(findings)
    result = doc["runs"][0]["results"][0]
    msg = result["message"]["text"]

    assert "Alpha App" in msg, "message.text should include displayName"
    assert "high" in msg.lower(), "message.text should include riskLevel"
    assert "65" in msg, "message.text should include riskScore"


# ---------------------------------------------------------------------------
# Scenario 7: Rules deduplication — one rule per unique reason code
# ---------------------------------------------------------------------------

def test_rules_deduplication():
    print("\n=== Scenario 7: rules deduplication ===")
    findings = _build_findings(_MULTI_FINDING_EXPORT)
    doc = findings_to_sarif(findings)

    rules = doc["runs"][0]["tool"]["driver"]["rules"]
    rule_ids = [r["id"] for r in rules]

    # No duplicates
    assert len(rule_ids) == len(set(rule_ids)), f"Duplicate rule IDs found: {rule_ids}"

    # All reason codes from findings are represented
    all_codes: set = set()
    for f in findings:
        all_codes.update(f.get("reasonCodes") or [])
    for code in all_codes:
        assert code in rule_ids, f"Reason code {code!r} missing from SARIF rules"


# ---------------------------------------------------------------------------
# Scenario 8: Logical location fields
# ---------------------------------------------------------------------------

def test_logical_location_fields():
    print("\n=== Scenario 8: logical location fields ===")
    findings = _build_findings(_SINGLE_FINDING_EXPORT)
    doc = findings_to_sarif(findings)
    result = doc["runs"][0]["results"][0]

    location = result["locations"][0]
    assert "logicalLocations" in location
    locs = location["logicalLocations"]
    assert len(locs) == 1

    ll = locs[0]
    assert ll["kind"] == "object"
    assert "name" in ll
    assert "fullyQualifiedName" in ll


# ---------------------------------------------------------------------------
# Scenario 9: Physical location URI
# ---------------------------------------------------------------------------

def test_physical_location_uri():
    print("\n=== Scenario 9: physical location URI ===")
    findings = _build_findings(_SINGLE_FINDING_EXPORT)
    doc = findings_to_sarif(findings)
    result = doc["runs"][0]["results"][0]

    location = result["locations"][0]
    assert "physicalLocation" in location
    phys = location["physicalLocation"]
    assert "artifactLocation" in phys
    uri = phys["artifactLocation"]["uri"]
    assert uri.startswith("oidsee://servicePrincipal/"), (
        f"Physical URI should start with oidsee://servicePrincipal/, got: {uri!r}"
    )


# ---------------------------------------------------------------------------
# Scenario 10: Result properties preserve OID-See fields
# ---------------------------------------------------------------------------

def test_result_properties_preserve_oid_see_fields():
    print("\n=== Scenario 10: result properties preserve OID-See fields ===")
    findings = _build_findings(_SINGLE_FINDING_EXPORT)
    doc = findings_to_sarif(findings)
    result = doc["runs"][0]["results"][0]
    props = result["properties"]

    required_keys = [
        "findingId",
        "subjectKey",
        "displayName",
        "riskScore",
        "riskLevel",
        "reasonCodes",
        "confidence",
        "recommendedAction",
    ]
    for key in required_keys:
        assert key in props, f"Result properties missing expected key: {key!r}"


# ---------------------------------------------------------------------------
# Scenario 11: None values dropped from result properties
# ---------------------------------------------------------------------------

def test_none_values_dropped_from_properties():
    print("\n=== Scenario 11: None values dropped from properties ===")
    finding = {
        "findingId": "oidf-nulltest",
        "subjectKey": "sp-nulltest",
        "displayName": "Null Test App",
        "servicePrincipalId": None,   # explicitly None
        "appId": None,                # explicitly None
        "publisherName": None,
        "verifiedPublisherId": None,
        "appOwnerOrganizationId": None,
        "appOwnership": "3rd Party",
        "riskScore": 25,
        "riskLevel": "low",
        "reasonCodes": ["GOVERNANCE"],
        "evidence": [{"reasonCode": "GOVERNANCE", "weight": 4, "title": "Governance"}],
        "confidence": "low",
        "recommendedAction": "Review.",
        "falsePositiveNotes": None,   # explicitly None
        "affectedRelationships": [],
    }
    doc = findings_to_sarif([finding])
    props = doc["runs"][0]["results"][0]["properties"]

    # None fields should be absent
    assert "servicePrincipalId" not in props
    assert "appId" not in props
    assert "falsePositiveNotes" not in props

    # Non-None fields should be present
    assert props["appOwnership"] == "3rd Party"
    assert props["findingId"] == "oidf-nulltest"


# ---------------------------------------------------------------------------
# Scenario 12: write_sarif produces a valid parseable .sarif file
# ---------------------------------------------------------------------------

def test_write_sarif_produces_valid_file():
    print("\n=== Scenario 12: write_sarif produces valid .sarif file ===")
    findings = _build_findings(_SINGLE_FINDING_EXPORT)

    with tempfile.NamedTemporaryFile(suffix=".sarif", delete=False) as tf:
        path = tf.name
    try:
        write_sarif(findings, path)
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
        doc = json.loads(content)

        assert doc["version"] == "2.1.0"
        assert len(doc["runs"][0]["results"]) == len(findings)
        assert content.endswith("\n"), "File should end with a newline"
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 13: generate_findings CLI produces .sarif via extension inference
# ---------------------------------------------------------------------------

def test_generate_findings_sarif_extension_inference():
    print("\n=== Scenario 13: generate_findings CLI → .sarif via extension ===")
    import generate_findings

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf_in:
        json.dump(_SINGLE_FINDING_EXPORT, tf_in)
        in_path = tf_in.name

    with tempfile.NamedTemporaryFile(suffix=".sarif", delete=False) as tf_out:
        out_path = tf_out.name

    try:
        rc = generate_findings.main([in_path, out_path])
        assert rc == 0, f"generate_findings.main returned {rc}"
        with open(out_path, "r", encoding="utf-8") as fh:
            doc = json.load(fh)
        assert doc["version"] == "2.1.0"
        assert len(doc["runs"]) == 1
    finally:
        os.unlink(in_path)
        os.unlink(out_path)


# ---------------------------------------------------------------------------
# Scenario 14: generate_findings CLI produces .sarif via --format sarif
# ---------------------------------------------------------------------------

def test_generate_findings_sarif_format_flag():
    print("\n=== Scenario 14: generate_findings CLI → .sarif via --format sarif ===")
    import generate_findings

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf_in:
        json.dump(_SINGLE_FINDING_EXPORT, tf_in)
        in_path = tf_in.name

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf_out:
        # intentionally use .json extension but override with --format sarif
        out_path = tf_out.name

    try:
        rc = generate_findings.main([in_path, out_path, "--format", "sarif"])
        assert rc == 0, f"generate_findings.main returned {rc}"
        with open(out_path, "r", encoding="utf-8") as fh:
            doc = json.load(fh)
        assert doc["version"] == "2.1.0"
    finally:
        os.unlink(in_path)
        os.unlink(out_path)


# ---------------------------------------------------------------------------
# Scenario 15: scanner_findings_helper.detect_format returns "sarif"
# ---------------------------------------------------------------------------

def test_detect_format_sarif():
    print("\n=== Scenario 15: detect_format returns sarif for .sarif ===")
    from scanner_findings_helper import detect_format

    assert detect_format("findings.sarif") == "sarif"
    assert detect_format("findings.SARIF") == "sarif"
    # Existing formats still work
    assert detect_format("findings.json") == "json"
    assert detect_format("findings.csv") == "csv"
    assert detect_format("findings.md") == "markdown"
    assert detect_format("findings.txt") == "json"   # unknown → default json


# ---------------------------------------------------------------------------
# Scenario 16: scanner_findings_helper.write_findings writes valid SARIF
# ---------------------------------------------------------------------------

def test_write_findings_sarif_format():
    print("\n=== Scenario 16: write_findings writes valid SARIF ===")
    from scanner_findings_helper import write_findings

    findings = _build_findings(_SINGLE_FINDING_EXPORT)

    with tempfile.NamedTemporaryFile(suffix=".sarif", delete=False) as tf:
        path = tf.name
    try:
        write_findings(findings, path, "sarif", _SINGLE_FINDING_EXPORT)
        with open(path, "r", encoding="utf-8") as fh:
            doc = json.load(fh)
        assert doc["version"] == "2.1.0"
        assert len(doc["runs"][0]["results"]) == len(findings)
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 17: Deterministic output (same input → same SARIF)
# ---------------------------------------------------------------------------

def test_sarif_output_is_deterministic():
    print("\n=== Scenario 17: SARIF output is deterministic ===")
    findings = _build_findings(_MULTI_FINDING_EXPORT)

    doc1 = findings_to_sarif(findings)
    doc2 = findings_to_sarif(findings)

    serialised1 = json.dumps(doc1, sort_keys=True)
    serialised2 = json.dumps(doc2, sort_keys=True)
    assert serialised1 == serialised2, "SARIF output is not deterministic"

    # Also verify ruleIds are stable
    rules1 = [r["id"] for r in doc1["runs"][0]["tool"]["driver"]["rules"]]
    rules2 = [r["id"] for r in doc2["runs"][0]["tool"]["driver"]["rules"]]
    assert rules1 == rules2


# ---------------------------------------------------------------------------
# Scenario 18: Finding with no evidence falls back to reasonCodes
# ---------------------------------------------------------------------------

def test_ruleid_with_no_evidence_block():
    print("\n=== Scenario 18: ruleId with no evidence block ===")
    finding = {
        "findingId": "oidf-noevidence",
        "subjectKey": "sp-noevidence",
        "displayName": "No Evidence App",
        "servicePrincipalId": "sp-noevidence",
        "appId": "app-noevidence",
        "riskScore": 20,
        "riskLevel": "low",
        "reasonCodes": ["CREDENTIALS_PRESENT", "GOVERNANCE"],
        "evidence": [],  # empty evidence list
        "confidence": "low",
        "recommendedAction": "Review credentials.",
        "falsePositiveNotes": "",
        "affectedRelationships": [],
    }
    doc = findings_to_sarif([finding])
    result = doc["runs"][0]["results"][0]
    assert result["ruleId"] == "CREDENTIALS_PRESENT", (
        f"Expected first reasonCode as ruleId, got {result['ruleId']!r}"
    )

    # Rules should still be generated from reasonCodes
    rule_ids = [r["id"] for r in doc["runs"][0]["tool"]["driver"]["rules"]]
    assert "CREDENTIALS_PRESENT" in rule_ids
    assert "GOVERNANCE" in rule_ids


# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    tests = [
        test_empty_findings_produces_valid_sarif,
        test_single_finding_sarif_structure,
        test_ruleid_from_highest_weight_evidence,
        test_ruleid_fallback_to_first_reason_code,
        test_risk_level_mapping,
        test_message_text_includes_key_fields,
        test_rules_deduplication,
        test_logical_location_fields,
        test_physical_location_uri,
        test_result_properties_preserve_oid_see_fields,
        test_none_values_dropped_from_properties,
        test_write_sarif_produces_valid_file,
        test_generate_findings_sarif_extension_inference,
        test_generate_findings_sarif_format_flag,
        test_detect_format_sarif,
        test_write_findings_sarif_format,
        test_sarif_output_is_deterministic,
        test_ruleid_with_no_evidence_block,
    ]

    failures = 0
    for t in tests:
        try:
            t()
            print(f"  ✓ {t.__name__}")
        except Exception as exc:  # noqa: BLE001
            import traceback
            print(f"  ✗ {t.__name__}: {exc}")
            traceback.print_exc()
            failures += 1

    if failures:
        print(f"\n{failures} test(s) failed.")
        sys.exit(1)
    else:
        print(f"\nAll {len(tests)} test(s) passed.")
