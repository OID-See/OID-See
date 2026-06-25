#!/usr/bin/env python3
"""
Tests for findings_diff.py

Covers the required scenarios using small synthetic findings fixtures.
All tests are deterministic — no external dependencies or network calls.

Scenarios covered:
  1.  New finding (present in current, absent in previous)
  2.  Resolved finding (present in previous, absent in current)
  3.  Unchanged finding (present in both, no material change)
  4.  Changed reason codes (different codes, same score/level)
  5.  Risk score regression (score worsened)
  6.  Risk level regression (level worsened)
  7.  Risk score improvement (score improved)
  8.  Risk level improvement (level improved)
  9.  Added and removed reason code calculation
  10. JSON output stability (same input → same output, round-trip safe)
  11. Markdown output includes all expected sections
  12. CSV output structure and field names
  13. Confidence change marks finding as "changed"
  14. Evidence title change marks finding as "changed"
  15. RecommendedAction change marks finding as "changed"
  16. Both score and level regress → "regressed"
  17. Score regresses but level unchanged → "regressed"
  18. Level regresses but score unchanged → "regressed"
  19. Analyst action for new critical finding
  20. Analyst action for new low finding
  21. Analyst action for resolved finding
  22. Empty inputs produce empty delta
  23. Ordering: new before regressed before improved before resolved
         before changed before unchanged
"""

from __future__ import annotations

import csv
import io
import json
import os
import sys
from typing import Any, Dict, List, Optional

# Add repository root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from findings_diff import (
    DELTA_CSV_FIELDNAMES,
    compare_findings,
    delta_to_csv,
    delta_to_csv_rows,
    delta_to_markdown,
)


# ---------------------------------------------------------------------------
# Fixture helpers
# ---------------------------------------------------------------------------


