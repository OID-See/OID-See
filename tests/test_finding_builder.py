#!/usr/bin/env python3
"""
Tests for finding_builder.py

Covers the required scenarios from the problem statement using small synthetic
OID-See export fixtures.  All tests use deterministic fixtures and verify
deterministic output — no external dependencies or network calls.

Scenarios covered:
  1. Broad reachability
  2. Assigned app with reachable users
  3. High-privilege Microsoft Graph delegated scope
  4. Application permission / app role finding
  5. Unverified publisher
  6. Identity laundering
  7. Mixed reply URL domains
  8. Credential hygiene
  9. Public client / implicit flow risk
 10. NO_OWNERS does not produce a security-risk finding by itself
 11. Info-level app below min threshold is excluded
 12. Deterministic finding IDs (same input → same ID)
 13. Finding ID stability across runs
 14. JSON output round-trip
 15. CSV row structure
 16. Markdown rendering
 17. Multiple findings sorted by risk score descending
 18. Affected relationships collected from edges
"""

from __future__ import annotations

import csv
import io
import json
import os
import sys
from typing import Any, Dict, List

# Add repository root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from finding_builder import (
    CSV_FIELDNAMES,
    build_findings,
    findings_to_csv_rows,
    findings_to_markdown,
)


# ---------------------------------------------------------------------------
# Minimal export skeleton
# ---------------------------------------------------------------------------

