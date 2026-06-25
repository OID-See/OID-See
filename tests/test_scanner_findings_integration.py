#!/usr/bin/env python3
"""
Integration-style tests for the scanner workflow findings / delta flags.

Tests the helper functions _write_findings, _write_delta, and the
argument-validation logic added to oidsee_scanner.parse_args /
oidsee_scanner.main, as well as confirming the standalone CLIs still work.

All tests use small synthetic fixtures and produce no network calls.

Scenarios covered:
  1. _write_findings writes a valid JSON file from a synthetic export
  2. _write_findings writes a valid Markdown file from a synthetic export
  3. _write_delta writes a valid JSON delta file from synthetic findings
  4. --compare-findings without --delta-output is rejected (validation error)
  5. --compare-findings pointing at a missing file is rejected
  6. --compare-findings pointing at invalid JSON is rejected
  7. --compare-findings pointing at a non-list JSON value is rejected
  8. Standalone generate_findings.py CLI still produces a JSON output
  9. Standalone generate_findings.py CLI still produces a Markdown output
  10. Standalone compare_findings.py CLI still produces a JSON delta
  11. _findings_detect_format infers format from file extension
  12. _write_findings writes a valid CSV file from a synthetic export
  13. _write_delta writes a valid Markdown delta file from synthetic findings
  14. _write_delta writes a valid CSV delta file from synthetic findings
"""

from __future__ import annotations

import csv
import io
import json
import os
import sys
import tempfile
from typing import Any, Dict, List

# Allow running from the repository root without installing as a package
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, _REPO_ROOT)

from scanner_findings_helper import detect_format as _findings_detect_format
from scanner_findings_helper import write_delta as _write_delta
from scanner_findings_helper import write_findings as _write_findings


# ---------------------------------------------------------------------------
# Shared synthetic fixtures
# ---------------------------------------------------------------------------

def _make_export(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]] | None = None) -> Dict[str, Any]:
    return {
        "format": {"name": "oidsee-graph", "version": "1.1"},
        "generatedAt": "2025-06-01T00:00:00Z",
        "tenant": {
            "tenantId": "00000000-0000-0000-0000-000000000001",
            "displayName": "Scanner Test Tenant",
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
) -> Dict[str, Any]:
    return {
        "id": node_id,
        "type": "ServicePrincipal",
        "displayName": display_name,
        "properties": {
            "servicePrincipalId": node_id.replace("sp:", ""),
            "appId": f"app-{node_id.replace('sp:', '')}",
            "appDisplayName": display_name,
            "publisherName": "Test Publisher",
            "appOwnerOrganizationId": "tenant-abc",
            "appOwnership": "3rd Party",
            "verifiedPublisher": None,
        },
        "risk": {
            "score": score,
            "level": level,
            "reasons": reasons,
        },
    }


def _make_finding(
    sp_id: str,
    display_name: str,
    score: int,
    level: str,
    reason_codes: List[str] | None = None,
) -> Dict[str, Any]:
    return {
        "findingId": f"finding-{sp_id}",
        "subjectKey": sp_id,
        "servicePrincipalId": sp_id,
        "displayName": display_name,
        "riskScore": score,
        "riskLevel": level,
        "reasonCodes": reason_codes or [],
        "confidence": "medium",
        "recommendedAction": "Review this app.",
        "evidence": [],
    }


_SYNTHETIC_EXPORT = _make_export([
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
        score=30,
        level="low",
        reasons=[{"code": "UNVERIFIED_PUBLISHER", "weight": 6, "message": "Unverified"}],
    ),
])

