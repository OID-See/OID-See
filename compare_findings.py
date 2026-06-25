#!/usr/bin/env python3
"""
OID-See Findings Comparison CLI

Compares two OID-See findings exports and produces a findings delta / drift
report showing what changed between scans.

Usage::

    python compare_findings.py previous-findings.json current-findings.json findings-delta.json
    python compare_findings.py previous-findings.json current-findings.json findings-delta.md
    python compare_findings.py previous-findings.json current-findings.json findings-delta.csv

Output format is inferred from the file extension of OUTPUT_PATH:
  .json      → JSON array of delta entries
  .md / .markdown → Markdown drift report
  .csv       → CSV table of delta entries

Use --format to override format detection.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
from typing import Any, Dict, List, Optional

# Allow running from the repository root without installing as a package
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from findings_diff import (
    DELTA_CSV_FIELDNAMES,
    compare_findings,
    delta_to_csv_rows,
    delta_to_markdown,
)

_SUPPORTED_EXTENSIONS = {".json", ".md", ".markdown", ".csv"}
_STATUS_SORT_ORDER = ["new", "regressed", "improved", "resolved", "changed", "unchanged"]


def _detect_format(output_path: str) -> str:
    """Detect output format from file extension."""
    _, ext = os.path.splitext(output_path.lower())
    if ext == ".json":
        return "json"
    if ext in (".md", ".markdown"):
        return "markdown"
    if ext == ".csv":
        return "csv"
    return "json"


def _load_findings(path: str) -> List[Dict[str, Any]]:
    """Load and return a findings list from a JSON file."""
    if not os.path.isfile(path):
        print(f"error: file not found: {path}", file=sys.stderr)
        sys.exit(2)
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        print(f"error: failed to parse {path}: {exc}", file=sys.stderr)
        sys.exit(2)
    if not isinstance(data, list):
        print(
            f"error: expected a JSON array of findings in {path}, got {type(data).__name__}",
            file=sys.stderr,
        )
        sys.exit(2)
    return data


def _write_json(delta: List[Dict[str, Any]], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(delta, f, indent=2, ensure_ascii=False)
        f.write("\n")


def _write_markdown(
    delta: List[Dict[str, Any]],
    output_path: str,
    previous_label: str,
    current_label: str,
) -> None:
    content = delta_to_markdown(delta, previous_label, current_label)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
        if not content.endswith("\n"):
            f.write("\n")


def _write_csv(delta: List[Dict[str, Any]], output_path: str) -> None:
    rows = delta_to_csv_rows(delta)
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=DELTA_CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Compare two OID-See findings exports and produce a delta / drift report.\n\n"
            "Output format is inferred from the file extension of OUTPUT_PATH.\n"
            "Supported formats: .json, .md / .markdown, .csv"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python compare_findings.py previous.json current.json delta.json\n"
            "  python compare_findings.py previous.json current.json delta.md\n"
            "  python compare_findings.py previous.json current.json delta.csv\n"
        ),
    )
    parser.add_argument(
        "previous",
        metavar="PREVIOUS_PATH",
        help="Path to the previous-scan findings JSON file",
    )
    parser.add_argument(
        "current",
        metavar="CURRENT_PATH",
        help="Path to the current-scan findings JSON file",
    )
    parser.add_argument(
        "output",
        metavar="OUTPUT_PATH",
        help="Output file path (.json / .md / .csv)",
    )
    parser.add_argument(
        "--format",
        dest="fmt",
        choices=("json", "markdown", "csv"),
        default=None,
        help="Override output format (default: inferred from extension)",
    )
    parser.add_argument(
        "--previous-label",
        dest="previous_label",
        default=None,
        help=(
            "Human-readable label for the previous scan (default: basename of PREVIOUS_PATH "
            "without extension)"
        ),
    )
    parser.add_argument(
        "--current-label",
        dest="current_label",
        default=None,
        help=(
            "Human-readable label for the current scan (default: basename of CURRENT_PATH "
            "without extension)"
        ),
    )

    args = parser.parse_args(argv)

    previous_label = args.previous_label or os.path.splitext(os.path.basename(args.previous))[0]
    current_label = args.current_label or os.path.splitext(os.path.basename(args.current))[0]

    # Load
    previous = _load_findings(args.previous)
    current = _load_findings(args.current)

    # Compare
    delta = compare_findings(previous, current)

    # Write
    fmt = args.fmt or _detect_format(args.output)

    try:
        if fmt == "json":
            _write_json(delta, args.output)
        elif fmt == "markdown":
            _write_markdown(delta, args.output, previous_label, current_label)
        elif fmt == "csv":
            _write_csv(delta, args.output)
        else:
            _write_json(delta, args.output)
    except OSError as exc:
        print(f"error: could not write output file: {exc}", file=sys.stderr)
        return 2

    # Summary counts
    by_status: Dict[str, int] = {}
    for entry in delta:
        s = entry.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1

    summary_parts = ", ".join(
        f"{by_status[s]} {s}"
        for s in _STATUS_SORT_ORDER
        if by_status.get(s, 0) > 0
    )
    print(
        f"Wrote {len(delta)} delta entry(ies) to {args.output} "
        f"[format={fmt}]"
        + (f" — {summary_parts}" if summary_parts else "")
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
