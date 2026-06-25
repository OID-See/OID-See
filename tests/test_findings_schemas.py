#!/usr/bin/env python3
"""
Schema validation tests for oidsee-findings.schema.json and
oidsee-findings-delta.schema.json.

Scenarios covered:
  1.  Generated findings conform to oidsee-findings.schema.json
  2.  Generated delta conforms to oidsee-findings-delta.schema.json
  3.  Finding ID change (reason codes changed) — previousFindingId / currentFindingId
  4.  Nullable fields accepted (appId, servicePrincipalId, appOwnership, etc.)
  5.  Invalid riskLevel is rejected
  6.  riskScore above 100 is rejected
  7.  Missing subjectKey is rejected
  8.  Invalid status in delta is rejected
  9.  Empty findings array is valid
 10.  Empty delta array is valid
 11.  Resolved delta entry (currentRiskScore null) is valid
 12.  New delta entry (previousRiskScore null) is valid

All tests are deterministic and network-free.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List, Optional

import pytest
from jsonschema import ValidationError, validate

# Add repository root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from finding_builder import build_findings
from findings_diff import compare_findings


# ---------------------------------------------------------------------------
# Schema loading
# ---------------------------------------------------------------------------

_SCHEMAS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "schemas"
)


def _load_schema(filename: str) -> Dict[str, Any]:
    path = os.path.join(_SCHEMAS_DIR, filename)
    with open(path) as f:
        return json.load(f)


FINDINGS_SCHEMA = _load_schema("oidsee-findings.schema.json")
DELTA_SCHEMA = _load_schema("oidsee-findings-delta.schema.json")


# ---------------------------------------------------------------------------
# Fixture helpers
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
    props: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    base_props: Dict[str, Any] = {
        "servicePrincipalId": node_id.replace("sp:", ""),
        "appId": f"app-{node_id.replace('sp:', '')}",
        "appDisplayName": display_name,
        "publisherName": "Test Publisher",
        "appOwnerOrganizationId": "00000000-0000-0000-0000-000000000099",
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


def _make_sp_node_nullable(
    node_id: str,
    display_name: str,
    score: int,
    level: str,
    reasons: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """SP node with nullable fields explicitly set to None — for nullable field fixture."""
    return {
        "id": node_id,
        "type": "ServicePrincipal",
        "displayName": display_name,
        "properties": {
            "servicePrincipalId": None,
            "appId": None,
            "appDisplayName": display_name,
            "publisherName": None,
            "appOwnerOrganizationId": None,
            "appOwnership": None,
            "verifiedPublisher": None,
        },
        "risk": {
            "score": score,
            "level": level,
            "reasons": reasons,
        },
    }


def _make_finding(
    finding_id: str,
    subject_key: str,
    display_name: str = "Test App",
    app_id: Optional[str] = "app-001",
    sp_id: Optional[str] = "sp-001",
    risk_score: int = 50,
    risk_level: str = "medium",
    reason_codes: Optional[List[str]] = None,
    confidence: str = "medium",
    recommended_action: str = "Review consent.",
    false_positive_notes: str = "Confirm business justification.",
    evidence: Optional[List[Dict[str, Any]]] = None,
    affected_relationships: Optional[List[Dict[str, Any]]] = None,
    app_ownership: Optional[str] = "3rd Party",
) -> Dict[str, Any]:
    """Return a minimal finding dict matching the oidsee-findings schema."""
    return {
        "findingId": finding_id,
        "subjectKey": subject_key,
        "displayName": display_name,
        "appId": app_id,
        "servicePrincipalId": sp_id,
        "publisherName": "Test Publisher",
        "verifiedPublisherId": None,
        "appOwnerOrganizationId": "00000000-0000-0000-0000-000000000099",
        "appOwnership": app_ownership,
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "reasonCodes": reason_codes or ["UNVERIFIED_PUBLISHER"],
        "evidence": evidence or [
            {
                "reasonCode": "UNVERIFIED_PUBLISHER",
                "weight": 6,
                "title": "Publisher identity not verified",
                "summary": "The app's publisher is not verified.",
                "scannerMessage": "Publisher unverified",
                "impact": "Removes a key trust signal.",
                "checkNext": "Confirm publisher identity.",
                "falsePositiveNotes": "Internal apps do not require verification.",
            }
        ],
        "confidence": confidence,
        "recommendedAction": recommended_action,
        "falsePositiveNotes": false_positive_notes,
        "affectedRelationships": affected_relationships or [],
    }


# ---------------------------------------------------------------------------
# Scenario 1: Generated findings conform to the findings schema
# ---------------------------------------------------------------------------


def test_generated_findings_conform_to_schema():
    """findings produced by build_findings should validate against the findings schema."""
    node = _make_sp_node(
        "sp:001",
        "Contoso Integration",
        score=72,
        level="high",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 40, "message": "App roles: Mail.ReadWrite"},
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Publisher unverified"},
        ],
    )
    edge = {
        "id": "edge-001",
        "type": "HAS_APP_ROLE",
        "from": "sp:001",
        "to": "res:graph",
        "properties": {"permissionType": "application", "privileged": True},
    }
    export = _make_export([node], [edge])
    findings = build_findings(export)

    assert len(findings) == 1
    # Round-trip through JSON to simulate file serialisation
    data = json.loads(json.dumps(findings))
    validate(instance=data, schema=FINDINGS_SCHEMA)


# ---------------------------------------------------------------------------
# Scenario 2: Generated delta conforms to the delta schema
# ---------------------------------------------------------------------------


def test_generated_delta_conforms_to_schema():
    """delta produced by compare_findings should validate against the delta schema."""
    node_prev = _make_sp_node(
        "sp:002",
        "Drift App",
        score=40,
        level="medium",
        reasons=[{"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "unverified"}],
    )
    node_curr = _make_sp_node(
        "sp:002",
        "Drift App",
        score=72,
        level="high",
        reasons=[
            {"code": "HAS_APP_ROLE", "weight": 40, "message": "roles added"},
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "unverified"},
        ],
    )
    prev_findings = build_findings(_make_export([node_prev]))
    curr_findings = build_findings(_make_export([node_curr]))

    delta = compare_findings(prev_findings, curr_findings)
    assert len(delta) == 1
    data = json.loads(json.dumps(delta))
    validate(instance=data, schema=DELTA_SCHEMA)


# ---------------------------------------------------------------------------
# Scenario 3: Finding ID changes when reason codes change
# ---------------------------------------------------------------------------


def test_delta_finding_id_changes_when_reason_codes_change():
    """
    When reason codes change, previousFindingId and currentFindingId should
    both be populated (non-null) and differ from each other.
    """
    sp_id = "sp:003"
    node_prev = _make_sp_node(
        sp_id,
        "Evolving App",
        score=40,
        level="medium",
        reasons=[{"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "unverified"}],
    )
    node_curr = _make_sp_node(
        sp_id,
        "Evolving App",
        score=40,
        level="medium",
        reasons=[
            {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "unverified"},
            {"code": "CREDENTIALS_PRESENT", "weight": 8, "message": "credentials added"},
        ],
    )
    prev_findings = build_findings(_make_export([node_prev]))
    curr_findings = build_findings(_make_export([node_curr]))

    delta = compare_findings(prev_findings, curr_findings)
    assert len(delta) == 1
    entry = delta[0]

    # Status should be "changed" (no score/level change, but reason codes changed)
    assert entry["status"] == "changed"

    # Both IDs must be present and differ when reason codes changed
    assert entry["previousFindingId"] is not None
    assert entry["currentFindingId"] is not None
    assert entry["previousFindingId"] != entry["currentFindingId"]

    # "CREDENTIALS_PRESENT" must appear in addedReasonCodes
    assert "CREDENTIALS_PRESENT" in entry["addedReasonCodes"]

    data = json.loads(json.dumps(delta))
    validate(instance=data, schema=DELTA_SCHEMA)


# ---------------------------------------------------------------------------
# Scenario 4: Nullable fields accepted by findings schema
# ---------------------------------------------------------------------------


def test_findings_schema_accepts_nullable_fields():
    """Nullable fields (appId, servicePrincipalId, appOwnership etc.) should be valid when null."""
    node = _make_sp_node_nullable(
        "sp:004",
        "Anonymous App",
        score=30,
        level="low",
        reasons=[{"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "unverified"}],
    )
    export = _make_export([node])
    findings = build_findings(export)
    assert len(findings) == 1
    data = json.loads(json.dumps(findings))
    validate(instance=data, schema=FINDINGS_SCHEMA)


def test_delta_schema_accepts_nullable_fields_for_new_finding():
    """New delta entries should have null previousRiskScore, previousRiskLevel, previousConfidence."""
    node = _make_sp_node(
        "sp:005",
        "Brand New App",
        score=55,
        level="medium",
        reasons=[{"code": "BROAD_REACHABILITY", "weight": 15, "message": "broadly reachable"}],
    )
    curr_findings = build_findings(_make_export([node]))
    delta = compare_findings([], curr_findings)

    assert len(delta) == 1
    entry = delta[0]
    assert entry["status"] == "new"
    assert entry["previousRiskScore"] is None
    assert entry["previousRiskLevel"] is None
    assert entry["previousConfidence"] is None

    data = json.loads(json.dumps(delta))
    validate(instance=data, schema=DELTA_SCHEMA)


def test_delta_schema_accepts_nullable_fields_for_resolved_finding():
    """Resolved delta entries should have null currentRiskScore, currentRiskLevel, currentConfidence."""
    node = _make_sp_node(
        "sp:006",
        "Gone App",
        score=55,
        level="medium",
        reasons=[{"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "unverified"}],
    )
    prev_findings = build_findings(_make_export([node]))
    delta = compare_findings(prev_findings, [])

    assert len(delta) == 1
    entry = delta[0]
    assert entry["status"] == "resolved"
    assert entry["currentRiskScore"] is None
    assert entry["currentRiskLevel"] is None
    assert entry["currentConfidence"] is None

    data = json.loads(json.dumps(delta))
    validate(instance=data, schema=DELTA_SCHEMA)


# ---------------------------------------------------------------------------
# Scenario 5: Empty arrays are valid
# ---------------------------------------------------------------------------


def test_findings_schema_accepts_empty_array():
    validate(instance=[], schema=FINDINGS_SCHEMA)


def test_delta_schema_accepts_empty_array():
    validate(instance=[], schema=DELTA_SCHEMA)


# ---------------------------------------------------------------------------
# Negative tests
# ---------------------------------------------------------------------------


def test_findings_schema_rejects_invalid_risk_level():
    """riskLevel values not in the enum should be rejected."""
    finding = _make_finding(
        finding_id="oidf-aabbcc001122",
        subject_key="sp-bad-level",
        risk_level="extreme",  # invalid
    )
    with pytest.raises(ValidationError):
        validate(instance=[finding], schema=FINDINGS_SCHEMA)


def test_findings_schema_rejects_risk_score_above_100():
    """riskScore > 100 should be rejected."""
    finding = _make_finding(
        finding_id="oidf-aabbcc001123",
        subject_key="sp-bad-score",
        risk_score=101,
    )
    with pytest.raises(ValidationError):
        validate(instance=[finding], schema=FINDINGS_SCHEMA)


def test_findings_schema_rejects_missing_subject_key():
    """A finding missing subjectKey should be rejected."""
    finding = _make_finding(
        finding_id="oidf-aabbcc001124",
        subject_key="sp-missing",
    )
    del finding["subjectKey"]
    with pytest.raises(ValidationError):
        validate(instance=[finding], schema=FINDINGS_SCHEMA)


def test_delta_schema_rejects_invalid_status():
    """status values not in the enum should be rejected."""
    entry = {
        "subjectKey": "sp-bad-status",
        "findingId": "oidf-aabbcc001125",
        "previousFindingId": None,
        "currentFindingId": None,
        "displayName": "Test App",
        "appId": None,
        "servicePrincipalId": None,
        "status": "unknown_status",  # invalid
        "previousRiskScore": None,
        "currentRiskScore": 50,
        "previousRiskLevel": None,
        "currentRiskLevel": "medium",
        "previousReasonCodes": [],
        "currentReasonCodes": ["UNVERIFIED_PUBLISHER"],
        "addedReasonCodes": ["UNVERIFIED_PUBLISHER"],
        "removedReasonCodes": [],
        "unchangedReasonCodes": [],
        "previousConfidence": None,
        "currentConfidence": "medium",
        "summary": "New finding.",
        "analystAction": "Review new finding.",
    }
    with pytest.raises(ValidationError):
        validate(instance=[entry], schema=DELTA_SCHEMA)


def test_delta_schema_rejects_risk_score_above_100():
    """currentRiskScore > 100 should be rejected."""
    entry = {
        "subjectKey": "sp-bad-curr-score",
        "findingId": "oidf-aabbcc001126",
        "previousFindingId": None,
        "currentFindingId": None,
        "displayName": "Test App",
        "appId": None,
        "servicePrincipalId": None,
        "status": "new",
        "previousRiskScore": None,
        "currentRiskScore": 110,  # invalid
        "previousRiskLevel": None,
        "currentRiskLevel": "high",
        "previousReasonCodes": [],
        "currentReasonCodes": ["HAS_APP_ROLE"],
        "addedReasonCodes": ["HAS_APP_ROLE"],
        "removedReasonCodes": [],
        "unchangedReasonCodes": [],
        "previousConfidence": None,
        "currentConfidence": "high",
        "summary": "New finding.",
        "analystAction": "Review urgently.",
    }
    with pytest.raises(ValidationError):
        validate(instance=[entry], schema=DELTA_SCHEMA)


def test_delta_schema_rejects_missing_subject_key():
    """A delta entry missing subjectKey should be rejected."""
    entry = {
        "findingId": "oidf-aabbcc001127",
        "previousFindingId": None,
        "currentFindingId": None,
        "displayName": "Test App",
        "appId": None,
        "servicePrincipalId": None,
        "status": "new",
        "previousRiskScore": None,
        "currentRiskScore": 50,
        "previousRiskLevel": None,
        "currentRiskLevel": "medium",
        "previousReasonCodes": [],
        "currentReasonCodes": ["UNVERIFIED_PUBLISHER"],
        "addedReasonCodes": ["UNVERIFIED_PUBLISHER"],
        "removedReasonCodes": [],
        "unchangedReasonCodes": [],
        "previousConfidence": None,
        "currentConfidence": "medium",
        "summary": "New finding.",
        "analystAction": "Review new finding.",
    }
    # subjectKey deliberately omitted
    with pytest.raises(ValidationError):
        validate(instance=[entry], schema=DELTA_SCHEMA)
