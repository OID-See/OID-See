#!/usr/bin/env python3
"""
Schema validation test for new fields.
Tests that the schema properly validates exports with new fields.
"""

import json
import sys
from jsonschema import validate, ValidationError


def load_schema():
    """Load the JSON schema."""
    with open("schemas/oidsee-graph-export.schema.json", "r") as f:
        return json.load(f)


def test_schema_validation():
    """Test schema validation with new fields."""
    print("\n=== Testing Schema Validation ===")
    
    schema = load_schema()
    
    # Create a minimal valid export with new fields
    test_export = {
        "format": {
            "name": "oidsee-graph",
            "version": "1.0"
        },
        "generatedAt": "2025-12-25T00:00:00Z",
        "tenant": {
            "tenantId": "00000000-0000-0000-0000-000000000000"
        },
        "nodes": [
            {
                "id": "sp1",
                "type": "ServicePrincipal",
                "displayName": "Test App",
                "properties": {
                    "servicePrincipalId": "00000000-0000-0000-0000-000000000001",
                    "appId": "00000000-0000-0000-0000-000000000002",
                    "replyUrls": [
                        "https://app.contoso.com/callback",
                        "https://*.contoso.com/wildcard"
                    ],
                    "replyUrlAnalysis": {
                        "total_urls": 2,
                        "normalized_domains": ["contoso.com"],
                        "non_https_urls": [],
                        "ip_literal_urls": [],
                        "localhost_urls": [],
                        "punycode_urls": [],
                        "wildcard_urls": ["https://*.contoso.com/wildcard"],
                        "schemes": ["https"]
                    },
                    "replyUrlEnrichment": None,
                    "replyUrlProvenance": {
                        "source": "microsoft_graph",
                        "enrichment_enabled": False
                    },
                    "publicClientIndicators": {
                        "is_public_client": False,
                        "is_implicit_flow": True,
                        "is_spa": False,
                        "fallback_to_default_client": False,
                        "risk_indicators": ["IMPLICIT_FLOW_ENABLED", "IMPLICIT_ACCESS_TOKEN_ISSUANCE"]
                    }
                }
            }
        ],
        "edges": [
            {
                "id": "e1",
                "type": "HAS_SCOPES",
                "from": "sp1",
                "to": "res1",
                "properties": {
                    "scopes": ["User.Read"],
                    "permissionType": "delegated",
                    "classification": "regular",
                    "resourceAppId": "00000003-0000-0000-c000-000000000000",
                    "resourceDisplayName": "Microsoft Graph"
                }
            }
        ]
    }
    
    # Test validation
    try:
        validate(instance=test_export, schema=schema)
        print("✓ PASS: Schema validation successful with new fields")
        return True
    except ValidationError as e:
        print(f"✗ FAIL: Schema validation failed")
        print(f"  Error: {e.message}")
        print(f"  Path: {list(e.path)}")
        return False


def test_schema_rejects_resolvedScopes():
    """Test that resolvedScopes is not required (and can be omitted)."""
    print("\n=== Testing resolvedScopes Removal ===")
    
    schema = load_schema()
    
    # Create an export WITHOUT resolvedScopes in edges
    test_export = {
        "format": {
            "name": "oidsee-graph",
            "version": "1.0"
        },
        "generatedAt": "2025-12-25T00:00:00Z",
        "tenant": {
            "tenantId": "00000000-0000-0000-0000-000000000000"
        },
        "nodes": [
            {
                "id": "sp1",
                "type": "ServicePrincipal",
                "displayName": "Test App",
                "properties": {}
            }
        ],
        "edges": [
            {
                "id": "e1",
                "type": "HAS_SCOPES",
                "from": "sp1",
                "to": "res1",
                "properties": {
                    "scopes": ["User.Read"],
                    "permissionType": "delegated"
                }
            }
        ]
    }
    
    # Test validation (should pass without resolvedScopes)
    try:
        validate(instance=test_export, schema=schema)
        print("✓ PASS: Schema validates edges without resolvedScopes")
        return True
    except ValidationError as e:
        print(f"✗ FAIL: Schema validation failed without resolvedScopes")
        print(f"  Error: {e.message}")
        return False


def main():
    """Run all schema validation tests."""
    print("=" * 60)
    print("Schema Validation Tests")
    print("=" * 60)
    
    all_passed = True
    all_passed &= test_schema_validation()
    all_passed &= test_schema_rejects_resolvedScopes()
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL SCHEMA TESTS PASSED")
    else:
        print("✗ SOME SCHEMA TESTS FAILED")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
