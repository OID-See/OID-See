#!/usr/bin/env python3
"""
OID-See Findings Generator CLI

Converts an OID-See graph export (JSON) into analyst-ready findings in JSON,
CSV, or Markdown format.

Usage:
    python generate_findings.py scan-results.json findings.json
    python generate_findings.py scan-results.json findings.csv
    python generate_findings.py scan-results.json findings.md

    # Filter to medium and above (default is low):
    python generate_findings.py scan-results.json findings.json --min-level medium

    # Include all apps (info level and above):
    python generate_findings.py scan-results.json findings.json --min-level info

Findings are derived entirely from existing OID-See risk reasons.
No independent scoring is performed.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from typing import Any, Dict, List

# Allow running from the repository root without installing as a package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from finding_builder import (
    CSV_FIELDNAMES,
    build_findings,
    findings_to_csv_rows,
    findings_to_markdown,
)

_SUPPORTED_EXTENSIONS = {".json", ".csv", ".md", ".markdown"}
_RISK_LEVELS = ("info", "low", "medium", "high", "critical")


def _detect_format(output_path: str) -> str:
    """Detect output format from file extension."""
    _, ext = os.path.splitext(output_path.lower())
    if ext == ".json":
        return "json"
    if ext == ".csv":
        return "csv"
    if ext in (".md", ".markdown"):
        return "markdown"
    return "json"


def _write_json(findings: List[Dict[str, Any]], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(findings, f, indent=2, ensure_ascii=False)
        f.write("\n")


def _write_csv(findings: List[Dict[str, Any]], output_path: str) -> None:
    rows = findings_to_csv_rows(findings)
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def _write_markdown(
    findings: List[Dict[str, Any]],
    output_path: str,
    export: Dict[str, Any],
) -> None:
    tenant = export.get("tenant") or {}
    tenant_name = tenant.get("displayName", "")
    generated_at = export.get("generatedAt", "")
    content = findings_to_markdown(findings, tenant_name, generated_at)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
        if not content.endswith("\n"):
            f.write("\n")


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Convert an OID-See graph export into analyst-ready findings.\n\n"
            "Output format is inferred from the file extension of OUTPUT_PATH.\n"
            "Supported formats: .json, .csv, .md / .markdown"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python generate_findings.py scan-results.json findings.json\n"
            "  python generate_findings.py scan-results.json findings.csv\n"
            "  python generate_findings.py scan-results.json findings.md\n"
            "  python generate_findings.py scan-results.json findings.json --min-level medium\n"
        ),
    )
    parser.add_argument("input", metavar="INPUT_PATH", help="Path to OID-See JSON export")
    parser.add_argument("output", metavar="OUTPUT_PATH", help="Output file path (.json / .csv / .md)")
    parser.add_argument(
        "--min-level",
        dest="min_level",
        default="low",
        choices=_RISK_LEVELS,
        help="Minimum risk level to include (default: low)",
    )
    parser.add_argument(
        "--format",
        dest="fmt",
        choices=("json", "csv", "markdown"),
        default=None,
        help="Override output format (default: inferred from extension)",
    )

    args = parser.parse_args(argv)

    # --- Load export ---
    if not os.path.isfile(args.input):
        print(f"error: input file not found: {args.input}", file=sys.stderr)
        return 2

    try:
        with open(args.input, "r", encoding="utf-8") as f:
            export: Dict[str, Any] = json.load(f)
    except json.JSONDecodeError as exc:
        print(f"error: failed to parse input JSON: {exc}", file=sys.stderr)
        return 2

    # --- Build findings ---
    findings = build_findings(export, min_risk_level=args.min_level)

    # --- Write output ---
    fmt = args.fmt or _detect_format(args.output)

    try:
        if fmt == "json":
            _write_json(findings, args.output)
        elif fmt == "csv":
            _write_csv(findings, args.output)
        else:
            _write_markdown(findings, args.output, export)
    except OSError as exc:
        print(f"error: could not write output file: {exc}", file=sys.stderr)
        return 2

    level_summary: Dict[str, int] = {}
    for f in findings:
        lvl = f.get("riskLevel", "info")
        level_summary[lvl] = level_summary.get(lvl, 0) + 1

    summary_parts = ", ".join(
        f"{count} {lvl}" for lvl, count in sorted(
            level_summary.items(),
            key=lambda item: -["critical", "high", "medium", "low", "info"].index(item[0])
            if item[0] in ["critical", "high", "medium", "low", "info"] else 99,
        )
    )
    print(
        f"Wrote {len(findings)} finding(s) to {args.output} "
        f"[format={fmt}, min_level={args.min_level}]"
        + (f" — {summary_parts}" if summary_parts else "")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
