#!/usr/bin/env python3
"""
OID-See SARIF 2.1.0 exporter.

Converts OID-See finding objects (as produced by :func:`finding_builder.build_findings`)
into a SARIF 2.1.0 JSON document suitable for consumption by GitHub code scanning,
security tooling, CI pipelines, and audit workflows.

Usage::

    from finding_builder import build_findings
    from findings_sarif import findings_to_sarif
    import json

    with open("scan-results.json") as f:
        export = json.load(f)

    findings = build_findings(export)
    sarif_doc = findings_to_sarif(findings)

    with open("findings.sarif", "w", encoding="utf-8") as f:
        json.dump(sarif_doc, f, indent=2, ensure_ascii=False)
        f.write("\\n")

SARIF mapping
-------------
- SARIF version: 2.1.0
- tool.driver.name: OID-See
- tool.driver.informationUri: https://github.com/OID-See/OID-See
- tool.driver.rules: one rule per unique reason code present in the findings
- rule.id: reason code
- rule.name: evidence title for the reason code
- rule.shortDescription.text: evidence summary
- rule.fullDescription.text: evidence impact and check-next guidance
- rule.help.text: recommended action and false-positive notes

Each finding produces one SARIF result:
- ruleId: reason code with the highest weight, or the first reason code
- level: critical/high → error, medium → warning, low/info → note
- message.text: concise summary including displayName, riskLevel, riskScore,
  reason codes, confidence, and recommended action
- locations: logical location (servicePrincipal object) with a synthetic
  physical URI (oidsee://servicePrincipal/<id>)
- properties: OID-See-specific finding fields preserved verbatim
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

_SARIF_SCHEMA = (
    "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json"
)
_SARIF_VERSION = "2.1.0"
_TOOL_NAME = "OID-See"
_TOOL_INFO_URI = "https://github.com/OID-See/OID-See"

_LEVEL_MAP: Dict[str, str] = {
    "critical": "error",
    "high": "error",
    "medium": "warning",
    "low": "note",
    "info": "note",
}


def _primary_rule_id(finding: Dict[str, Any]) -> str:
    """Return the primary ruleId for a finding.

    Selects the reason code with the highest weight from the evidence list.
    Falls back to the first reason code, then to ``"UNKNOWN"`` if neither is
    available.
    """
    evidence: List[Dict[str, Any]] = finding.get("evidence") or []
    if evidence:
        best = max(evidence, key=lambda e: e.get("weight", 0))
        return best.get("reasonCode") or "UNKNOWN"
    codes: List[str] = finding.get("reasonCodes") or []
    return codes[0] if codes else "UNKNOWN"


def _sarif_level(risk_level: str) -> str:
    """Map an OID-See risk level to a SARIF level string."""
    return _LEVEL_MAP.get(risk_level.lower() if risk_level else "", "note")


def _build_message_text(finding: Dict[str, Any]) -> str:
    """Build a concise SARIF result message from a finding."""
    display = finding.get("displayName") or finding.get("servicePrincipalId") or finding.get("subjectKey") or ""
    risk_level = finding.get("riskLevel", "")
    risk_score = finding.get("riskScore", 0)
    reason_codes: List[str] = finding.get("reasonCodes") or []
    confidence = finding.get("confidence", "")
    recommended_action = finding.get("recommendedAction", "")

    parts: List[str] = []
    if display:
        parts.append(f"Finding: {display}")
    parts.append(f"Risk: {risk_level} (score {risk_score})")
    if reason_codes:
        parts.append(f"Reasons: {', '.join(reason_codes)}")
    if confidence:
        parts.append(f"Confidence: {confidence}")
    if recommended_action:
        parts.append(f"Action: {recommended_action}")

    return ". ".join(parts) + "."


def _build_rule(reason_code: str, evidence_item: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Build a SARIF rule descriptor for a single reason code.

    Args:
        reason_code:   The OID-See reason code (e.g. ``"HAS_APP_ROLE"``).
        evidence_item: The first evidence block for this reason code, used to
                       populate rule metadata.  May be ``None`` if no evidence
                       block is available (e.g. reason code only in reasonCodes
                       list without a matching evidence entry).

    Returns:
        A SARIF ``reportingDescriptor`` dict.
    """
    title = (evidence_item or {}).get("title") or reason_code
    summary = (evidence_item or {}).get("summary") or ""
    impact = (evidence_item or {}).get("impact") or ""
    check_next = (evidence_item or {}).get("checkNext") or ""
    false_positive_notes = (evidence_item or {}).get("falsePositiveNotes") or ""

    full_desc_parts = []
    if impact:
        full_desc_parts.append(impact)
    if check_next:
        full_desc_parts.append(check_next)
    full_desc = " ".join(full_desc_parts) if full_desc_parts else summary

    # recommended action comes from finding-level, not evidence-level in the data
    # model; use false-positive notes as an additional hint in rule help text.
    help_parts = []
    if false_positive_notes:
        help_parts.append(f"False-positive notes: {false_positive_notes}")
    help_text = " ".join(help_parts) if help_parts else f"Review findings with reason code {reason_code}."

    rule: Dict[str, Any] = {
        "id": reason_code,
        "name": title,
        "shortDescription": {"text": summary or title},
        "fullDescription": {"text": full_desc or summary or title},
        "help": {"text": help_text},
        "properties": {"reasonCode": reason_code},
    }
    return rule


