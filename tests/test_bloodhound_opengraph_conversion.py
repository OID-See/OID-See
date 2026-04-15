#!/usr/bin/env python3
"""Tests for BloodHound OpenGraph conversion support."""

import os
import sys
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from oidsee_scanner import (
    OUTPUT_FORMAT_BLOODHOUND_OPENGRAPH,
    OUTPUT_FORMAT_OIDSEE,
    convert_oidsee_export_to_bloodhound_opengraph,
    parse_args,
)


def test_conversion_structure():
    print("\n=== Testing OID-See → BloodHound OpenGraph conversion ===")

    source = {
        "format": {"name": "oidsee-graph", "version": "1.1"},
        "nodes": [
            {
                "id": "sp:test-app",
                "type": "ServicePrincipal",
                "displayName": "Test App",
                "properties": {
                    "score": 95,
                    "active": True,
                    "details": {"nested": "value"},
                    "tags": ["prod", 123, {"x": 1}],
                },
            },
            {
                "id": "user:alice",
                "type": "User",
                "displayName": "Alice",
                "properties": {},
            },
        ],
        "edges": [
            {
                "id": "e-own-test-app-alice",
                "from": "sp:test-app",
                "to": "user:alice",
                "type": "OWNS",
                "properties": {"weight": 10, "extra": {"k": "v"}},
            }
        ],
    }

    converted = convert_oidsee_export_to_bloodhound_opengraph(source)
    graph = converted.get("graph", {})

    assert isinstance(graph.get("nodes"), list), "Expected graph.nodes array"
    assert isinstance(graph.get("edges"), list), "Expected graph.edges array"
    assert graph.get("metadata", {}).get("source_kind") == "OIDSee", "Expected source_kind OIDSee"

    first_node = graph["nodes"][0]
    assert first_node["id"] == "sp:test-app", "Expected original node id"
    assert first_node["kinds"] == ["ServicePrincipal"], "Expected node kind from OID-See type"
    assert first_node["properties"]["displayName"] == "Test App", "Expected displayName preserved"
    assert isinstance(first_node["properties"]["details"], str), "Nested objects must be stringified"
    assert all(isinstance(v, str) for v in first_node["properties"]["tags"]), "Mixed arrays must be string arrays"

    first_edge = graph["edges"][0]
    assert first_edge["kind"] == "OWNS", "Expected edge kind from OID-See type"
    assert first_edge["start"]["match_by"] == "id", "Expected id-based start endpoint"
    assert first_edge["start"]["value"] == "sp:test-app", "Expected source id"
    assert first_edge["end"]["value"] == "user:alice", "Expected destination id"
    assert first_edge["properties"]["oidseeEdgeId"] == "e-own-test-app-alice", "Expected OID-See edge id copied"

    print("✓ PASS: conversion output shape is valid for OpenGraph ingest")
    return True


def test_cli_output_format_arg():
    print("\n=== Testing scanner --output-format argument ===")

    with patch.object(sys, "argv", ["oidsee_scanner.py", "--tenant-id", "t1"]):
        args = parse_args()
        assert args.output_format == OUTPUT_FORMAT_OIDSEE, "Default format should be oidsee-graph"

    with patch.object(
        sys,
        "argv",
        ["oidsee_scanner.py", "--tenant-id", "t1", "--output-format", OUTPUT_FORMAT_BLOODHOUND_OPENGRAPH],
    ):
        args = parse_args()
        assert args.output_format == OUTPUT_FORMAT_BLOODHOUND_OPENGRAPH, "Expected bloodhound-opengraph"

    print("✓ PASS: scanner output format argument parsed correctly")
    return True


def main() -> int:
    print("=" * 60)
    print("BloodHound OpenGraph Conversion Tests")
    print("=" * 60)

    ok = True
    ok &= test_conversion_structure()
    ok &= test_cli_output_format_arg()

    print("\n" + "=" * 60)
    if ok:
        print("✓ ALL TESTS PASSED")
        return 0
    print("✗ SOME TESTS FAILED")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
