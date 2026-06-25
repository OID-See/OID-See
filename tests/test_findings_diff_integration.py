#!/usr/bin/env python3
"""
Integration tests for findings_diff.py using actual finding_builder.build_findings output.

These tests verify that drift comparison correctly classifies findings when the
same ServicePrincipal changes reason codes between scans.  Because
finding_builder derives findingId from (servicePrincipalId, sorted reasonCodes),
two scans of the same app with different reason codes will produce different
findingIds.  The diff tool must use the stable subjectKey (servicePrincipalId)
to match findings — not findingId — so that the correct classification is made.

Scenarios covered:
  1. Same ServicePrincipal, reason codes A/B → A/C: classified as "changed"
     (score/level unchanged), not "resolved + new".
  2. Same ServicePrincipal, score worsens and reason codes change: classified
     as "regressed".
  3. Same ServicePrincipal, score improves and reason codes change: classified
     as "improved".
  4. findingId differs between scans but subjectKey is the same: delta entry
     includes both previousFindingId and currentFindingId.
  5. subjectKey is stable across scans (servicePrincipalId preferred over appId
     preferred over findingId).
  6. Output is deterministic (same input → same output).
"""

from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict, List

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from finding_builder import build_findings
from findings_diff import compare_findings


# ---------------------------------------------------------------------------
# Helpers — minimal synthetic OID-See graph export
# ---------------------------------------------------------------------------


