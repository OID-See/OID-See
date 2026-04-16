#!/usr/bin/env python3
"""Convert an existing OID-See scanner JSON export to BloodHound OpenGraph format."""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict

from bloodhound_opengraph import convert_oidsee_to_bloodhound_opengraph


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert OID-See JSON export to BloodHound OpenGraph JSON"
    )
    parser.add_argument("input", help="Path to OID-See JSON export")
    parser.add_argument("output", help="Path for BloodHound OpenGraph JSON output")
    parser.add_argument(
        "--source-kind",
        default="OIDSee",
        help="OpenGraph metadata.source_kind value (default: OIDSee)",
    )
    return parser.parse_args()


def _load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("Input JSON must be an object")
    return data


def main() -> int:
    args = parse_args()

    if not os.path.exists(args.input):
        print(f"Error: input file does not exist: {args.input}", file=sys.stderr)
        return 1

    try:
        oidsee_export = _load_json(args.input)
        opengraph = convert_oidsee_to_bloodhound_opengraph(oidsee_export, source_kind=args.source_kind)
    except Exception as exc:
        print(f"Error: conversion failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(opengraph, f, indent=2, sort_keys=False)

    node_count = len(opengraph.get("graph", {}).get("nodes", []))
    edge_count = len(opengraph.get("graph", {}).get("edges", []))
    print(f"✓ Wrote {args.output} ({node_count} nodes, {edge_count} edges)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