def _finding(
    finding_id: str,
    display_name: str = "Test App",
    app_id: str = "app-001",
    sp_id: str = "sp-001",
    risk_score: int = 50,
    risk_level: str = "medium",
    reason_codes: Optional[List[str]] = None,
    confidence: str = "medium",
    recommended_action: str = "Review consent.",
    evidence_titles: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Return a minimal finding dict for testing."""
    codes = reason_codes or ["HAS_APP_ROLE"]
    titles = evidence_titles or [f"Evidence for {c}" for c in codes]
    return {
        "findingId": finding_id,
        "displayName": display_name,
        "appId": app_id,
        "servicePrincipalId": sp_id,
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "reasonCodes": codes,
        "confidence": confidence,
        "recommendedAction": recommended_action,
        "evidence": [{"title": t} for t in titles],
    }


# ---------------------------------------------------------------------------
# 1. New finding
# ---------------------------------------------------------------------------


def test_new_finding():
    f = _finding("fid-001", risk_level="high", risk_score=80)
    delta = compare_findings(previous=[], current=[f])
    assert len(delta) == 1
    entry = delta[0]
    assert entry["status"] == "new"
    assert entry["findingId"] == "fid-001"
    assert entry["previousRiskScore"] is None
    assert entry["currentRiskScore"] == 80
    assert entry["previousRiskLevel"] is None
    assert entry["currentRiskLevel"] == "high"
    assert entry["addedReasonCodes"] == ["HAS_APP_ROLE"]
    assert entry["removedReasonCodes"] == []
    assert entry["unchangedReasonCodes"] == []


# ---------------------------------------------------------------------------
# 2. Resolved finding
# ---------------------------------------------------------------------------


def test_resolved_finding():
    f = _finding("fid-002", risk_level="medium", risk_score=40)
    delta = compare_findings(previous=[f], current=[])
    assert len(delta) == 1
    entry = delta[0]
    assert entry["status"] == "resolved"
    assert entry["findingId"] == "fid-002"
    assert entry["previousRiskScore"] == 40
    assert entry["currentRiskScore"] is None
    assert entry["previousRiskLevel"] == "medium"
    assert entry["currentRiskLevel"] is None
    assert entry["removedReasonCodes"] == ["HAS_APP_ROLE"]
    assert entry["addedReasonCodes"] == []


# ---------------------------------------------------------------------------
# 3. Unchanged finding
# ---------------------------------------------------------------------------


def test_unchanged_finding():
    f = _finding("fid-003", risk_score=30, risk_level="low")
    delta = compare_findings(previous=[f], current=[f])
    assert len(delta) == 1
    entry = delta[0]
    assert entry["status"] == "unchanged"
    assert entry["addedReasonCodes"] == []
    assert entry["removedReasonCodes"] == []
    assert entry["unchangedReasonCodes"] == ["HAS_APP_ROLE"]


# ---------------------------------------------------------------------------
# 4. Changed reason codes (same score/level)
# ---------------------------------------------------------------------------


def test_changed_reason_codes():
    prev = _finding(
        "fid-004",
        risk_score=50,
        risk_level="medium",
        reason_codes=["HAS_APP_ROLE", "BROAD_REACHABILITY"],
        evidence_titles=["Evidence A", "Evidence B"],
    )
    curr = _finding(
        "fid-004",
        risk_score=50,
        risk_level="medium",
        reason_codes=["HAS_APP_ROLE", "UNVERIFIED_PUBLISHER"],
        evidence_titles=["Evidence A", "Evidence C"],
    )
    delta = compare_findings(previous=[prev], current=[curr])
    assert len(delta) == 1
    entry = delta[0]
    assert entry["status"] == "changed"
    assert "BROAD_REACHABILITY" in entry["removedReasonCodes"]
    assert "UNVERIFIED_PUBLISHER" in entry["addedReasonCodes"]
    assert "HAS_APP_ROLE" in entry["unchangedReasonCodes"]


# ---------------------------------------------------------------------------
# 5. Risk score regression
# ---------------------------------------------------------------------------


def test_risk_score_regression():
    prev = _finding("fid-005", risk_score=40, risk_level="medium")
    curr = _finding("fid-005", risk_score=70, risk_level="medium")
    delta = compare_findings(previous=[prev], current=[curr])
    entry = delta[0]
    assert entry["status"] == "regressed"
    assert entry["previousRiskScore"] == 40
    assert entry["currentRiskScore"] == 70


# ---------------------------------------------------------------------------
# 6. Risk level regression
# ---------------------------------------------------------------------------


def test_risk_level_regression():
    # Score unchanged but level worsened
    prev = _finding("fid-006", risk_score=50, risk_level="medium")
    curr = _finding("fid-006", risk_score=50, risk_level="high")
    delta = compare_findings(previous=[prev], current=[curr])
    entry = delta[0]
    assert entry["status"] == "regressed"
    assert entry["previousRiskLevel"] == "medium"
    assert entry["currentRiskLevel"] == "high"


# ---------------------------------------------------------------------------
# 7. Risk score improvement
# ---------------------------------------------------------------------------


def test_risk_score_improvement():
    prev = _finding("fid-007", risk_score=70, risk_level="high")
    curr = _finding("fid-007", risk_score=40, risk_level="high")
    delta = compare_findings(previous=[prev], current=[curr])
    entry = delta[0]
    assert entry["status"] == "improved"
    assert entry["previousRiskScore"] == 70
    assert entry["currentRiskScore"] == 40


# ---------------------------------------------------------------------------
# 8. Risk level improvement
# ---------------------------------------------------------------------------


def test_risk_level_improvement():
    # Score unchanged but level improved
    prev = _finding("fid-008", risk_score=50, risk_level="high")
    curr = _finding("fid-008", risk_score=50, risk_level="medium")
    delta = compare_findings(previous=[prev], current=[curr])
    entry = delta[0]
    assert entry["status"] == "improved"
    assert entry["previousRiskLevel"] == "high"
    assert entry["currentRiskLevel"] == "medium"


# ---------------------------------------------------------------------------
# 9. Added and removed reason code calculation
# ---------------------------------------------------------------------------


def test_reason_code_calculation():
    prev = _finding(
        "fid-009",
        reason_codes=["A", "B", "C"],
        evidence_titles=["T_A", "T_B", "T_C"],
        risk_score=50,
        risk_level="medium",
    )
    curr = _finding(
        "fid-009",
        reason_codes=["B", "C", "D"],
        evidence_titles=["T_B", "T_C", "T_D"],
        risk_score=50,
        risk_level="medium",
    )
    delta = compare_findings(previous=[prev], current=[curr])
    entry = delta[0]
    assert set(entry["addedReasonCodes"]) == {"D"}
    assert set(entry["removedReasonCodes"]) == {"A"}
    assert set(entry["unchangedReasonCodes"]) == {"B", "C"}
    # Lists must be sorted
    assert entry["addedReasonCodes"] == sorted(entry["addedReasonCodes"])
    assert entry["removedReasonCodes"] == sorted(entry["removedReasonCodes"])
    assert entry["unchangedReasonCodes"] == sorted(entry["unchangedReasonCodes"])


# ---------------------------------------------------------------------------
# 10. JSON output stability
# ---------------------------------------------------------------------------


def test_json_output_stability():
    findings = [
        _finding("fid-010a", risk_score=80, risk_level="high"),
        _finding("fid-010b", risk_score=20, risk_level="low"),
    ]
    delta1 = compare_findings(findings, findings)
    delta2 = compare_findings(findings, findings)

    serialised1 = json.dumps(delta1, sort_keys=True)
    serialised2 = json.dumps(delta2, sort_keys=True)
    assert serialised1 == serialised2, "Output must be deterministic"

    # Round-trip: serialise then parse
    parsed = json.loads(serialised1)
    assert isinstance(parsed, list)
    assert len(parsed) == 2
    for entry in parsed:
        assert "findingId" in entry
        assert "status" in entry


# ---------------------------------------------------------------------------
# 11. Markdown output sections
# ---------------------------------------------------------------------------


def test_markdown_includes_all_sections():
    new_f = _finding("fid-new", risk_level="critical", risk_score=95)
    resolved_f = _finding("fid-res", risk_level="high", risk_score=80)
    unchanged_f = _finding("fid-unc", risk_level="low", risk_score=20)
    regressed_prev = _finding("fid-reg", risk_score=40, risk_level="medium")
    regressed_curr = _finding("fid-reg", risk_score=70, risk_level="high")
    improved_prev = _finding("fid-imp", risk_score=70, risk_level="high")
    improved_curr = _finding("fid-imp", risk_score=30, risk_level="low")
    changed_prev = _finding(
        "fid-chg",
        risk_score=50,
        risk_level="medium",
        reason_codes=["HAS_APP_ROLE"],
        evidence_titles=["T1"],
    )
    changed_curr = _finding(
        "fid-chg",
        risk_score=50,
        risk_level="medium",
        reason_codes=["BROAD_REACHABILITY"],
        evidence_titles=["T2"],
    )

    previous = [resolved_f, unchanged_f, regressed_prev, improved_prev, changed_prev]
    current = [new_f, unchanged_f, regressed_curr, improved_curr, changed_curr]

    delta = compare_findings(previous, current)
    md = delta_to_markdown(delta, "scan-A", "scan-B")

    # Required top-level heading and sections
    assert "# OID-See Findings Delta Report" in md
    assert "## Summary" in md
    assert "## New Findings" in md
    assert "## Regressed Findings" in md
    assert "## Improved Findings" in md
    assert "## Resolved Findings" in md
    assert "## Changed Findings" in md
    assert "## Unchanged Findings" in md

    # Labels present
    assert "scan-A" in md
    assert "scan-B" in md


# ---------------------------------------------------------------------------
# 12. CSV output structure
# ---------------------------------------------------------------------------


def test_csv_output_structure():
    f_prev = _finding("fid-csv1", risk_score=60, risk_level="high")
    f_curr = _finding("fid-csv1", risk_score=80, risk_level="high")  # score regressed
    f_new = _finding("fid-csv2", risk_score=30, risk_level="low")

    delta = compare_findings(previous=[f_prev], current=[f_curr, f_new])
    rows = delta_to_csv_rows(delta)

    assert len(rows) == 2
    for row in rows:
        for field in DELTA_CSV_FIELDNAMES:
            assert field in row, f"Missing field {field!r} in CSV row"
        # All values must be strings
        for k, v in row.items():
            assert isinstance(v, str), f"CSV field {k!r} must be a string, got {type(v)}"

    # CSV round-trip
    csv_text = delta_to_csv(delta)
    reader = csv.DictReader(io.StringIO(csv_text))
    parsed_rows = list(reader)
    assert len(parsed_rows) == 2
    assert set(parsed_rows[0].keys()) == set(DELTA_CSV_FIELDNAMES)


# ---------------------------------------------------------------------------
# 13. Confidence change → "changed"
# ---------------------------------------------------------------------------


def test_confidence_change_marks_changed():
    prev = _finding("fid-conf", risk_score=50, risk_level="medium", confidence="low")
    curr = _finding("fid-conf", risk_score=50, risk_level="medium", confidence="high")
    delta = compare_findings(previous=[prev], current=[curr])
    entry = delta[0]
    assert entry["status"] == "changed"
    assert entry["previousConfidence"] == "low"
    assert entry["currentConfidence"] == "high"


# ---------------------------------------------------------------------------
# 14. Evidence title change → "changed"
# ---------------------------------------------------------------------------


def test_evidence_title_change_marks_changed():
    prev = _finding(
        "fid-evid",
        risk_score=50,
        risk_level="medium",
        evidence_titles=["Title A"],
    )
    curr = _finding(
        "fid-evid",
        risk_score=50,
        risk_level="medium",
        evidence_titles=["Title B"],
    )
    delta = compare_findings(previous=[prev], current=[curr])
    assert delta[0]["status"] == "changed"


# ---------------------------------------------------------------------------
# 15. RecommendedAction change → "changed"
# ---------------------------------------------------------------------------


def test_recommended_action_change_marks_changed():
    prev = _finding("fid-act", risk_score=50, risk_level="medium", recommended_action="Do X.")
    curr = _finding("fid-act", risk_score=50, risk_level="medium", recommended_action="Do Y.")
    delta = compare_findings(previous=[prev], current=[curr])
    assert delta[0]["status"] == "changed"


# ---------------------------------------------------------------------------
# 16-18. Regression variants
# ---------------------------------------------------------------------------


def test_both_score_and_level_regress():
    prev = _finding("fid-reg1", risk_score=30, risk_level="low")
    curr = _finding("fid-reg1", risk_score=80, risk_level="high")
    delta = compare_findings(previous=[prev], current=[curr])
    assert delta[0]["status"] == "regressed"


def test_score_regresses_level_unchanged():
    prev = _finding("fid-reg2", risk_score=40, risk_level="medium")
    curr = _finding("fid-reg2", risk_score=60, risk_level="medium")
    delta = compare_findings(previous=[prev], current=[curr])
    assert delta[0]["status"] == "regressed"


def test_level_regresses_score_unchanged():
    prev = _finding("fid-reg3", risk_score=50, risk_level="low")
    curr = _finding("fid-reg3", risk_score=50, risk_level="high")
    delta = compare_findings(previous=[prev], current=[curr])
    assert delta[0]["status"] == "regressed"


# ---------------------------------------------------------------------------
# 19-20. Analyst actions
# ---------------------------------------------------------------------------


def test_analyst_action_new_critical():
    f = _finding("fid-act-crit", risk_level="critical", risk_score=100)
    delta = compare_findings(previous=[], current=[f])
    action = delta[0]["analystAction"]
    assert "urgently" in action.lower()
    assert "consent" in action.lower()


def test_analyst_action_new_high():
    f = _finding("fid-act-high", risk_level="high", risk_score=80)
    delta = compare_findings(previous=[], current=[f])
    action = delta[0]["analystAction"]
    assert "urgently" in action.lower()


def test_analyst_action_new_low():
    f = _finding("fid-act-low", risk_level="low", risk_score=10)
    delta = compare_findings(previous=[], current=[f])
    action = delta[0]["analystAction"]
    # Should not say urgently for low
    assert "urgently" not in action.lower()
    assert action != ""


def test_analyst_action_resolved():
    f = _finding("fid-act-res", risk_level="medium", risk_score=50)
    delta = compare_findings(previous=[f], current=[])
    action = delta[0]["analystAction"]
    assert "verify" in action.lower()


def test_analyst_action_regressed():
    prev = _finding("fid-act-reg", risk_score=30, risk_level="low")
    curr = _finding("fid-act-reg", risk_score=70, risk_level="high")
    delta = compare_findings(previous=[prev], current=[curr])
    action = delta[0]["analystAction"]
    assert "score increase" in action.lower()


def test_analyst_action_improved():
    prev = _finding("fid-act-imp", risk_score=70, risk_level="high")
    curr = _finding("fid-act-imp", risk_score=20, risk_level="low")
    delta = compare_findings(previous=[prev], current=[curr])
    action = delta[0]["analystAction"]
    assert "remediation" in action.lower()


def test_analyst_action_unchanged():
    f = _finding("fid-act-unc", risk_score=50, risk_level="medium")
    delta = compare_findings(previous=[f], current=[f])
    action = delta[0]["analystAction"]
    assert action == ""


# ---------------------------------------------------------------------------
# 21. Empty inputs
# ---------------------------------------------------------------------------


def test_empty_inputs_produce_empty_delta():
    delta = compare_findings(previous=[], current=[])
    assert delta == []


# ---------------------------------------------------------------------------
# 22. Sort ordering
# ---------------------------------------------------------------------------


def test_sort_ordering():
    """new < regressed < improved < resolved < changed < unchanged."""
    new_f = _finding("fid-s-new", risk_level="low", risk_score=10)
    regressed_prev = _finding("fid-s-reg", risk_score=10, risk_level="low")
    regressed_curr = _finding("fid-s-reg", risk_score=50, risk_level="high")
    improved_prev = _finding("fid-s-imp", risk_score=80, risk_level="high")
    improved_curr = _finding("fid-s-imp", risk_score=20, risk_level="low")
    resolved_f = _finding("fid-s-res", risk_level="medium", risk_score=40)
    changed_prev = _finding(
        "fid-s-chg",
        risk_score=50,
        risk_level="medium",
        reason_codes=["HAS_APP_ROLE"],
        evidence_titles=["T1"],
    )
    changed_curr = _finding(
        "fid-s-chg",
        risk_score=50,
        risk_level="medium",
        reason_codes=["BROAD_REACHABILITY"],
        evidence_titles=["T2"],
    )
    unchanged_f = _finding("fid-s-unc", risk_level="low", risk_score=5)

    previous = [regressed_prev, improved_prev, resolved_f, changed_prev, unchanged_f]
    current = [new_f, regressed_curr, improved_curr, changed_curr, unchanged_f]

    delta = compare_findings(previous, current)
    statuses = [e["status"] for e in delta]

    # Each status appears exactly once
    assert "new" in statuses
    assert "regressed" in statuses
    assert "improved" in statuses
    assert "resolved" in statuses
    assert "changed" in statuses
    assert "unchanged" in statuses

    _ORDER = {"new": 0, "regressed": 1, "improved": 2, "resolved": 3, "changed": 4, "unchanged": 5}
    order_values = [_ORDER[s] for s in statuses]
    assert order_values == sorted(order_values), f"Sort order wrong: {statuses}"


# ---------------------------------------------------------------------------
# 23. Markdown section headings present even with single entries
# ---------------------------------------------------------------------------


def test_markdown_section_only_new():
    f = _finding("fid-md-new", risk_level="high", risk_score=80)
    delta = compare_findings(previous=[], current=[f])
    md = delta_to_markdown(delta)
    assert "## New Findings" in md
    assert "## Resolved Findings" not in md
    assert "## Unchanged Findings" not in md
    assert "## Regressed Findings" not in md


def test_markdown_unchanged_collapsed():
    f = _finding("fid-md-unc", risk_level="medium", risk_score=50)
    delta = compare_findings(previous=[f], current=[f])
    md = delta_to_markdown(delta)
    assert "## Unchanged Findings" in md
    # Collapsed means a table row, not a full sub-section per entry
    assert "| `fid-md-unc`" in md


def test_markdown_summary_counts():
    new_f = _finding("fid-cnt-new", risk_level="high", risk_score=80)
    resolved_f = _finding("fid-cnt-res", risk_level="low", risk_score=10)
    delta = compare_findings(previous=[resolved_f], current=[new_f])
    md = delta_to_markdown(delta)
    assert "| New | 1 |" in md
    assert "| Resolved | 1 |" in md


# ---------------------------------------------------------------------------
# 24. Delta entries include all required fields
# ---------------------------------------------------------------------------


def test_delta_entry_has_all_required_fields():
    required_fields = [
        "findingId",
        "displayName",
        "appId",
        "servicePrincipalId",
        "status",
        "previousRiskScore",
        "currentRiskScore",
        "previousRiskLevel",
        "currentRiskLevel",
        "previousReasonCodes",
        "currentReasonCodes",
        "addedReasonCodes",
        "removedReasonCodes",
        "unchangedReasonCodes",
        "previousConfidence",
        "currentConfidence",
        "summary",
        "analystAction",
    ]
    f_prev = _finding("fid-fields", risk_score=50, risk_level="medium")
    f_curr = _finding("fid-fields", risk_score=70, risk_level="high")
    delta = compare_findings(previous=[f_prev], current=[f_curr])
    entry = delta[0]
    for field in required_fields:
        assert field in entry, f"Required field {field!r} missing from delta entry"


# ---------------------------------------------------------------------------
# 25. Risk level ordering: critical > high > medium > low > info
# ---------------------------------------------------------------------------


def test_risk_level_ordering():
    levels_ascending = ["info", "low", "medium", "high", "critical"]
    for i in range(len(levels_ascending) - 1):
        lower = levels_ascending[i]
        higher = levels_ascending[i + 1]
        prev = _finding("fid-ord", risk_score=50, risk_level=lower)
        curr = _finding("fid-ord", risk_score=50, risk_level=higher)
        delta = compare_findings(previous=[prev], current=[curr])
        assert delta[0]["status"] == "regressed", (
            f"Expected 'regressed' when going from {lower} to {higher}"
        )

    for i in range(len(levels_ascending) - 1, 0, -1):
        higher = levels_ascending[i]
        lower = levels_ascending[i - 1]
        prev = _finding("fid-ord", risk_score=50, risk_level=higher)
        curr = _finding("fid-ord", risk_score=50, risk_level=lower)
        delta = compare_findings(previous=[prev], current=[curr])
        assert delta[0]["status"] == "improved", (
            f"Expected 'improved' when going from {higher} to {lower}"
        )
