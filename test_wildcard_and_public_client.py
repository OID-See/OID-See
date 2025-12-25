#!/usr/bin/env python3
"""
Tests for new scanner features:
- Wildcard URL detection in reply URLs
- Public client and implicit flow indicators
- Updated scoring logic
"""

import sys
from typing import Dict, Any

# Import the functions we're testing
from oidsee_scanner import (
    analyze_reply_urls,
    analyze_public_client_indicators,
    SCORING_CONFIG
)


def test_wildcard_url_detection():
    """Test wildcard URL detection in reply URLs."""
    print("\n=== Testing Wildcard URL Detection ===")
    
    test_cases = [
        {
            "name": "No wildcard URLs",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "https://api.contoso.com/oauth",
            ],
            "expected_wildcards": [],
        },
        {
            "name": "Single wildcard URL",
            "reply_urls": [
                "https://*.contoso.com/callback",
                "https://app.contoso.com/oauth",
            ],
            "expected_wildcards": ["https://*.contoso.com/callback"],
        },
        {
            "name": "Multiple wildcard URLs",
            "reply_urls": [
                "https://*.contoso.com/callback",
                "https://*.fabrikam.com/oauth",
                "https://app.contoso.com/login",
            ],
            "expected_wildcards": [
                "https://*.contoso.com/callback",
                "https://*.fabrikam.com/oauth",
            ],
        },
        {
            "name": "Wildcard in path only (not flagged)",
            "reply_urls": [
                "https://app.contoso.com/*/callback",
            ],
            "expected_wildcards": ["https://app.contoso.com/*/callback"],  # Still flagged as it contains '*'
        },
    ]
    
    passed = 0
    failed = 0
    
    for tc in test_cases:
        result = analyze_reply_urls(tc["reply_urls"])
        wildcard_urls = result.get("wildcard_urls", [])
        
        if wildcard_urls == tc["expected_wildcards"]:
            print(f"✓ PASS: {tc['name']}")
            passed += 1
        else:
            print(f"✗ FAIL: {tc['name']}")
            print(f"  Expected: {tc['expected_wildcards']}")
            print(f"  Got: {wildcard_urls}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_public_client_indicators():
    """Test public client and implicit flow indicator analysis."""
    print("\n=== Testing Public Client Indicators ===")
    
    test_cases = [
        {
            "name": "No app object",
            "app_obj": None,
            "expected": {
                "is_public_client": None,
                "is_implicit_flow": None,
                "is_spa": None,
                "risk_indicators": [],
            }
        },
        {
            "name": "Public client with redirect URIs",
            "app_obj": {
                "publicClient": {
                    "redirectUris": ["ms-app://callback"]
                },
                "web": {},
                "spa": {}
            },
            "expected": {
                "is_public_client": True,
                "is_implicit_flow": False,
                "is_spa": False,
                "risk_indicators": ["PUBLIC_CLIENT_FLOWS_ENABLED"],
            }
        },
        {
            "name": "Implicit flow enabled (access token)",
            "app_obj": {
                "publicClient": {},
                "web": {
                    "implicitGrantSettings": {
                        "enableAccessTokenIssuance": True,
                        "enableIdTokenIssuance": False
                    }
                },
                "spa": {}
            },
            "expected": {
                "is_public_client": False,
                "is_implicit_flow": True,
                "is_spa": False,
                "risk_indicators": ["IMPLICIT_FLOW_ENABLED", "IMPLICIT_ACCESS_TOKEN_ISSUANCE"],
            }
        },
        {
            "name": "Implicit flow enabled (ID token)",
            "app_obj": {
                "publicClient": {},
                "web": {
                    "implicitGrantSettings": {
                        "enableAccessTokenIssuance": False,
                        "enableIdTokenIssuance": True
                    }
                },
                "spa": {}
            },
            "expected": {
                "is_public_client": False,
                "is_implicit_flow": True,
                "is_spa": False,
                "risk_indicators": ["IMPLICIT_FLOW_ENABLED", "IMPLICIT_ID_TOKEN_ISSUANCE"],
            }
        },
        {
            "name": "SPA with redirect URIs",
            "app_obj": {
                "publicClient": {},
                "web": {},
                "spa": {
                    "redirectUris": ["https://app.contoso.com/callback"]
                }
            },
            "expected": {
                "is_public_client": False,
                "is_implicit_flow": False,
                "is_spa": True,
                "risk_indicators": ["SPA_REDIRECT_URIS_CONFIGURED"],
            }
        },
        {
            "name": "Public client + implicit flow + SPA",
            "app_obj": {
                "publicClient": {
                    "redirectUris": ["ms-app://callback"]
                },
                "web": {
                    "implicitGrantSettings": {
                        "enableAccessTokenIssuance": True,
                        "enableIdTokenIssuance": True
                    }
                },
                "spa": {
                    "redirectUris": ["https://app.contoso.com/callback"]
                }
            },
            "expected": {
                "is_public_client": True,
                "is_implicit_flow": True,
                "is_spa": True,
                "risk_indicators": [
                    "PUBLIC_CLIENT_FLOWS_ENABLED",
                    "IMPLICIT_FLOW_ENABLED",
                    "IMPLICIT_ACCESS_TOKEN_ISSUANCE",
                    "IMPLICIT_ID_TOKEN_ISSUANCE",
                    "SPA_REDIRECT_URIS_CONFIGURED"
                ],
            }
        },
    ]
    
    passed = 0
    failed = 0
    
    for tc in test_cases:
        result = analyze_public_client_indicators(tc["app_obj"])
        
        # Check each field
        checks_passed = True
        for key in ["is_public_client", "is_implicit_flow", "is_spa"]:
            if result.get(key) != tc["expected"].get(key):
                checks_passed = False
                print(f"✗ FAIL: {tc['name']} - {key} mismatch")
                print(f"  Expected {key}: {tc['expected'].get(key)}")
                print(f"  Got {key}: {result.get(key)}")
        
        # Check risk_indicators
        result_indicators = result.get("risk_indicators", [])
        expected_indicators = tc["expected"].get("risk_indicators", [])
        if set(result_indicators) != set(expected_indicators):
            checks_passed = False
            print(f"✗ FAIL: {tc['name']} - risk_indicators mismatch")
            print(f"  Expected: {expected_indicators}")
            print(f"  Got: {result_indicators}")
        
        if checks_passed:
            print(f"✓ PASS: {tc['name']}")
            passed += 1
        else:
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_scoring_config_updates():
    """Test that scoring configuration includes new rules."""
    print("\n=== Testing Scoring Configuration Updates ===")
    
    config = SCORING_CONFIG.get("compute_risk_for_sp", {})
    contributors = config.get("scoring_contributors", {})
    
    passed = 0
    failed = 0
    
    # Check REPLY_URL_ANOMALIES has wildcard_weight
    reply_url_config = contributors.get("REPLY_URL_ANOMALIES", {})
    if "wildcard_weight" in reply_url_config:
        print("✓ PASS: REPLY_URL_ANOMALIES includes wildcard_weight")
        passed += 1
    else:
        print("✗ FAIL: REPLY_URL_ANOMALIES missing wildcard_weight")
        failed += 1
    
    # Check PUBLIC_CLIENT_FLOW_RISK exists
    if "PUBLIC_CLIENT_FLOW_RISK" in contributors:
        print("✓ PASS: PUBLIC_CLIENT_FLOW_RISK rule exists")
        passed += 1
        
        public_client_config = contributors.get("PUBLIC_CLIENT_FLOW_RISK", {})
        if "public_client_weight" in public_client_config:
            print("✓ PASS: PUBLIC_CLIENT_FLOW_RISK includes public_client_weight")
            passed += 1
        else:
            print("✗ FAIL: PUBLIC_CLIENT_FLOW_RISK missing public_client_weight")
            failed += 1
        
        if "implicit_flow_weight" in public_client_config:
            print("✓ PASS: PUBLIC_CLIENT_FLOW_RISK includes implicit_flow_weight")
            passed += 1
        else:
            print("✗ FAIL: PUBLIC_CLIENT_FLOW_RISK missing implicit_flow_weight")
            failed += 1
    else:
        print("✗ FAIL: PUBLIC_CLIENT_FLOW_RISK rule missing")
        failed += 1
    
    # Check ASSIGNED_TO has thresholds
    assigned_to_config = contributors.get("ASSIGNED_TO", {})
    if "reachable_users_thresholds" in assigned_to_config:
        print("✓ PASS: ASSIGNED_TO includes reachable_users_thresholds")
        passed += 1
    else:
        print("✗ FAIL: ASSIGNED_TO missing reachable_users_thresholds")
        failed += 1
    
    # Check OFFLINE_ACCESS_PERSISTENCE exists
    if "OFFLINE_ACCESS_PERSISTENCE" in contributors:
        print("✓ PASS: OFFLINE_ACCESS_PERSISTENCE rule exists")
        passed += 1
    else:
        print("✗ FAIL: OFFLINE_ACCESS_PERSISTENCE rule missing")
        failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def main():
    """Run all tests."""
    print("=" * 60)
    print("Wildcard URL and Public Client Tests")
    print("=" * 60)
    
    all_passed = True
    
    all_passed &= test_wildcard_url_detection()
    all_passed &= test_public_client_indicators()
    all_passed &= test_scoring_config_updates()
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