def _build_location(finding: Dict[str, Any]) -> Dict[str, Any]:
    """Build a SARIF location for a finding.

    Uses a logical location for the service principal (kind=``"object"``) and
    a synthetic physical URI so that consumers that require physical locations
    can resolve the finding.
    """
    sp_id = finding.get("servicePrincipalId") or ""
    app_id = finding.get("appId") or ""
    display = finding.get("displayName") or sp_id
    subject_key = finding.get("subjectKey") or sp_id or app_id

    # fullyQualifiedName uses the most stable identifier available
    fqn = sp_id or app_id or subject_key

    # Synthetic URI: oidsee://servicePrincipal/<id>
    # Encodes the subject key into the path so consumers can correlate results.
    safe_key = subject_key.replace("\\", "/").lstrip("/")
    synthetic_uri = f"oidsee://servicePrincipal/{safe_key}"

    return {
        "logicalLocations": [
            {
                "name": display or fqn,
                "kind": "object",
                "fullyQualifiedName": fqn,
            }
        ],
        "physicalLocation": {
            "artifactLocation": {
                "uri": synthetic_uri,
            }
        },
    }


def _build_result(finding: Dict[str, Any]) -> Dict[str, Any]:
    """Convert one OID-See finding into a SARIF result object."""
    rule_id = _primary_rule_id(finding)
    level = _sarif_level(finding.get("riskLevel", ""))
    message_text = _build_message_text(finding)
    location = _build_location(finding)

    # Preserve all OID-See-specific fields in result properties
    props: Dict[str, Any] = {
        "findingId": finding.get("findingId"),
        "subjectKey": finding.get("subjectKey"),
        "displayName": finding.get("displayName"),
        "appId": finding.get("appId"),
        "servicePrincipalId": finding.get("servicePrincipalId"),
        "publisherName": finding.get("publisherName"),
        "verifiedPublisherId": finding.get("verifiedPublisherId"),
        "appOwnerOrganizationId": finding.get("appOwnerOrganizationId"),
        "appOwnership": finding.get("appOwnership"),
        "riskScore": finding.get("riskScore"),
        "riskLevel": finding.get("riskLevel"),
        "reasonCodes": finding.get("reasonCodes"),
        "confidence": finding.get("confidence"),
        "recommendedAction": finding.get("recommendedAction"),
        "falsePositiveNotes": finding.get("falsePositiveNotes"),
        "affectedRelationships": finding.get("affectedRelationships"),
    }
    # Drop keys with None values to keep the SARIF output clean
    props = {k: v for k, v in props.items() if v is not None}

    return {
        "ruleId": rule_id,
        "level": level,
        "message": {"text": message_text},
        "locations": [location],
        "properties": props,
    }


def findings_to_sarif(
    findings: List[Dict[str, Any]],
    tool_name: str = _TOOL_NAME,
    tool_info_uri: str = _TOOL_INFO_URI,
) -> Dict[str, Any]:
    """Convert OID-See findings into a SARIF 2.1.0 document.

    Args:
        findings:      List of finding dicts as returned by
                       :func:`finding_builder.build_findings`.
        tool_name:     Override the tool name in ``tool.driver.name``
                       (default: ``"OID-See"``).
        tool_info_uri: Override the tool information URI
                       (default: ``"https://github.com/OID-See/OID-See"``).

    Returns:
        A dict representing a complete SARIF 2.1.0 document, ready for
        serialisation with :func:`json.dump`.
    """
    # Collect the first evidence item for each reason code, preserving
    # insertion order (i.e. the order in which codes first appear across
    # the findings list as passed in — callers should pass findings sorted
    # by riskScore descending so that the highest-risk finding's evidence
    # is used as the canonical rule template for each reason code).
    rule_evidence: Dict[str, Optional[Dict[str, Any]]] = {}
    for finding in findings:
        for ev in (finding.get("evidence") or []):
            code = ev.get("reasonCode")
            if code and code not in rule_evidence:
                rule_evidence[code] = ev
        # Also register codes that appear in reasonCodes but have no evidence block
        for code in (finding.get("reasonCodes") or []):
            if code not in rule_evidence:
                rule_evidence[code] = None

    rules = [_build_rule(code, ev) for code, ev in rule_evidence.items()]
    results = [_build_result(f) for f in findings]

    return {
        "$schema": _SARIF_SCHEMA,
        "version": _SARIF_VERSION,
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": tool_name,
                        "informationUri": tool_info_uri,
                        "rules": rules,
                    }
                },
                "results": results,
            }
        ],
    }


def write_sarif(findings: List[Dict[str, Any]], path: str) -> None:
    """Serialise findings as SARIF 2.1.0 and write to *path*.

    Args:
        findings: List of finding dicts from :func:`finding_builder.build_findings`.
        path:     Destination file path.

    Raises:
        OSError: If the output file cannot be written.
    """
    doc = findings_to_sarif(findings)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
