#!/usr/bin/env python3
"""Tests for OID-See to BloodHound OpenGraph conversion."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bloodhound_opengraph import convert_oidsee_to_bloodhound_opengraph


def test_conversion_structure():
    sample = {
        "nodes": [
            {
                "id": "sp:test-app",
                "type": "ServicePrincipal",
                "displayName": "Test App",
                "properties": {"appId": "1234"},
                "risk": {"score": 90, "level": "critical", "reasons": [{"code": "X"}]},
            }
        ],
        "edges": [
            {
                "id": "e1",
                "from": "sp:test-app",
                "to": "res:graph",
                "type": "HAS_APP_ROLE",
                "properties": {"resourceId": "res:graph"},
            }
        ],
    }

    converted = convert_oidsee_to_bloodhound_opengraph(sample)

    assert "$schema" in converted
    assert "graph" in converted
    assert len(converted["graph"]["nodes"]) == 1
    assert len(converted["graph"]["edges"]) == 1

    node = converted["graph"]["nodes"][0]
    assert node["id"] == "sp:test-app"
    assert node["kinds"] == ["ServicePrincipal"]
    assert node["properties"]["displayname"] == "Test App"
    assert node["properties"]["risk_score"] == 90
    assert node["properties"]["risk_level"] == "critical"
    assert isinstance(node["properties"]["risk"], str)

    edge = converted["graph"]["edges"][0]
    assert edge["kind"] == "HAS_APP_ROLE"
    assert edge["start"]["match_by"] == "id"
    assert edge["end"]["match_by"] == "id"


def test_nested_properties_are_serialized():
    sample = {
        "nodes": [
            {
                "id": "n1",
                "type": "Application-Node",
                "displayName": "App Node",
                "properties": {
                    "nested": {"a": 1, "b": [1, 2]},
                    "mixed_list": ["a", 1],
                },
            }
        ],
        "edges": [
            {"from": "n1", "to": "n2", "type": "HAS-TYPE"},
        ],
    }

    converted = convert_oidsee_to_bloodhound_opengraph(sample)
    node_props = converted["graph"]["nodes"][0]["properties"]
    edge = converted["graph"]["edges"][0]

    assert converted["graph"]["nodes"][0]["kinds"] == ["Application_Node"]
    assert isinstance(node_props["nested"], str)
    assert isinstance(node_props["mixed_list"], str)
    assert edge["kind"] == "HAS_TYPE"


def main():
    tests = [test_conversion_structure, test_nested_properties_are_serialized]
    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
            print(f"✓ {test.__name__}")
        except Exception as exc:
            failed += 1
            print(f"✗ {test.__name__}: {exc}")

    print(f"\nResults: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
