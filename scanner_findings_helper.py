#!/usr/bin/env python3
"""
Scanner findings helper functions.

Provides thin wrappers around finding_builder and findings_diff renderers
so that the scanner workflow can produce findings and delta reports without
duplicating rendering logic.

These helpers are isolated in this module so that they can be imported and
tested independently of the heavier azure / tldextract dependencies that
oidsee_scanner.py requires at module level.
"""

from __future__ import annotations

import csv as _csv
import json
import os
from typing import Any, Dict, List


def detect_format(output_path: str) -> str:
    """Infer output format from a file extension.

    Returns one of ``"json"``, ``"csv"``, or ``"markdown"``.
    Falls back to ``"json"`` for unrecognised extensions.
    """
    _, ext = os.path.splitext(output_path.lower())
    if ext == ".json":
        return "json"
    if ext == ".csv":
        return "csv"
    if ext in (".md", ".markdown"):
        return "markdown"
    return "json"


def write_findings(
    findings: List[Dict[str, Any]],
    path: str,
    fmt: str,
    export: Dict[str, Any],
) -> None:
    """Write *findings* to *path* in the requested *fmt*.

    Delegates to the shared renderers in :mod:`finding_builder` rather than
    duplicating any rendering logic here.

    Args:
        findings: List of finding dicts as returned by
            :func:`finding_builder.build_findings`.
        path: Destination file path.
        fmt: One of ``"json"``, ``"csv"``, or ``"markdown"``.
        export: The original OID-See graph export (used for tenant metadata in
            Markdown output).

    Raises:
        OSError: If the output file cannot be written.
    """
    from finding_builder import CSV_FIELDNAMES, findings_to_csv_rows, findings_to_markdown

    if fmt == "json":
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(findings, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    elif fmt == "csv":
        rows = findings_to_csv_rows(findings)
        with open(path, "w", encoding="utf-8", newline="") as fh:
            writer = _csv.DictWriter(fh, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
    else:
        tenant = export.get("tenant") or {}
        content = findings_to_markdown(
            findings,
            tenant.get("displayName", ""),
            export.get("generatedAt", ""),
        )
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
            if not content.endswith("\n"):
                fh.write("\n")


def write_delta(
    delta: List[Dict[str, Any]],
    path: str,
    fmt: str,
    previous_label: str,
    current_label: str,
) -> None:
    """Write *delta* to *path* in the requested *fmt*.

    Delegates to the shared renderers in :mod:`findings_diff` rather than
    duplicating any rendering logic here.

    Args:
        delta: List of delta entry dicts as returned by
            :func:`findings_diff.compare_findings`.
        path: Destination file path.
        fmt: One of ``"json"``, ``"csv"``, or ``"markdown"``.
        previous_label: Human-readable label for the previous scan (used in
            Markdown output).
        current_label: Human-readable label for the current scan (used in
            Markdown output).

    Raises:
        OSError: If the output file cannot be written.
    """
    from findings_diff import DELTA_CSV_FIELDNAMES, delta_to_csv_rows, delta_to_markdown

    if fmt == "json":
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(delta, fh, indent=2, ensure_ascii=False)
            fh.write("\n")
    elif fmt == "csv":
        rows = delta_to_csv_rows(delta)
        with open(path, "w", encoding="utf-8", newline="") as fh:
            writer = _csv.DictWriter(fh, fieldnames=DELTA_CSV_FIELDNAMES, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
    else:
        content = delta_to_markdown(delta, previous_label, current_label)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
            if not content.endswith("\n"):
                fh.write("\n")
