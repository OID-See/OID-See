#!/usr/bin/env python3
"""Convert OID-See scanner JSON export to BloodHound OpenGraph payload format."""

import argparse
import json
import sys
from typing import Any, Dict

from oidsee_scanner import convert_oidsee_export_to_bloodhound_opengraph


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert OID-See scanner JSON export to BloodHound OpenGraph format"
    )
    parser.add_argument("input", help="Path to OID-See scanner JSON export")
    parser.add_argument("output", help="Path to write BloodHound OpenGraph JSON")
    return parser.parse_args()


def load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        raise ValueError("Input file must contain a JSON object")
    if "nodes" not in data or "edges" not in data:
        raise ValueError("Input file does not look like an OID-See export (missing nodes/edges)")
    return data


def main() -> int:
    args = parse_args()
    try:
        source = load_json(args.input)
        converted = convert_oidsee_export_to_bloodhound_opengraph(source)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(converted, f, indent=2, sort_keys=False)
        print(f"✓ Wrote {args.output}")
        return 0
    except Exception as exc:
        print(f"✗ Conversion failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
