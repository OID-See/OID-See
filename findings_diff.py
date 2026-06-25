#!/usr/bin/env python3
"""
OID-See Findings Diff

Compares two lists of OID-See finding objects (as produced by finding_builder.py /
generate_findings.py) and returns a list of delta entries describing what changed
between scans.

No scanner scoring is modified here — all risk values are taken verbatim from the
two input finding lists.

Usage::

    from findings_diff import compare_findings, delta_to_markdown

    delta = compare_findings(previous_findings, current_findings)

    # JSON output
    import json
    with open("delta.json", "w") as f:
        json.dump(delta, f, indent=2)

    # Markdown output
    with open("delta.md", "w") as f:
        f.write(delta_to_markdown(delta))
"""

from __future__ import annotations

import csv
import io
from typing import Any, Dict, List, Optional, Set


# ---------------------------------------------------------------------------
# Risk level ordering (critical > high > medium > low > info)
# ---------------------------------------------------------------------------

_RISK_LEVEL_ORDER: Dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
    "info": 0,
}

_LEVEL_DISPLAY_ORDER = ["critical", "high", "medium", "low", "info"]

_STATUS_SORT_ORDER: Dict[str, int] = {
    "new": 0,
    "regressed": 1,
    "improved": 2,
    "resolved": 3,
    "changed": 4,
    "unchanged": 5,
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _level_order(level: str) -> int:
    """Return numeric sort key for a risk level string."""
    return _RISK_LEVEL_ORDER.get((level or "").lower(), -1)


def _classify_paired(prev: Dict[str, Any], curr: Dict[str, Any]) -> str:
    """
    Classify a finding present in both scans.

    Returns one of: "regressed", "improved", "changed", "unchanged".
    """
    prev_score: int = prev.get("riskScore") or 0
    curr_score: int = curr.get("riskScore") or 0
    prev_level: str = (prev.get("riskLevel") or "info").lower()
    curr_level: str = (curr.get("riskLevel") or "info").lower()

    score_worsened = curr_score > prev_score
    level_worsened = _level_order(curr_level) > _level_order(prev_level)
    score_improved = curr_score < prev_score
    level_improved = _level_order(curr_level) < _level_order(prev_level)

    if score_worsened or level_worsened:
        return "regressed"

    if score_improved or level_improved:
        return "improved"

    # Check for any other material change
    prev_codes: Set[str] = set(prev.get("reasonCodes") or [])
    curr_codes: Set[str] = set(curr.get("reasonCodes") or [])

    prev_titles: Set[str] = {
        e.get("title", "") for e in (prev.get("evidence") or [])
    }
    curr_titles: Set[str] = {
        e.get("title", "") for e in (curr.get("evidence") or [])
    }

    if (
        prev_codes != curr_codes
        or (prev.get("confidence") or "") != (curr.get("confidence") or "")
        or prev_titles != curr_titles
        or (prev.get("recommendedAction") or "") != (curr.get("recommendedAction") or "")
    ):
        return "changed"

    return "unchanged"


def _analyst_action(status: str, curr: Optional[Dict[str, Any]]) -> str:
    """Return a suggested analyst action string for the given status."""
    curr_level = ((curr or {}).get("riskLevel") or "info").lower() if curr else "info"

    if status == "new":
        if curr_level in ("critical", "high"):
            return (
                "Review urgently and confirm whether new consent, credential, assignment, "
                "or publisher state changed."
            )
        return "Review new finding and assess whether it requires immediate action."

    if status == "regressed":
        return "Compare reason code changes and validate what caused the score increase."

    if status == "improved":
        return "Confirm remediation was intentional and complete."

    if status == "resolved":
        return "Verify app removal, permission removal, or risk reduction was expected."

    if status == "changed":
        return "Review changed reason codes and evidence."

    # unchanged
    return ""


def _build_delta_entry(
    finding_id: str,
    status: str,
    prev: Optional[Dict[str, Any]],
    curr: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Build a single delta entry dict."""
    ref = curr if curr is not None else (prev or {})

    prev_codes: List[str] = list(prev.get("reasonCodes") or []) if prev else []
    curr_codes: List[str] = list(curr.get("reasonCodes") or []) if curr else []

    prev_set: Set[str] = set(prev_codes)
    curr_set: Set[str] = set(curr_codes)
    added_codes = sorted(curr_set - prev_set)
    removed_codes = sorted(prev_set - curr_set)
    unchanged_codes = sorted(prev_set & curr_set)

    prev_score: Optional[int] = prev.get("riskScore") if prev else None
    curr_score: Optional[int] = curr.get("riskScore") if curr else None
    prev_level: Optional[str] = prev.get("riskLevel") if prev else None
    curr_level: Optional[str] = curr.get("riskLevel") if curr else None
    prev_confidence: Optional[str] = prev.get("confidence") if prev else None
    curr_confidence: Optional[str] = curr.get("confidence") if curr else None

    # Build summary
    if status == "new":
        summary = (
            f"New finding: {ref.get('displayName') or finding_id} "
            f"at {curr_level} risk (score {curr_score})."
        )
    elif status == "resolved":
        summary = (
            f"Resolved: {ref.get('displayName') or finding_id} "
            f"(was {prev_level}, score {prev_score})."
        )
    elif status == "regressed":
        summary = (
            f"Regressed: score {prev_score} \u2192 {curr_score}, "
            f"level {prev_level} \u2192 {curr_level}."
        )
    elif status == "improved":
        summary = (
            f"Improved: score {prev_score} \u2192 {curr_score}, "
            f"level {prev_level} \u2192 {curr_level}."
        )
    elif status == "changed":
        change_parts: List[str] = []
        if added_codes:
            change_parts.append(f"added reason codes: {', '.join(added_codes)}")
        if removed_codes:
            change_parts.append(f"removed reason codes: {', '.join(removed_codes)}")
        if (prev_confidence or "") != (curr_confidence or ""):
            change_parts.append(f"confidence {prev_confidence} \u2192 {curr_confidence}")
        summary = "Changed: " + (
            "; ".join(change_parts) if change_parts else "material changes detected."
        )
    else:
        summary = f"Unchanged: {ref.get('displayName') or finding_id}."

    return {
        "findingId": finding_id,
        "displayName": ref.get("displayName"),
        "appId": ref.get("appId"),
        "servicePrincipalId": ref.get("servicePrincipalId"),
        "status": status,
        "previousRiskScore": prev_score,
        "currentRiskScore": curr_score,
        "previousRiskLevel": prev_level,
        "currentRiskLevel": curr_level,
        "previousReasonCodes": prev_codes,
        "currentReasonCodes": curr_codes,
        "addedReasonCodes": added_codes,
        "removedReasonCodes": removed_codes,
        "unchangedReasonCodes": unchanged_codes,
        "previousConfidence": prev_confidence,
        "currentConfidence": curr_confidence,
        "summary": summary,
        "analystAction": _analyst_action(status, curr),
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compare_findings(
    previous: List[Dict[str, Any]],
    current: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Compare two lists of OID-See finding objects and return a delta report.

    Uses ``findingId`` as the stable primary key.  Each entry in the returned
    list is classified as one of: new, resolved, unchanged, changed, regressed,
    or improved.

    Args:
        previous: Finding objects from the earlier scan (output of build_findings).
        current:  Finding objects from the later scan (output of build_findings).

    Returns:
        List of delta entry dicts sorted by status priority then risk score
        descending.  Status priority: new, regressed, improved, resolved,
        changed, unchanged.
    """
    prev_by_id: Dict[str, Dict[str, Any]] = {
        f["findingId"]: f for f in previous if f.get("findingId")
    }
    curr_by_id: Dict[str, Dict[str, Any]] = {
        f["findingId"]: f for f in current if f.get("findingId")
    }

    all_ids: Set[str] = set(prev_by_id.keys()) | set(curr_by_id.keys())

    delta: List[Dict[str, Any]] = []

    for finding_id in all_ids:
        prev = prev_by_id.get(finding_id)
        curr = curr_by_id.get(finding_id)

        if curr is not None and prev is None:
            status = "new"
        elif prev is not None and curr is None:
            status = "resolved"
        else:
            assert prev is not None and curr is not None
            status = _classify_paired(prev, curr)

        delta.append(_build_delta_entry(finding_id, status, prev, curr))

    def _sort_key(entry: Dict[str, Any]) -> tuple:
        score = entry.get("currentRiskScore")
        if score is None:
            score = entry.get("previousRiskScore") or 0
        return (_STATUS_SORT_ORDER.get(entry["status"], 99), -score)

    delta.sort(key=_sort_key)
    return delta


# ---------------------------------------------------------------------------
# Markdown renderer
# ---------------------------------------------------------------------------


def delta_to_markdown(
    delta: List[Dict[str, Any]],
    previous_label: str = "previous scan",
    current_label: str = "current scan",
) -> str:
    """
    Render a delta list as a human-readable Markdown drift report.

    Sections:
    - Summary (counts by status and by current risk level)
    - New findings
    - Regressed findings
    - Improved findings
    - Resolved findings
    - Changed findings
    - Unchanged findings (collapsed table)

    Args:
        delta:          Output of :func:`compare_findings`.
        previous_label: Label for the earlier scan (used in the header).
        current_label:  Label for the later scan (used in the header).

    Returns:
        Markdown string.
    """
    lines: List[str] = []

    lines.append("# OID-See Findings Delta Report")
    lines.append("")
    lines.append(f"Comparing **{previous_label}** \u2192 **{current_label}**")
    lines.append("")
    lines.append(
        "_All risk values are taken verbatim from the two input finding exports. "
        "No scanner scoring is modified by this tool._"
    )
    lines.append("")

    # ---- Summary section ----
    lines.append("## Summary")
    lines.append("")

    by_status: Dict[str, int] = {}
    for entry in delta:
        s = entry.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1

    lines.append("| Status | Count |")
    lines.append("| --- | --- |")
    for status in ["new", "regressed", "improved", "resolved", "changed", "unchanged"]:
        count = by_status.get(status, 0)
        if count:
            lines.append(f"| {status.capitalize()} | {count} |")
    lines.append("")

    lines.append("### By Current Risk Level")
    lines.append("")

    by_level: Dict[str, int] = {}
    for entry in delta:
        level = (entry.get("currentRiskLevel") or entry.get("previousRiskLevel") or "info").lower()
        by_level[level] = by_level.get(level, 0) + 1

    lines.append("| Risk Level | Count |")
    lines.append("| --- | --- |")
    for level in _LEVEL_DISPLAY_ORDER:
        count = by_level.get(level, 0)
        if count:
            lines.append(f"| {level.capitalize()} | {count} |")
    lines.append("")

    # ---- Per-status sections ----
    def _render_entry(entry: Dict[str, Any], status: str) -> None:
        name = entry.get("displayName") or entry.get("findingId") or "Unknown"
        curr_level = (entry.get("currentRiskLevel") or "").upper()
        prev_level = (entry.get("previousRiskLevel") or "").upper()

        lines.append(f"### {name}")
        lines.append("")
        lines.append(f"- **Finding ID**: `{entry.get('findingId', '')}`")
        if entry.get("appId"):
            lines.append(f"- **App ID**: `{entry['appId']}`")
        if entry.get("servicePrincipalId"):
            lines.append(f"- **Service Principal ID**: `{entry['servicePrincipalId']}`")

        if status == "new":
            lines.append(f"- **Risk Level**: {curr_level}")
            lines.append(f"- **Risk Score**: {entry.get('currentRiskScore')}")
            codes = entry.get("currentReasonCodes") or []
            if codes:
                lines.append(f"- **Reason Codes**: {', '.join(codes)}")
            conf = entry.get("currentConfidence")
            if conf:
                lines.append(f"- **Confidence**: {conf}")

        elif status == "resolved":
            lines.append(f"- **Previous Risk Level**: {prev_level}")
            lines.append(f"- **Previous Risk Score**: {entry.get('previousRiskScore')}")
            codes = entry.get("previousReasonCodes") or []
            if codes:
                lines.append(f"- **Previous Reason Codes**: {', '.join(codes)}")

        else:
            lines.append(
                f"- **Risk Level**: {prev_level} \u2192 {curr_level}"
            )
            lines.append(
                f"- **Risk Score**: {entry.get('previousRiskScore')} \u2192 {entry.get('currentRiskScore')}"
            )
            added = entry.get("addedReasonCodes") or []
            removed = entry.get("removedReasonCodes") or []
            if added:
                lines.append(f"- **Added Reason Codes**: {', '.join(added)}")
            if removed:
                lines.append(f"- **Removed Reason Codes**: {', '.join(removed)}")
            conf_prev = entry.get("previousConfidence") or ""
            conf_curr = entry.get("currentConfidence") or ""
            if conf_prev != conf_curr:
                lines.append(f"- **Confidence**: {conf_prev} \u2192 {conf_curr}")

        lines.append(f"- **Summary**: {entry.get('summary', '')}")
        action = entry.get("analystAction", "")
        if action:
            lines.append(f"- **Analyst Action**: {action}")
        lines.append("")

    def _section(status: str, heading: str) -> None:
        entries = [e for e in delta if e.get("status") == status]
        if not entries:
            return
        lines.append(f"## {heading}")
        lines.append("")
        for entry in entries:
            _render_entry(entry, status)

    _section("new", "New Findings")
    _section("regressed", "Regressed Findings")
    _section("improved", "Improved Findings")
    _section("resolved", "Resolved Findings")
    _section("changed", "Changed Findings")

    # Unchanged: collapsed summary table
    unchanged = [e for e in delta if e.get("status") == "unchanged"]
    if unchanged:
        lines.append("## Unchanged Findings")
        lines.append("")
        lines.append(f"_{len(unchanged)} finding(s) unchanged between scans._")
        lines.append("")
        lines.append("| Finding ID | Display Name | Risk Level | Risk Score |")
        lines.append("| --- | --- | --- | --- |")
        for entry in unchanged:
            fid = entry.get("findingId", "")
            name = entry.get("displayName") or ""
            level = (entry.get("currentRiskLevel") or "").capitalize()
            score = entry.get("currentRiskScore", "")
            lines.append(f"| `{fid}` | {name} | {level} | {score} |")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CSV renderer
# ---------------------------------------------------------------------------

DELTA_CSV_FIELDNAMES = [
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


def delta_to_csv_rows(delta: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Flatten delta entries into CSV-compatible row dicts.

    List fields (reasonCodes, etc.) are serialised as comma-separated strings.

    Args:
        delta: Output of :func:`compare_findings`.

    Returns:
        List of flat dicts suitable for :class:`csv.DictWriter`.
    """
    rows: List[Dict[str, str]] = []
    for entry in delta:
        rows.append({
            "findingId": entry.get("findingId") or "",
            "displayName": entry.get("displayName") or "",
            "appId": entry.get("appId") or "",
            "servicePrincipalId": entry.get("servicePrincipalId") or "",
            "status": entry.get("status") or "",
            "previousRiskScore": str(entry.get("previousRiskScore")) if entry.get("previousRiskScore") is not None else "",
            "currentRiskScore": str(entry.get("currentRiskScore")) if entry.get("currentRiskScore") is not None else "",
            "previousRiskLevel": entry.get("previousRiskLevel") or "",
            "currentRiskLevel": entry.get("currentRiskLevel") or "",
            "previousReasonCodes": ",".join(entry.get("previousReasonCodes") or []),
            "currentReasonCodes": ",".join(entry.get("currentReasonCodes") or []),
            "addedReasonCodes": ",".join(entry.get("addedReasonCodes") or []),
            "removedReasonCodes": ",".join(entry.get("removedReasonCodes") or []),
            "unchangedReasonCodes": ",".join(entry.get("unchangedReasonCodes") or []),
            "previousConfidence": entry.get("previousConfidence") or "",
            "currentConfidence": entry.get("currentConfidence") or "",
            "summary": entry.get("summary") or "",
            "analystAction": entry.get("analystAction") or "",
        })
    return rows


def delta_to_csv(delta: List[Dict[str, Any]]) -> str:
    """
    Serialise the delta list to a CSV string.

    Args:
        delta: Output of :func:`compare_findings`.

    Returns:
        CSV string (with header row).
    """
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=DELTA_CSV_FIELDNAMES, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(delta_to_csv_rows(delta))
    return buf.getvalue()