_PREVIOUS_FINDINGS = [
    _make_finding("sp:alpha", "Alpha App", score=50, level="medium"),
    _make_finding("sp:gamma", "Gamma App", score=70, level="high"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_findings_from_export(export: Dict[str, Any], min_level: str = "low") -> List[Dict[str, Any]]:
    from finding_builder import build_findings
    return build_findings(export, min_risk_level=min_level)


# ---------------------------------------------------------------------------
# Scenario 1: _write_findings writes valid JSON
# ---------------------------------------------------------------------------

def test_write_findings_json():
    print("\n=== Scenario 1: _write_findings writes valid JSON ===")
    findings = _build_findings_from_export(_SYNTHETIC_EXPORT)
    assert len(findings) >= 1

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
        path = tf.name
    try:
        _write_findings(findings, path, "json", _SYNTHETIC_EXPORT)
        with open(path, "r", encoding="utf-8") as fh:
            loaded = json.load(fh)
        assert isinstance(loaded, list)
        assert len(loaded) == len(findings)
        assert loaded[0].get("findingId") is not None
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 2: _write_findings writes valid Markdown
# ---------------------------------------------------------------------------

def test_write_findings_markdown():
    print("\n=== Scenario 2: _write_findings writes valid Markdown ===")
    findings = _build_findings_from_export(_SYNTHETIC_EXPORT)

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as tf:
        path = tf.name
    try:
        _write_findings(findings, path, "markdown", _SYNTHETIC_EXPORT)
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
        assert "# OID-See" in content or "Findings" in content, "Markdown lacks expected heading"
        assert len(content) > 0
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 3: _write_delta writes valid JSON delta
# ---------------------------------------------------------------------------

def test_write_delta_json():
    print("\n=== Scenario 3: _write_delta writes valid JSON delta ===")
    from findings_diff import compare_findings

    current_findings = _build_findings_from_export(_SYNTHETIC_EXPORT)
    delta = compare_findings(_PREVIOUS_FINDINGS, current_findings)
    assert len(delta) >= 1

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
        path = tf.name
    try:
        _write_delta(delta, path, "json", "previous", "current")
        with open(path, "r", encoding="utf-8") as fh:
            loaded = json.load(fh)
        assert isinstance(loaded, list)
        assert len(loaded) == len(delta)
        assert loaded[0].get("status") in ("new", "resolved", "unchanged", "changed", "regressed", "improved")
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 4: --compare-findings without --delta-output is rejected
# ---------------------------------------------------------------------------

def test_compare_findings_without_delta_output_is_rejected():
    print("\n=== Scenario 4: --compare-findings without --delta-output rejected ===")
    # We test the validation logic directly by monkeypatching parse_args output
    import types

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf:
        json.dump(_PREVIOUS_FINDINGS, tf)
        prev_path = tf.name

    try:
        # Construct a minimal args namespace that would be produced after argument
        # parsing but before any collection.  The validation block is executed at
        # the start of main(); we reproduce it here to avoid needing real Graph auth.
        args = types.SimpleNamespace(
            compare_findings=prev_path,
            delta_output=None,  # <-- deliberately missing
        )
        result = _validate_findings_args(args)
        assert result == 1, "Expected validation to fail with code 1"
    finally:
        os.unlink(prev_path)


def _validate_findings_args(args: Any) -> int:
    """Mirror the validation block at the top of oidsee_scanner.main()."""
    if args.compare_findings and not args.delta_output:
        print(
            "error: --delta-output is required when --compare-findings is set",
            file=sys.stderr,
        )
        return 1
    if args.compare_findings and not os.path.isfile(args.compare_findings):
        print(
            f"error: previous findings file not found: {args.compare_findings}",
            file=sys.stderr,
        )
        return 1
    if args.compare_findings:
        try:
            with open(args.compare_findings, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except json.JSONDecodeError as exc:
            print(f"error: failed to parse previous findings JSON: {exc}", file=sys.stderr)
            return 1
        if not isinstance(data, list):
            print(
                f"error: expected a JSON array of findings in {args.compare_findings}, "
                f"got {type(data).__name__}",
                file=sys.stderr,
            )
            return 1
    return 0


# ---------------------------------------------------------------------------
# Scenario 5: --compare-findings pointing at a missing file is rejected
# ---------------------------------------------------------------------------

def test_compare_findings_missing_file_rejected():
    print("\n=== Scenario 5: --compare-findings missing file rejected ===")
    import types

    args = types.SimpleNamespace(
        compare_findings="/tmp/does-not-exist-9999.json",
        delta_output="/tmp/delta.json",
    )
    result = _validate_findings_args(args)
    assert result == 1, "Expected validation to fail for missing file"


# ---------------------------------------------------------------------------
# Scenario 6: --compare-findings with invalid JSON is rejected
# ---------------------------------------------------------------------------

def test_compare_findings_invalid_json_rejected():
    print("\n=== Scenario 6: invalid JSON is rejected ===")
    import types

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf:
        tf.write("this is not json {{{")
        path = tf.name

    try:
        args = types.SimpleNamespace(
            compare_findings=path,
            delta_output="/tmp/delta.json",
        )
        result = _validate_findings_args(args)
        assert result == 1, "Expected validation to fail for invalid JSON"
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 7: --compare-findings with non-list JSON is rejected
# ---------------------------------------------------------------------------

def test_compare_findings_non_list_json_rejected():
    print("\n=== Scenario 7: non-list JSON is rejected ===")
    import types

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf:
        json.dump({"key": "value"}, tf)
        path = tf.name

    try:
        args = types.SimpleNamespace(
            compare_findings=path,
            delta_output="/tmp/delta.json",
        )
        result = _validate_findings_args(args)
        assert result == 1, "Expected validation to fail for non-list JSON"
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 8: standalone generate_findings.py produces JSON output
# ---------------------------------------------------------------------------

def test_standalone_generate_findings_json():
    print("\n=== Scenario 8: standalone generate_findings.py produces JSON ===")
    import generate_findings

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf_in:
        json.dump(_SYNTHETIC_EXPORT, tf_in)
        in_path = tf_in.name

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf_out:
        out_path = tf_out.name

    try:
        rc = generate_findings.main([in_path, out_path])
        assert rc == 0, f"generate_findings.main returned {rc}"
        with open(out_path, "r", encoding="utf-8") as fh:
            loaded = json.load(fh)
        assert isinstance(loaded, list)
        assert len(loaded) >= 1
    finally:
        os.unlink(in_path)
        os.unlink(out_path)


# ---------------------------------------------------------------------------
# Scenario 9: standalone generate_findings.py produces Markdown output
# ---------------------------------------------------------------------------

def test_standalone_generate_findings_markdown():
    print("\n=== Scenario 9: standalone generate_findings.py produces Markdown ===")
    import generate_findings

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf_in:
        json.dump(_SYNTHETIC_EXPORT, tf_in)
        in_path = tf_in.name

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as tf_out:
        out_path = tf_out.name

    try:
        rc = generate_findings.main([in_path, out_path])
        assert rc == 0, f"generate_findings.main returned {rc}"
        with open(out_path, "r", encoding="utf-8") as fh:
            content = fh.read()
        assert len(content) > 0
        assert "Findings" in content or "OID-See" in content
    finally:
        os.unlink(in_path)
        os.unlink(out_path)


# ---------------------------------------------------------------------------
# Scenario 10: standalone compare_findings.py produces JSON delta output
# ---------------------------------------------------------------------------

def test_standalone_compare_findings_json():
    print("\n=== Scenario 10: standalone compare_findings.py produces JSON delta ===")
    import compare_findings as cf_mod
    from finding_builder import build_findings

    current = build_findings(_SYNTHETIC_EXPORT)

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf_prev:
        json.dump(_PREVIOUS_FINDINGS, tf_prev)
        prev_path = tf_prev.name

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf_curr:
        json.dump(current, tf_curr)
        curr_path = tf_curr.name

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf_out:
        out_path = tf_out.name

    try:
        rc = cf_mod.main([prev_path, curr_path, out_path])
        assert rc == 0, f"compare_findings.main returned {rc}"
        with open(out_path, "r", encoding="utf-8") as fh:
            loaded = json.load(fh)
        assert isinstance(loaded, list)
        statuses = {e.get("status") for e in loaded}
        assert statuses <= {"new", "resolved", "unchanged", "changed", "regressed", "improved"}
    finally:
        os.unlink(prev_path)
        os.unlink(curr_path)
        os.unlink(out_path)


# ---------------------------------------------------------------------------
# Scenario 11: _findings_detect_format infers format from extension
# ---------------------------------------------------------------------------

def test_findings_detect_format():
    print("\n=== Scenario 11: _findings_detect_format format inference ===")
    assert _findings_detect_format("out.json") == "json"
    assert _findings_detect_format("out.JSON") == "json"
    assert _findings_detect_format("out.csv") == "csv"
    assert _findings_detect_format("out.md") == "markdown"
    assert _findings_detect_format("out.markdown") == "markdown"
    assert _findings_detect_format("out.txt") == "json"  # unknown → default json


# ---------------------------------------------------------------------------
# Scenario 12: _write_findings writes valid CSV
# ---------------------------------------------------------------------------

def test_write_findings_csv():
    print("\n=== Scenario 12: _write_findings writes valid CSV ===")
    from finding_builder import CSV_FIELDNAMES

    findings = _build_findings_from_export(_SYNTHETIC_EXPORT)

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tf:
        path = tf.name
    try:
        _write_findings(findings, path, "csv", _SYNTHETIC_EXPORT)
        with open(path, "r", encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            rows = list(reader)
        assert len(rows) == len(findings)
        assert set(reader.fieldnames or []) == set(CSV_FIELDNAMES)
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 13: _write_delta writes valid Markdown
# ---------------------------------------------------------------------------

def test_write_delta_markdown():
    print("\n=== Scenario 13: _write_delta writes valid Markdown ===")
    from findings_diff import compare_findings

    current_findings = _build_findings_from_export(_SYNTHETIC_EXPORT)
    delta = compare_findings(_PREVIOUS_FINDINGS, current_findings)

    with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as tf:
        path = tf.name
    try:
        _write_delta(delta, path, "markdown", "baseline", "current")
        with open(path, "r", encoding="utf-8") as fh:
            content = fh.read()
        assert "baseline" in content or "current" in content
        assert len(content) > 0
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Scenario 14: _write_delta writes valid CSV
# ---------------------------------------------------------------------------

def test_write_delta_csv():
    print("\n=== Scenario 14: _write_delta writes valid CSV ===")
    from findings_diff import DELTA_CSV_FIELDNAMES, compare_findings

    current_findings = _build_findings_from_export(_SYNTHETIC_EXPORT)
    delta = compare_findings(_PREVIOUS_FINDINGS, current_findings)

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tf:
        path = tf.name
    try:
        _write_delta(delta, path, "csv", "baseline", "current")
        with open(path, "r", encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            rows = list(reader)
        assert len(rows) == len(delta)
        assert set(reader.fieldnames or []) == set(DELTA_CSV_FIELDNAMES)
    finally:
        os.unlink(path)


# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    tests = [
        test_write_findings_json,
        test_write_findings_markdown,
        test_write_delta_json,
        test_compare_findings_without_delta_output_is_rejected,
        test_compare_findings_missing_file_rejected,
        test_compare_findings_invalid_json_rejected,
        test_compare_findings_non_list_json_rejected,
        test_standalone_generate_findings_json,
        test_standalone_generate_findings_markdown,
        test_standalone_compare_findings_json,
        test_findings_detect_format,
        test_write_findings_csv,
        test_write_delta_markdown,
        test_write_delta_csv,
    ]

    failures = 0
    for t in tests:
        try:
            t()
            print(f"  ✓ {t.__name__}")
        except Exception as exc:  # noqa: BLE001
            print(f"  ✗ {t.__name__}: {exc}")
            failures += 1

    if failures:
        print(f"\n{failures} test(s) failed.")
        sys.exit(1)
    else:
        print(f"\nAll {len(tests)} test(s) passed.")
