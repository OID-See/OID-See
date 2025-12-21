#!/usr/bin/env python3
"""
Tests for the MIXED_REPLYURL_DOMAINS heuristic.

This test suite validates the eTLD+1 extraction and mixed domain detection logic.
"""

import sys
from typing import Dict, Any, List, Optional

# Import the functions we're testing
from oidsee_scanner import extract_etldplus1, check_mixed_replyurl_domains, SCORING_CONFIG

# Load weights from configuration to avoid drift
MIXED_DOMAINS_CONFIG = SCORING_CONFIG.get("compute_risk_for_sp", {}).get("scoring_contributors", {}).get("MIXED_REPLYURL_DOMAINS", {})
IDENTITY_LAUNDERING_WEIGHT = MIXED_DOMAINS_CONFIG.get("identity_laundering_weight", 15)
ATTRIBUTION_AMBIGUITY_WEIGHT = MIXED_DOMAINS_CONFIG.get("attribution_ambiguity_weight", 5)


def test_extract_etldplus1():
    """Test eTLD+1 extraction from various URL formats."""
    print("\n=== Testing extract_etldplus1 ===")
    
    test_cases = [
        # (input_url, expected_output, description)
        ("https://app.contoso.com/callback", "contoso.com", "Simple subdomain"),
        ("http://subdomain.example.co.uk/path", "example.co.uk", "UK TLD"),
        ("https://login.microsoftonline.com/common", "microsoftonline.com", "Microsoft domain"),
        ("https://localhost:5000/callback", None, "Localhost"),
        ("https://127.0.0.1:8080", None, "IP address"),
        ("https://example.com", "example.com", "No subdomain"),
        ("https://a.b.c.example.com/path", "example.com", "Multiple subdomains"),
        ("", None, "Empty string"),
        (None, None, "None value"),
        ("not-a-url", None, "Invalid URL"),
        ("https://app.github.io/callback", "github.io", "GitHub Pages domain"),
        ("https://myapp.azurewebsites.net", "azurewebsites.net", "Azure Web Apps"),
    ]
    
    passed = 0
    failed = 0
    
    for url, expected, description in test_cases:
        result = extract_etldplus1(url)
        if result == expected:
            print(f"✓ PASS: {description}")
            print(f"  Input: {url!r}")
            print(f"  Expected: {expected!r}, Got: {result!r}")
            passed += 1
        else:
            print(f"✗ FAIL: {description}")
            print(f"  Input: {url!r}")
            print(f"  Expected: {expected!r}, Got: {result!r}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_check_mixed_replyurl_domains():
    """Test the mixed domain detection logic."""
    print("\n=== Testing check_mixed_replyurl_domains ===")
    
    test_cases = [
        {
            "name": "Single domain - no issue",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "https://login.contoso.com/auth",
                "https://api.contoso.com/oauth"
            ],
            "homepage": "https://www.contoso.com",
            "info": {"marketingUrl": "https://contoso.com"},
            "expected": {
                "has_mixed_domains": False,
                "signal_type": None,
            }
        },
        {
            "name": "Multiple domains - attribution ambiguity (all aligned)",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "https://api.contoso.net/oauth"
            ],
            "homepage": "https://www.contoso.com",
            "info": {
                "marketingUrl": "https://contoso.net",
                "privacyStatementUrl": "https://contoso.com/privacy"
            },
            "expected": {
                "has_mixed_domains": True,
                "signal_type": "attribution_ambiguity",
                "domains_count": 2,
            }
        },
        {
            "name": "Multiple domains - identity laundering (not aligned)",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "https://malicious.example.com/steal"
            ],
            "homepage": "https://www.contoso.com",
            "info": {"marketingUrl": "https://contoso.com"},
            "expected": {
                "has_mixed_domains": True,
                "signal_type": "identity_laundering",
                "domains_count": 2,
                "non_aligned_count": 1,
            }
        },
        {
            "name": "Multiple domains - no reference domains",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "https://api.fabrikam.com/oauth"
            ],
            "homepage": None,
            "info": {},
            "expected": {
                "has_mixed_domains": True,
                "signal_type": "identity_laundering",
                "domains_count": 2,
                "non_aligned_count": 2,
            }
        },
        {
            "name": "Empty reply URLs",
            "reply_urls": [],
            "homepage": "https://www.contoso.com",
            "info": {"marketingUrl": "https://contoso.com"},
            "expected": {
                "has_mixed_domains": False,
                "signal_type": None,
            }
        },
        {
            "name": "Localhost URLs ignored",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "http://localhost:5000/callback"
            ],
            "homepage": "https://www.contoso.com",
            "info": {},
            "expected": {
                "has_mixed_domains": False,
                "signal_type": None,
            }
        },
        {
            "name": "Three domains - mixed alignment",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "https://api.contoso.net/oauth",
                "https://evil.hacker.com/phish"
            ],
            "homepage": "https://www.contoso.com",
            "info": {
                "marketingUrl": "https://contoso.net",
            },
            "expected": {
                "has_mixed_domains": True,
                "signal_type": "identity_laundering",
                "domains_count": 3,
                "non_aligned_count": 1,
            }
        },
        {
            "name": "Azure websites and custom domain",
            "reply_urls": [
                "https://myapp.azurewebsites.net/callback",
                "https://app.contoso.com/callback"
            ],
            "homepage": "https://www.contoso.com",
            "info": {},
            "expected": {
                "has_mixed_domains": True,
                "signal_type": "identity_laundering",
                "domains_count": 2,
                "non_aligned_count": 1,
            }
        },
    ]
    
    passed = 0
    failed = 0
    
    for test_case in test_cases:
        name = test_case["name"]
        reply_urls = test_case["reply_urls"]
        homepage = test_case["homepage"]
        info = test_case["info"]
        expected = test_case["expected"]
        
        result = check_mixed_replyurl_domains(reply_urls, homepage, info)
        
        # Validate expected fields
        checks_passed = True
        
        if result["has_mixed_domains"] != expected["has_mixed_domains"]:
            print(f"✗ FAIL: {name}")
            print(f"  has_mixed_domains: expected {expected['has_mixed_domains']}, got {result['has_mixed_domains']}")
            checks_passed = False
        
        if result["signal_type"] != expected["signal_type"]:
            print(f"✗ FAIL: {name}")
            print(f"  signal_type: expected {expected['signal_type']}, got {result['signal_type']}")
            checks_passed = False
        
        if "domains_count" in expected and len(result["domains"]) != expected["domains_count"]:
            print(f"✗ FAIL: {name}")
            print(f"  domains_count: expected {expected['domains_count']}, got {len(result['domains'])}")
            print(f"  domains: {result['domains']}")
            checks_passed = False
        
        if "non_aligned_count" in expected and len(result["non_aligned_domains"]) != expected["non_aligned_count"]:
            print(f"✗ FAIL: {name}")
            print(f"  non_aligned_count: expected {expected['non_aligned_count']}, got {len(result['non_aligned_domains'])}")
            print(f"  non_aligned_domains: {result['non_aligned_domains']}")
            checks_passed = False
        
        if checks_passed:
            print(f"✓ PASS: {name}")
            passed += 1
        else:
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_integration_with_compute_risk():
    """Test that the heuristic integrates correctly with risk computation."""
    print("\n=== Testing Integration with compute_risk_for_sp ===")
    
    # We'll create minimal test cases to ensure the heuristic is called
    # and properly contributes to the risk score
    
    # This is more of a smoke test - we won't import compute_risk_for_sp
    # to avoid complex dependencies, but we verify the logic is sound
    
    test_cases = [
        {
            "name": "Identity laundering adds 15 points",
            "sp": {
                "replyUrls": [
                    "https://app.contoso.com/callback",
                    "https://evil.com/steal"
                ],
                "homepage": "https://contoso.com",
                "info": {}
            },
            "expected_signal": "identity_laundering",
            "expected_weight": 15,
        },
        {
            "name": "Attribution ambiguity adds 5 points",
            "sp": {
                "replyUrls": [
                    "https://app.contoso.com/callback",
                    "https://api.contoso.net/oauth"
                ],
                "homepage": "https://contoso.com",
                "info": {"marketingUrl": "https://contoso.net"}
            },
            "expected_signal": "attribution_ambiguity",
            "expected_weight": 5,
        },
        {
            "name": "No mixed domains - no contribution",
            "sp": {
                "replyUrls": [
                    "https://app.contoso.com/callback",
                    "https://login.contoso.com/auth"
                ],
                "homepage": "https://contoso.com",
                "info": {}
            },
            "expected_signal": None,
            "expected_weight": 0,
        },
    ]
    
    passed = 0
    failed = 0
    
    for test_case in test_cases:
        name = test_case["name"]
        sp = test_case["sp"]
        expected_signal = test_case["expected_signal"]
        expected_weight = test_case["expected_weight"]
        
        reply_urls = sp.get("replyUrls", [])
        homepage = sp.get("homepage")
        info = sp.get("info", {})
        
        result = check_mixed_replyurl_domains(reply_urls, homepage, info)
        
        # Simulate what compute_risk_for_sp would do, using config values
        actual_weight = 0
        actual_signal = None
        
        if result.get("has_mixed_domains") and result.get("signal_type"):
            signal_type = result["signal_type"]
            actual_signal = signal_type
            
            if signal_type == "identity_laundering":
                actual_weight = IDENTITY_LAUNDERING_WEIGHT
            elif signal_type == "attribution_ambiguity":
                actual_weight = ATTRIBUTION_AMBIGUITY_WEIGHT
        
        if actual_signal == expected_signal and actual_weight == expected_weight:
            print(f"✓ PASS: {name}")
            print(f"  Signal: {actual_signal}, Weight: {actual_weight}")
            passed += 1
        else:
            print(f"✗ FAIL: {name}")
            print(f"  Expected signal: {expected_signal}, weight: {expected_weight}")
            print(f"  Got signal: {actual_signal}, weight: {actual_weight}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def main():
    """Run all tests."""
    print("=" * 60)
    print("MIXED_REPLYURL_DOMAINS Heuristic Test Suite")
    print("=" * 60)
    
    all_passed = True
    
    # Run all test functions
    all_passed = all_passed and test_extract_etldplus1()
    all_passed = all_passed and test_check_mixed_replyurl_domains()
    all_passed = all_passed and test_integration_with_compute_risk()
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED")
        print("=" * 60)
        return 0
    else:
        print("✗ SOME TESTS FAILED")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