def _make_export(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    return {
        "format": {"name": "oidsee-graph", "version": "1.1"},
        "generatedAt": "2025-01-01T00:00:00Z",
        "tenant": {
            "tenantId": "00000000-0000-0000-0000-000000000001",
            "displayName": "Test Tenant",
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
    base_props = {
        "servicePrincipalId": node_id.replace("sp:", ""),
        "appId": f"app-{node_id.replace('sp:', '')}",
        "appDisplayName": display_name,
        "publisherName": "Test Publisher",
        "appOwnerOrganizationId": "tenant-abc",
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


# ---------------------------------------------------------------------------
# Scenario 1: Broad reachability
# ---------------------------------------------------------------------------

def test_broad_reachability():
    print("\n=== Scenario 1: Broad reachability ===")
    node = _make_sp_node(
        "sp:broad-001",
        "Broad App",
        score=55,
        level="medium",
        reasons=[
            {"code": "BROAD_REACHABILITY", "weight": 15, "message": "No assignments, broadly reachable"},
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Publisher unverified"},
        ],
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1, f"Expected 1 finding, got {len(findings)}"
    f = findings[0]
    assert "BROAD_REACHABILITY" in f["reasonCodes"], "BROAD_REACHABILITY should be in reasonCodes"
    assert f["riskLevel"] == "medium"
    assert f["riskScore"] == 55

    # Evidence block should be present
    codes_in_evidence = [e["reasonCode"] for e in f["evidence"]]
    assert "BROAD_REACHABILITY" in codes_in_evidence, "BROAD_REACHABILITY evidence block missing"

    # Confidence should be high (BROAD_REACHABILITY maps to high)
    assert f["confidence"] == "high", f"Expected confidence=high, got {f['confidence']}"

    print(f"  ✓ Finding ID: {f['findingId']}")
    print(f"  ✓ Risk: {f['riskLevel']} ({f['riskScore']})")
    print(f"  ✓ Confidence: {f['confidence']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 2: Assigned app with reachable users
# ---------------------------------------------------------------------------

def test_assigned_app():
    print("\n=== Scenario 2: Assigned app with reachable users ===")
    node = _make_sp_node(
        "sp:assigned-001",
        "Assigned App",
        score=25,
        level="low",
        reasons=[
            {"code": "ASSIGNED_TO", "weight": 5, "message": "App is assigned to ~3 users"},
        ],
        props={"requiresAssignment": True},
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "ASSIGNED_TO" in f["reasonCodes"]
    assert f["riskLevel"] == "low"

    # Check the evidence block content
    ev = next(e for e in f["evidence"] if e["reasonCode"] == "ASSIGNED_TO")
    assert "assignment" in ev["summary"].lower()
    assert ev["weight"] == 5

    print(f"  ✓ ASSIGNED_TO evidence present with weight {ev['weight']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 3: High-privilege Microsoft Graph delegated scope
# ---------------------------------------------------------------------------

def test_high_privilege_scope():
    print("\n=== Scenario 3: High-privilege delegated scope ===")
    node = _make_sp_node(
        "sp:highscope-001",
        "Graph Heavy App",
        score=70,
        level="high",
        reasons=[
            {
                "code": "HAS_HIGH_PRIVILEGE_PERMISSION",
                "weight": 25,
                "message": "Microsoft confirms privilege level 5/5 for delegated scope(s): Directory.ReadWrite.All",
                "msPrivilegeLevel": 5,
            },
            {
                "code": "HAS_PRIVILEGED_SCOPES",
                "weight": 30,
                "message": "ReadWrite.All scopes granted (2 scopes)",
                "scopeRiskClass": "readwrite_all",
            },
        ],
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "HAS_HIGH_PRIVILEGE_PERMISSION" in f["reasonCodes"]
    assert "HAS_PRIVILEGED_SCOPES" in f["reasonCodes"]
    assert f["riskLevel"] == "high"
    assert f["confidence"] == "high"

    # Evidence for HAS_HIGH_PRIVILEGE_PERMISSION should mention Microsoft-confirmed
    ev_hhp = next(e for e in f["evidence"] if e["reasonCode"] == "HAS_HIGH_PRIVILEGE_PERMISSION")
    assert "microsoft" in ev_hhp["title"].lower()
    assert ev_hhp["weight"] == 25
    # Scanner message preserved
    assert "Directory.ReadWrite.All" in ev_hhp["scannerMessage"]

    print(f"  ✓ HAS_HIGH_PRIVILEGE_PERMISSION evidence: {ev_hhp['title']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 4: Application permission / app role finding
# ---------------------------------------------------------------------------

def test_app_role_finding():
    print("\n=== Scenario 4: Application permission / app role finding ===")
    node = _make_sp_node(
        "sp:approle-001",
        "Service Daemon App",
        score=85,
        level="critical",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 60, "message": "Application permissions granted"},
            {"code": "BROAD_REACHABILITY", "weight": 15, "message": "No assignment required"},
        ],
    )
    export = _make_export(
        [node],
        edges=[
            {"id": "e1", "from": "sp:approle-001", "to": "resource:graph", "type": "HAS_APP_ROLE"},
        ],
    )
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "HAS_APP_ROLE" in f["reasonCodes"]
    assert f["riskLevel"] == "critical"
    assert f["riskScore"] == 85

    # App role evidence should mention "app role" in summary
    ev_ar = next(e for e in f["evidence"] if e["reasonCode"] == "HAS_APP_ROLE")
    assert "app role" in ev_ar["summary"].lower()

    # Affected relationships should list the edge
    assert len(f["affectedRelationships"]) == 1
    rel = f["affectedRelationships"][0]
    assert rel["edgeType"] == "HAS_APP_ROLE"
    assert rel["toNodeId"] == "resource:graph"

    print(f"  ✓ Affected relationships: {f['affectedRelationships']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 5: Unverified publisher
# ---------------------------------------------------------------------------

def test_unverified_publisher():
    print("\n=== Scenario 5: Unverified publisher ===")
    node = _make_sp_node(
        "sp:unverified-001",
        "Mystery App",
        score=41,
        level="medium",
        reasons=[
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Publisher not verified"},
            {"code": "GOVERNANCE", "weight": 5, "message": "No assignment required"},
        ],
        props={"appOwnership": "3rd Party", "verifiedPublisher": None},
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "UNVERIFIED_PUBLISHER" in f["reasonCodes"]

    ev_up = next(e for e in f["evidence"] if e["reasonCode"] == "UNVERIFIED_PUBLISHER")
    assert "verified" in ev_up["title"].lower()
    # False positive note should mention Internal apps
    assert "internal" in ev_up["falsePositiveNotes"].lower()

    # verifiedPublisherId should be None in the finding
    assert f["verifiedPublisherId"] is None

    print(f"  ✓ UNVERIFIED_PUBLISHER evidence title: {ev_up['title']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 6: Identity laundering
# ---------------------------------------------------------------------------

def test_identity_laundering():
    print("\n=== Scenario 6: Identity laundering ===")
    node = _make_sp_node(
        "sp:laundering-001",
        "Fake Microsoft App",
        score=56,
        level="medium",
        reasons=[
            {"code": "IDENTITY_LAUNDERING", "weight": 15, "message": "Microsoft org ID but unverified"},
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"},
        ],
        props={
            "appOwnerOrganizationId": "f8cdef31-a31e-4b4a-93e4-5f571e91255a",
            "publisherName": "Microsoft",
            "verifiedPublisher": None,
        },
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "IDENTITY_LAUNDERING" in f["reasonCodes"]
    assert f["confidence"] == "high", f"Expected high confidence, got {f['confidence']}"

    ev_il = next(e for e in f["evidence"] if e["reasonCode"] == "IDENTITY_LAUNDERING")
    assert "microsoft" in ev_il["title"].lower()
    # The check-next should reference Microsoft's app catalog
    assert "catalog" in ev_il["checkNext"].lower() or "first-party" in ev_il["checkNext"].lower()

    print(f"  ✓ IDENTITY_LAUNDERING evidence: {ev_il['title']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 7: Mixed reply URL domains
# ---------------------------------------------------------------------------

def test_mixed_replyurl_domains():
    print("\n=== Scenario 7: Mixed reply URL domains ===")
    node = _make_sp_node(
        "sp:mixedurl-001",
        "Multi Domain App",
        score=41,
        level="medium",
        reasons=[
            {
                "code": "MIXED_REPLYURL_DOMAINS",
                "weight": 15,
                "message": "Identity laundering signal: unaligned domains detected",
            },
        ],
        props={
            "replyUrls": [
                "https://app.contoso.com/callback",
                "https://evil.example.com/steal",
            ],
        },
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "MIXED_REPLYURL_DOMAINS" in f["reasonCodes"]

    ev = next(e for e in f["evidence"] if e["reasonCode"] == "MIXED_REPLYURL_DOMAINS")
    assert "domain" in ev["title"].lower()
    assert "redirect" in ev["impact"].lower() or "oauth" in ev["impact"].lower()

    print(f"  ✓ MIXED_REPLYURL_DOMAINS evidence: {ev['title']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 8: Credential hygiene
# ---------------------------------------------------------------------------

def test_credential_hygiene():
    print("\n=== Scenario 8: Credential hygiene ===")
    node = _make_sp_node(
        "sp:creds-001",
        "Stale Creds App",
        score=46,
        level="medium",
        reasons=[
            {"code": "CREDENTIAL_HYGIENE", "weight": 10, "message": "Long-lived secrets detected (>180 days)"},
        ],
        props={
            "credentialInsights": {
                "active_password_credentials": 2,
                "long_lived_secrets": [{"id": "secret-old"}],
                "expired_but_present": [],
            },
        },
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "CREDENTIAL_HYGIENE" in f["reasonCodes"]

    ev = next(e for e in f["evidence"] if e["reasonCode"] == "CREDENTIAL_HYGIENE")
    assert "credential" in ev["title"].lower()
    assert "long-lived" in ev["summary"].lower() or "secrets" in ev["summary"].lower()
    # Check-next should mention Azure portal
    assert "azure" in ev["checkNext"].lower() or "portal" in ev["checkNext"].lower()
    # Scanner message preserved
    assert "180" in ev["scannerMessage"]

    print(f"  ✓ CREDENTIAL_HYGIENE evidence: {ev['title']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 9: Public client / implicit flow risk
# ---------------------------------------------------------------------------

def test_public_client_risk():
    print("\n=== Scenario 9: Public client / implicit flow risk ===")
    node = _make_sp_node(
        "sp:pubclient-001",
        "Native Mobile App",
        score=37,
        level="medium",
        reasons=[
            {"code": "PUBLIC_CLIENT_FLOW_RISK", "weight": 15, "message": "Implicit flow enabled"},
        ],
        props={
            "publicClientIndicators": {
                "isPublicClient": True,
                "implicitGrantEnabled": True,
            },
        },
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    assert "PUBLIC_CLIENT_FLOW_RISK" in f["reasonCodes"]

    ev = next(e for e in f["evidence"] if e["reasonCode"] == "PUBLIC_CLIENT_FLOW_RISK")
    assert "implicit" in ev["title"].lower() or "public client" in ev["title"].lower()
    assert "pkce" in f["recommendedAction"].lower()

    print(f"  ✓ PUBLIC_CLIENT_FLOW_RISK evidence: {ev['title']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 10: NO_OWNERS does not produce a security-risk finding by itself
# ---------------------------------------------------------------------------

def test_no_owners_excluded():
    print("\n=== Scenario 10: NO_OWNERS should not produce a security finding by itself ===")

    # App with ONLY NO_OWNERS reason — should produce no finding
    node_no_owners_only = _make_sp_node(
        "sp:noowners-001",
        "Orphan App",
        score=5,
        level="info",
        reasons=[
            {"code": "NO_OWNERS", "weight": 0, "message": "No owners registered"},
        ],
    )

    # App with NO_OWNERS AND a real risk reason — NO_OWNERS should be excluded from finding
    # but the real risk reason should still appear
    node_mixed = _make_sp_node(
        "sp:noowners-002",
        "Orphan App with Risk",
        score=25,
        level="low",
        reasons=[
            {"code": "NO_OWNERS", "weight": 0, "message": "No owners registered"},
            {"code": "BROAD_REACHABILITY", "weight": 15, "message": "Broadly reachable"},
        ],
    )

    export = _make_export([node_no_owners_only, node_mixed])
    findings = build_findings(export)

    # Only the mixed node should produce a finding (the info-only node is also filtered by min_level=low)
    sp_ids = [f["servicePrincipalId"] for f in findings]
    assert "noowners-001" not in sp_ids, "NO_OWNERS-only app should not appear in findings"
    assert "noowners-002" in sp_ids, "App with real risk AND NO_OWNERS should appear"

    # In the mixed finding, NO_OWNERS should not be in reasonCodes
    mixed_finding = next(f for f in findings if f["servicePrincipalId"] == "noowners-002")
    assert "NO_OWNERS" not in mixed_finding["reasonCodes"], "NO_OWNERS must be excluded from reasonCodes"
    assert "BROAD_REACHABILITY" in mixed_finding["reasonCodes"]

    # Build findings with min_level=info to verify NO_OWNERS-only still excluded
    findings_info = build_findings(export, min_risk_level="info")
    sp_ids_info = [f["servicePrincipalId"] for f in findings_info]
    assert "noowners-001" not in sp_ids_info, (
        "NO_OWNERS-only app should not appear even at min_level=info"
    )

    print("  ✓ NO_OWNERS-only app produces no finding")
    print("  ✓ Mixed app finding excludes NO_OWNERS from reasonCodes")
    return True


# ---------------------------------------------------------------------------
# Scenario 11: Info-level app below min threshold is excluded
# ---------------------------------------------------------------------------

def test_info_below_threshold():
    print("\n=== Scenario 11: Info-level apps excluded by default ===")
    node = _make_sp_node(
        "sp:info-001",
        "Info App",
        score=10,
        level="info",
        reasons=[
            {"code": "GOVERNANCE", "weight": 5, "message": "Assignment not required"},
        ],
    )
    export = _make_export([node])

    # Default min_level=low should exclude info
    findings = build_findings(export)
    assert len(findings) == 0, f"Info app should be excluded by default, got {len(findings)}"

    # Explicit min_level=info should include it
    findings_info = build_findings(export, min_risk_level="info")
    assert len(findings_info) == 1

    print("  ✓ Info app excluded with min_level=low")
    print("  ✓ Info app included with min_level=info")
    return True


# ---------------------------------------------------------------------------
# Scenario 12: Deterministic finding IDs
# ---------------------------------------------------------------------------

def test_deterministic_finding_id():
    print("\n=== Scenario 12: Deterministic finding IDs ===")
    node = _make_sp_node(
        "sp:det-001",
        "Deterministic App",
        score=50,
        level="medium",
        reasons=[
            {"code": "BROAD_REACHABILITY", "weight": 15, "message": "Broadly reachable"},
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"},
        ],
    )
    export = _make_export([node])

    findings_a = build_findings(export)
    findings_b = build_findings(export)

    assert len(findings_a) == 1
    assert len(findings_b) == 1
    assert findings_a[0]["findingId"] == findings_b[0]["findingId"], (
        "Finding ID must be deterministic across runs"
    )
    assert findings_a[0]["findingId"].startswith("oidf-"), "Finding ID must use oidf- prefix"

    print(f"  ✓ Stable finding ID: {findings_a[0]['findingId']}")
    return True


# ---------------------------------------------------------------------------
# Scenario 13: JSON round-trip
# ---------------------------------------------------------------------------

def test_json_roundtrip():
    print("\n=== Scenario 13: JSON round-trip ===")
    node = _make_sp_node(
        "sp:json-001",
        "JSON App",
        score=65,
        level="high",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 50, "message": "App role granted"},
        ],
    )
    export = _make_export([node])
    findings = build_findings(export)

    serialised = json.dumps(findings, indent=2, ensure_ascii=False)
    restored = json.loads(serialised)

    assert len(restored) == 1
    assert restored[0]["findingId"] == findings[0]["findingId"]
    assert restored[0]["riskScore"] == 65
    assert restored[0]["reasonCodes"] == ["HAS_APP_ROLE"]

    print(f"  ✓ JSON round-trip: {len(serialised)} bytes, restored correctly")
    return True


# ---------------------------------------------------------------------------
# Scenario 14: CSV row structure
# ---------------------------------------------------------------------------

def test_csv_rows():
    print("\n=== Scenario 14: CSV row structure ===")
    node = _make_sp_node(
        "sp:csv-001",
        "CSV App",
        score=45,
        level="medium",
        reasons=[
            {"code": "CREDENTIAL_HYGIENE", "weight": 10, "message": "Long-lived secrets"},
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"},
        ],
    )
    export = _make_export([node])
    findings = build_findings(export)
    rows = findings_to_csv_rows(findings)

    assert len(rows) == 1
    row = rows[0]

    # All expected CSV fieldnames must be present
    for field in CSV_FIELDNAMES:
        assert field in row, f"Missing CSV field: {field}"

    assert row["riskLevel"] == "medium"
    assert row["riskScore"] == "45"
    assert "CREDENTIAL_HYGIENE" in row["reasonCodes"]
    assert "UNVERIFIED_PUBLISHER" in row["reasonCodes"]

    # evidenceSummary should contain titles from both evidence blocks
    assert "hygiene" in row["evidenceSummary"].lower() or "credential" in row["evidenceSummary"].lower()

    # Verify the row can be round-tripped through csv writer/reader
    output = io.StringIO()
    from finding_builder import CSV_FIELDNAMES as FIELDS
    writer = csv.DictWriter(output, fieldnames=FIELDS)
    writer.writeheader()
    writer.writerow(row)
    output.seek(0)
    reader = csv.DictReader(output)
    restored = list(reader)
    assert len(restored) == 1
    assert restored[0]["findingId"] == row["findingId"]

    print(f"  ✓ CSV row has all {len(CSV_FIELDNAMES)} expected fields")
    print(f"  ✓ CSV round-trip successful")
    return True


# ---------------------------------------------------------------------------
# Scenario 15: Markdown rendering
# ---------------------------------------------------------------------------

def test_markdown_rendering():
    print("\n=== Scenario 15: Markdown rendering ===")
    node = _make_sp_node(
        "sp:md-001",
        "Markdown App",
        score=80,
        level="high",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 60, "message": "App roles granted"},
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"},
        ],
    )
    export = _make_export([node])
    findings = build_findings(export)
    md = findings_to_markdown(findings, tenant_display_name="Test Tenant", generated_at="2025-01-01T00:00:00Z")

    assert "# OID-See Findings Report" in md
    assert "Test Tenant" in md
    assert "2025-01-01" in md
    assert "Markdown App" in md
    assert "HIGH" in md
    assert "HAS_APP_ROLE" in md
    assert "Application permission" in md
    assert "Recommended Action" in md

    print(f"  ✓ Markdown report: {len(md)} chars, correct structure")
    return True


# ---------------------------------------------------------------------------
# Scenario 16: Multiple findings sorted by risk score descending
# ---------------------------------------------------------------------------

def test_sorting():
    print("\n=== Scenario 16: Multiple findings sorted by risk score descending ===")
    nodes = [
        _make_sp_node("sp:sort-low", "Low App", 25, "low",
                      [{"code": "ASSIGNED_TO", "weight": 5, "message": "Some users"}]),
        _make_sp_node("sp:sort-critical", "Critical App", 90, "critical",
                      [{"code": "HAS_APP_ROLE", "weight": 60, "message": "App roles"},
                       {"code": "BROAD_REACHABILITY", "weight": 15, "message": "Broadly reachable"}]),
        _make_sp_node("sp:sort-medium", "Medium App", 45, "medium",
                      [{"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"}]),
    ]
    export = _make_export(nodes)
    findings = build_findings(export)

    assert len(findings) == 3
    scores = [f["riskScore"] for f in findings]
    assert scores == sorted(scores, reverse=True), f"Findings not sorted by score: {scores}"
    assert findings[0]["riskScore"] == 90
    assert findings[-1]["riskScore"] == 25

    print(f"  ✓ Sorted scores: {scores}")
    return True


# ---------------------------------------------------------------------------
# Scenario 17: Affected relationships collected from edges
# ---------------------------------------------------------------------------

def test_affected_relationships():
    print("\n=== Scenario 17: Affected relationships from edges ===")
    node = _make_sp_node(
        "sp:edges-001",
        "Edges App",
        score=70,
        level="high",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 50, "message": "App roles"},
            {"code": "PRIVILEGE", "weight": 25, "message": "Directory role assigned"},
        ],
    )
    export = _make_export(
        [node],
        edges=[
            {"id": "e1", "from": "sp:edges-001", "to": "resource:graph", "type": "HAS_APP_ROLE"},
            {"id": "e2", "from": "sp:edges-001", "to": "role:GlobalAdmin", "type": "ASSIGNED_DIR_ROLE"},
            {"id": "e3", "from": "sp:other-sp", "to": "sp:edges-001", "type": "OWNS"},  # inbound — excluded
        ],
    )
    findings = build_findings(export)

    assert len(findings) == 1
    f = findings[0]
    # Only outbound edges from this SP
    assert len(f["affectedRelationships"]) == 2

    types = {r["edgeType"] for r in f["affectedRelationships"]}
    assert "HAS_APP_ROLE" in types
    assert "ASSIGNED_DIR_ROLE" in types
    # Inbound edge should not appear
    assert "OWNS" not in types

    print(f"  ✓ Collected {len(f['affectedRelationships'])} outbound relationships")
    return True


# ---------------------------------------------------------------------------
# Scenario 18: Empty export returns empty findings
# ---------------------------------------------------------------------------

def test_empty_export():
    print("\n=== Scenario 18: Empty export returns empty findings ===")
    export = _make_export([])
    findings = build_findings(export)
    assert findings == [], f"Expected empty findings, got {len(findings)}"
    print("  ✓ Empty export returns []")
    return True


# ---------------------------------------------------------------------------
# Scenario 19: 1st Party apps in findings (appOwnership preserved)
# ---------------------------------------------------------------------------

def test_first_party_ownership_preserved():
    print("\n=== Scenario 19: App ownership field preserved in finding ===")
    node = _make_sp_node(
        "sp:1p-001",
        "Some Internal App",
        score=35,
        level="medium",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 35, "message": "App roles"},
        ],
        props={"appOwnership": "1st Party"},
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    assert findings[0]["appOwnership"] == "1st Party"

    print("  ✓ appOwnership=1st Party preserved in finding")
    return True


# ---------------------------------------------------------------------------
# Scenario 20: CREATED_BEFORE_CONSENT_HARDENING maps to low confidence
# ---------------------------------------------------------------------------

def test_consent_hardening_low_confidence():
    print("\n=== Scenario 20: CREATED_BEFORE_CONSENT_HARDENING → low confidence ===")
    node = _make_sp_node(
        "sp:legacy-001",
        "Legacy App",
        score=20,
        level="low",
        reasons=[
            {"code": "CREATED_BEFORE_CONSENT_HARDENING", "weight": 10, "message": "Created pre-July 2025"},
        ],
    )
    export = _make_export([node])
    findings = build_findings(export)

    assert len(findings) == 1
    assert findings[0]["confidence"] == "low"
    ev = next(e for e in findings[0]["evidence"] if e["reasonCode"] == "CREATED_BEFORE_CONSENT_HARDENING")
    assert "2025" in ev["summary"]

    print(f"  ✓ Confidence=low for CREATED_BEFORE_CONSENT_HARDENING")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    print("=" * 60)
    print("OID-See Finding Builder Test Suite")
    print("=" * 60)

    tests = [
        test_broad_reachability,
        test_assigned_app,
        test_high_privilege_scope,
        test_app_role_finding,
        test_unverified_publisher,
        test_identity_laundering,
        test_mixed_replyurl_domains,
        test_credential_hygiene,
        test_public_client_risk,
        test_no_owners_excluded,
        test_info_below_threshold,
        test_deterministic_finding_id,
        test_json_roundtrip,
        test_csv_rows,
        test_markdown_rendering,
        test_sorting,
        test_affected_relationships,
        test_empty_export,
        test_first_party_ownership_preserved,
        test_consent_hardening_low_confidence,
    ]

    passed = 0
    failed = 0
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as exc:
            print(f"  ✗ EXCEPTION in {test.__name__}: {exc}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("\n" + "=" * 60)
    if failed == 0:
        print(f"✓ ALL {passed} TESTS PASSED")
    else:
        print(f"✗ {failed} FAILED, {passed} PASSED")
    print("=" * 60)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