def _make_export(nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Return a minimal synthetic OID-See graph export containing *nodes*.

    Produces the envelope structure expected by :func:`finding_builder.build_findings`.
    Edges are omitted — add them explicitly when the test requires relationship data.
    """
    return {
        "format": {"name": "oidsee-graph", "version": "1.1"},
        "generatedAt": "2025-01-01T00:00:00Z",
        "tenant": {"tenantId": "tenant-int-test", "displayName": "Integration Test Tenant"},
        "nodes": nodes,
        "edges": [],
    }


def _make_sp_node(
    sp_id: str,
    app_id: str,
    display_name: str,
    score: int,
    level: str,
    reasons: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build a minimal ServicePrincipal node for use in synthetic exports."""
    return {
        "id": sp_id,
        "type": "ServicePrincipal",
        "displayName": display_name,
        "properties": {
            "servicePrincipalId": sp_id,
            "appId": app_id,
            "appDisplayName": display_name,
            "publisherName": "Test Publisher",
            "appOwnerOrganizationId": "tenant-int-test",
            "appOwnership": "3rd Party",
            "verifiedPublisher": None,
        },
        "risk": {
            "score": score,
            "level": level,
            "reasons": reasons,
        },
    }


# Common reason code payloads
_REASON_A = {"code": "HAS_APP_ROLE", "weight": 20, "message": "App role granted"}
_REASON_B = {"code": "BROAD_REACHABILITY", "weight": 15, "message": "No assignments"}
_REASON_C = {"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Publisher unverified"}
_REASON_D = {"code": "CREDENTIAL_HYGIENE", "weight": 12, "message": "Old credentials"}


# ---------------------------------------------------------------------------
# 1. Reason codes change A/B → A/C, same score and level → "changed"
# ---------------------------------------------------------------------------


def test_changed_reason_codes_not_new_plus_resolved():
    """
    When a ServicePrincipal changes from reason codes [A, B] to [A, C] with
    the same risk score and level, the diff should classify it as "changed",
    not as one "resolved" finding and one "new" finding.
    """
    sp_id = "sp-int-001"
    app_id = "app-int-001"

    node_prev = _make_sp_node(
        sp_id, app_id, "Contoso App",
        score=50, level="medium",
        reasons=[_REASON_A, _REASON_B],
    )
    node_curr = _make_sp_node(
        sp_id, app_id, "Contoso App",
        score=50, level="medium",
        reasons=[_REASON_A, _REASON_C],
    )

    prev_findings = build_findings(_make_export([node_prev]))
    curr_findings = build_findings(_make_export([node_curr]))

    assert len(prev_findings) == 1
    assert len(curr_findings) == 1

    # findingIds differ because reason codes differ
    assert prev_findings[0]["findingId"] != curr_findings[0]["findingId"], (
        "Prerequisite: findingIds must differ when reason codes change"
    )
    # but subjectKeys are the same (both keyed by servicePrincipalId)
    assert prev_findings[0]["subjectKey"] == curr_findings[0]["subjectKey"] == sp_id

    delta = compare_findings(prev_findings, curr_findings)

    assert len(delta) == 1, (
        f"Expected 1 delta entry (changed), got {len(delta)}: "
        f"{[e['status'] for e in delta]}"
    )
    entry = delta[0]
    assert entry["status"] == "changed", (
        f"Expected 'changed', got '{entry['status']}'"
    )
    assert entry["subjectKey"] == sp_id
    assert "HAS_APP_ROLE" in entry["unchangedReasonCodes"]
    assert "BROAD_REACHABILITY" in entry["removedReasonCodes"]
    assert "UNVERIFIED_PUBLISHER" in entry["addedReasonCodes"]


# ---------------------------------------------------------------------------
# 2. Score worsens and reason codes change → "regressed"
# ---------------------------------------------------------------------------


def test_regressed_with_reason_code_change():
    """
    When a ServicePrincipal gains a higher risk score AND changes reason codes,
    the diff should classify it as "regressed" (not "new + resolved").
    """
    sp_id = "sp-int-002"
    app_id = "app-int-002"

    node_prev = _make_sp_node(
        sp_id, app_id, "Regressed App",
        score=35, level="low",
        reasons=[_REASON_C],
    )
    node_curr = _make_sp_node(
        sp_id, app_id, "Regressed App",
        score=75, level="high",
        reasons=[_REASON_A, _REASON_D],
    )

    prev_findings = build_findings(_make_export([node_prev]))
    curr_findings = build_findings(_make_export([node_curr]))

    assert len(prev_findings) == 1
    assert len(curr_findings) == 1

    # Confirm findingIds differ (different reason codes → different signature)
    assert prev_findings[0]["findingId"] != curr_findings[0]["findingId"]
    assert prev_findings[0]["subjectKey"] == curr_findings[0]["subjectKey"] == sp_id

    delta = compare_findings(prev_findings, curr_findings)

    assert len(delta) == 1, (
        f"Expected 1 delta entry (regressed), got {len(delta)}: "
        f"{[e['status'] for e in delta]}"
    )
    entry = delta[0]
    assert entry["status"] == "regressed", (
        f"Expected 'regressed', got '{entry['status']}'"
    )
    assert entry["subjectKey"] == sp_id
    assert entry["previousRiskScore"] == 35
    assert entry["currentRiskScore"] == 75
    assert entry["previousRiskLevel"] == "low"
    assert entry["currentRiskLevel"] == "high"


# ---------------------------------------------------------------------------
# 3. Score improves and reason codes change → "improved"
# ---------------------------------------------------------------------------


def test_improved_with_reason_code_change():
    """
    When a ServicePrincipal drops to a lower risk score AND changes reason codes,
    the diff should classify it as "improved" (not "new + resolved").
    """
    sp_id = "sp-int-003"
    app_id = "app-int-003"

    node_prev = _make_sp_node(
        sp_id, app_id, "Improved App",
        score=80, level="high",
        reasons=[_REASON_A, _REASON_B, _REASON_D],
    )
    node_curr = _make_sp_node(
        sp_id, app_id, "Improved App",
        score=20, level="low",
        reasons=[_REASON_C],
    )

    prev_findings = build_findings(_make_export([node_prev]))
    curr_findings = build_findings(_make_export([node_curr]))

    assert len(prev_findings) == 1
    assert len(curr_findings) == 1

    assert prev_findings[0]["findingId"] != curr_findings[0]["findingId"]
    assert prev_findings[0]["subjectKey"] == curr_findings[0]["subjectKey"] == sp_id

    delta = compare_findings(prev_findings, curr_findings)

    assert len(delta) == 1, (
        f"Expected 1 delta entry (improved), got {len(delta)}: "
        f"{[e['status'] for e in delta]}"
    )
    entry = delta[0]
    assert entry["status"] == "improved", (
        f"Expected 'improved', got '{entry['status']}'"
    )
    assert entry["subjectKey"] == sp_id
    assert entry["previousRiskScore"] == 80
    assert entry["currentRiskScore"] == 20
    assert entry["previousRiskLevel"] == "high"
    assert entry["currentRiskLevel"] == "low"


# ---------------------------------------------------------------------------
# 4. findingId differs between scans → previousFindingId and currentFindingId included
# ---------------------------------------------------------------------------


def test_finding_id_change_recorded_in_delta():
    """
    When the same subject's findingId changes between scans (because reason codes
    changed), the delta entry should record both previousFindingId and
    currentFindingId so analysts can cross-reference findings.
    """
    sp_id = "sp-int-004"
    app_id = "app-int-004"

    node_prev = _make_sp_node(
        sp_id, app_id, "Tracked App",
        score=50, level="medium",
        reasons=[_REASON_A, _REASON_B],
    )
    node_curr = _make_sp_node(
        sp_id, app_id, "Tracked App",
        score=50, level="medium",
        reasons=[_REASON_A, _REASON_C],
    )

    prev_findings = build_findings(_make_export([node_prev]))
    curr_findings = build_findings(_make_export([node_curr]))

    prev_fid = prev_findings[0]["findingId"]
    curr_fid = curr_findings[0]["findingId"]
    assert prev_fid != curr_fid, "Prerequisite: findingIds must differ"

    delta = compare_findings(prev_findings, curr_findings)

    assert len(delta) == 1
    entry = delta[0]
    assert entry["previousFindingId"] == prev_fid, (
        f"Expected previousFindingId={prev_fid!r}, got {entry.get('previousFindingId')!r}"
    )
    assert entry["currentFindingId"] == curr_fid, (
        f"Expected currentFindingId={curr_fid!r}, got {entry.get('currentFindingId')!r}"
    )
    # The top-level findingId should be the current one
    assert entry["findingId"] == curr_fid


# ---------------------------------------------------------------------------
# 5. subjectKey priority: servicePrincipalId > appId > findingId
# ---------------------------------------------------------------------------


def test_subject_key_prefers_service_principal_id():
    """
    The subjectKey in a finding produced by build_findings is derived from
    servicePrincipalId when available.
    """
    sp_id = "sp-int-005"
    app_id = "app-int-005"

    node = _make_sp_node(
        sp_id, app_id, "Priority App",
        score=40, level="low",
        reasons=[_REASON_B],
    )
    findings = build_findings(_make_export([node]))

    assert len(findings) == 1
    f = findings[0]
    assert f["subjectKey"] == sp_id, (
        f"Expected subjectKey={sp_id!r}, got {f['subjectKey']!r}"
    )


def test_subject_key_falls_back_to_app_id():
    """
    When servicePrincipalId is absent, subjectKey falls back to appId.
    """
    from findings_diff import _get_subject_key

    finding_no_sp = {
        "findingId": "fid-fallback",
        "appId": "app-fallback",
        "servicePrincipalId": None,
    }
    assert _get_subject_key(finding_no_sp) == "app-fallback"


def test_subject_key_falls_back_to_finding_id():
    """
    When both servicePrincipalId and appId are absent, subjectKey falls back
    to findingId.
    """
    from findings_diff import _get_subject_key

    finding_no_ids = {
        "findingId": "fid-last-resort",
        "appId": None,
        "servicePrincipalId": None,
    }
    assert _get_subject_key(finding_no_ids) == "fid-last-resort"


# ---------------------------------------------------------------------------
# 6. Output is deterministic
# ---------------------------------------------------------------------------


def test_integration_output_is_deterministic():
    """
    Running compare_findings twice with the same build_findings output must
    produce byte-identical JSON.
    """
    sp_id = "sp-int-006"
    app_id = "app-int-006"

    node_prev = _make_sp_node(
        sp_id, app_id, "Deterministic App",
        score=60, level="medium",
        reasons=[_REASON_A, _REASON_B],
    )
    node_curr = _make_sp_node(
        sp_id, app_id, "Deterministic App",
        score=60, level="medium",
        reasons=[_REASON_A, _REASON_C],
    )

    prev_findings = build_findings(_make_export([node_prev]))
    curr_findings = build_findings(_make_export([node_curr]))

    delta1 = compare_findings(prev_findings, curr_findings)
    delta2 = compare_findings(prev_findings, curr_findings)

    assert json.dumps(delta1, sort_keys=True) == json.dumps(delta2, sort_keys=True), (
        "compare_findings output must be deterministic"
    )


# ---------------------------------------------------------------------------
# 7. Multiple apps in one export — only changed SP is classified; unchanged is stable
# ---------------------------------------------------------------------------


def test_multiple_apps_independent_classification():
    """
    Two ServicePrincipals in the same export are classified independently.
    One changes reason codes (→ changed), the other is stable (→ unchanged).
    """
    sp_stable = "sp-int-007a"
    sp_changed = "sp-int-007b"

    stable_reasons = [_REASON_B]
    prev_export = _make_export([
        _make_sp_node(sp_stable, "app-007a", "Stable App",
                      score=30, level="low", reasons=stable_reasons),
        _make_sp_node(sp_changed, "app-007b", "Changing App",
                      score=50, level="medium", reasons=[_REASON_A, _REASON_B]),
    ])
    curr_export = _make_export([
        _make_sp_node(sp_stable, "app-007a", "Stable App",
                      score=30, level="low", reasons=stable_reasons),
        _make_sp_node(sp_changed, "app-007b", "Changing App",
                      score=50, level="medium", reasons=[_REASON_A, _REASON_C]),
    ])

    prev_findings = build_findings(prev_export)
    curr_findings = build_findings(curr_export)

    assert len(prev_findings) == 2
    assert len(curr_findings) == 2

    delta = compare_findings(prev_findings, curr_findings)

    assert len(delta) == 2

    by_key = {e["subjectKey"]: e for e in delta}
    assert by_key[sp_stable]["status"] == "unchanged"
    assert by_key[sp_changed]["status"] == "changed"
