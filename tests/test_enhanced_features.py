#!/usr/bin/env python3
"""
Tests for enhanced scanner features:
- Credential analysis
- Reply URL analysis
- Permission resolution
- Trust signals
"""

import sys
import os
import datetime as dt
from typing import Dict, Any, List

# Add parent directory to path to import oidsee_scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the functions we're testing
from oidsee_scanner import (
    analyze_credentials,
    analyze_reply_urls,
    resolve_permission_details,
    SCORING_CONFIG
)


def test_analyze_credentials():
    """Test credential hygiene analysis."""
    print("\n=== Testing analyze_credentials ===")
    
    now = dt.datetime.now(dt.timezone.utc)
    past = (now - dt.timedelta(days=400)).isoformat()
    recent = (now - dt.timedelta(days=30)).isoformat()
    future = (now + dt.timedelta(days=100)).isoformat()
    expired = (now - dt.timedelta(days=10)).isoformat()
    expiring_soon = (now + dt.timedelta(days=20)).isoformat()
    
    test_cases = [
        {
            "name": "No credentials",
            "password_creds": [],
            "key_creds": [],
            "federated_creds": [],
            "expected": {
                "total_password_credentials": 0,
                "total_key_credentials": 0,
                "total_federated_credentials": 0,
                "long_lived_secrets_count": 0,
                "expired_but_present_count": 0,
            }
        },
        {
            "name": "Long-lived secret (>180 days)",
            "password_creds": [
                {
                    "keyId": "key-1",
                    "displayName": "Long-lived secret",
                    "startDateTime": past,
                    "endDateTime": future,
                }
            ],
            "key_creds": [],
            "federated_creds": [],
            "expected": {
                "total_password_credentials": 1,
                "active_password_credentials": 1,
                "long_lived_secrets_count": 1,
            }
        },
        {
            "name": "Expired credential still present",
            "password_creds": [
                {
                    "keyId": "key-2",
                    "displayName": "Expired secret",
                    "startDateTime": past,
                    "endDateTime": expired,
                }
            ],
            "key_creds": [],
            "federated_creds": [],
            "expected": {
                "total_password_credentials": 1,
                "expired_password_credentials": 1,
                "expired_but_present_count": 1,
            }
        },
        {
            "name": "Certificate expiring soon",
            "password_creds": [],
            "key_creds": [
                {
                    "keyId": "cert-1",
                    "displayName": "Expiring cert",
                    "startDateTime": recent,
                    "endDateTime": expiring_soon,
                }
            ],
            "federated_creds": [],
            "expected": {
                "total_key_credentials": 1,
                "active_key_credentials": 1,
                "certificate_rollover_issues_count": 1,
            }
        },
    ]
    
    passed = 0
    failed = 0
    
    for test_case in test_cases:
        name = test_case["name"]
        result = analyze_credentials(
            password_creds=test_case["password_creds"],
            key_creds=test_case["key_creds"],
            federated_creds=test_case.get("federated_creds"),
        )
        
        checks_passed = True
        expected = test_case["expected"]
        
        # Check expected fields
        for key, expected_value in expected.items():
            if key.endswith("_count"):
                # Count fields - need to map to actual result keys
                base_key = key.replace("_count", "")
                # Try exact match and common plurals
                possible_keys = [base_key, base_key + "s"]
                actual_value = None
                for possible_key in possible_keys:
                    if possible_key in result and isinstance(result[possible_key], list):
                        actual_value = len(result[possible_key])
                        break
                if actual_value is None:
                    actual_value = 0
            else:
                actual_value = result.get(key)
            
            if actual_value != expected_value:
                print(f"✗ FAIL: {name}")
                print(f"  {key}: expected {expected_value}, got {actual_value}")
                checks_passed = False
                break
        
        if checks_passed:
            print(f"✓ PASS: {name}")
            passed += 1
        else:
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_analyze_reply_urls():
    """Test reply URL analysis."""
    print("\n=== Testing analyze_reply_urls ===")
    
    test_cases = [
        {
            "name": "HTTPS URLs only",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "https://login.contoso.com/auth",
            ],
            "expected": {
                "total_urls": 2,
                "non_https_count": 0,
                "ip_literal_count": 0,
                "localhost_count": 0,
                "punycode_count": 0,
                "normalized_domains_count": 1,
            }
        },
        {
            "name": "Non-HTTPS URL",
            "reply_urls": [
                "http://insecure.example.com/callback",
            ],
            "expected": {
                "total_urls": 1,
                "non_https_count": 1,
                "ip_literal_count": 0,
            }
        },
        {
            "name": "IP literal",
            "reply_urls": [
                "https://192.168.1.100:8080/callback",
            ],
            "expected": {
                "total_urls": 1,
                "ip_literal_count": 1,
            }
        },
        {
            "name": "Localhost URL",
            "reply_urls": [
                "https://localhost:5000/callback",
                "http://127.0.0.1:3000/auth",
            ],
            "expected": {
                "total_urls": 2,
                "localhost_count": 2,
            }
        },
        {
            "name": "Punycode domain",
            "reply_urls": [
                "https://xn--e1afmkfd.xn--p1ai/callback",
            ],
            "expected": {
                "total_urls": 1,
                "punycode_count": 1,
            }
        },
        {
            "name": "Mixed schemes and domains",
            "reply_urls": [
                "https://app.contoso.com/callback",
                "http://test.contoso.com/auth",
                "https://app.fabrikam.com/oauth",
            ],
            "expected": {
                "total_urls": 3,
                "non_https_count": 1,
                "normalized_domains_count": 2,
            }
        },
    ]
    
    passed = 0
    failed = 0
    
    for test_case in test_cases:
        name = test_case["name"]
        result = analyze_reply_urls(test_case["reply_urls"])
        
        checks_passed = True
        expected = test_case["expected"]
        
        # Check expected fields
        for key, expected_value in expected.items():
            if key.endswith("_count"):
                # Count fields - need to map to actual result keys
                # e.g., "non_https_count" -> "non_https_urls"
                base_key = key.replace("_count", "")
                # Try common suffixes
                possible_keys = [base_key + "_urls", base_key + "s", base_key, base_key + "_domains"]
                actual_value = None
                for possible_key in possible_keys:
                    if possible_key in result:
                        actual_value = len(result[possible_key])
                        break
                if actual_value is None:
                    actual_value = 0
            else:
                actual_value = result.get(key)
            
            if actual_value != expected_value:
                print(f"✗ FAIL: {name}")
                print(f"  {key}: expected {expected_value}, got {actual_value}")
                print(f"  Full result: {result}")
                checks_passed = False
                break
        
        if checks_passed:
            print(f"✓ PASS: {name}")
            passed += 1
        else:
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_resolve_permission_details():
    """Test permission resolution."""
    print("\n=== Testing resolve_permission_details ===")
    
    # Mock resource service principal with scopes and roles
    resource_sp = {
        "appId": "00000000-0000-0000-0000-000000000001",
        "displayName": "Microsoft Graph",
        "publishedPermissionScopes": [
            {
                "id": "scope-1",
                "value": "User.Read",
                "adminConsentDisplayName": "Read user profile",
                "adminConsentDescription": "Allows the app to read user profile",
                "userConsentDisplayName": "Read your profile",
                "userConsentDescription": "Allows the app to read your profile",
                "type": "User",
                "isEnabled": True,
            },
            {
                "id": "scope-2",
                "value": "Mail.Read",
                "adminConsentDisplayName": "Read user mail",
                "adminConsentDescription": "Allows the app to read mail",
                "type": "User",
                "isEnabled": True,
            }
        ],
        "appRoles": [
            {
                "id": "role-1",
                "value": "User.Read.All",
                "displayName": "Read all users' profiles",
                "description": "Allows the app to read all users' profiles",
                "allowedMemberTypes": ["Application"],
                "isEnabled": True,
            },
            {
                "id": "role-2",
                "value": "Mail.ReadWrite",
                "displayName": "Read and write mail",
                "description": "Allows the app to read and write mail",
                "allowedMemberTypes": ["Application"],
                "isEnabled": True,
            }
        ]
    }
    
    test_cases = [
        {
            "name": "Resolve OAuth2 scopes",
            "scope_names": {"User.Read", "Mail.Read"},
            "app_role_ids": None,
            "expected": {
                "resolved_scopes_count": 2,
                "resource_app_id": "00000000-0000-0000-0000-000000000001",
            }
        },
        {
            "name": "Resolve app roles",
            "scope_names": None,
            "app_role_ids": {"role-1", "role-2"},
            "expected": {
                "resolved_app_roles_count": 2,
                "resource_app_id": "00000000-0000-0000-0000-000000000001",
            }
        },
        {
            "name": "Resolve both scopes and roles",
            "scope_names": {"User.Read"},
            "app_role_ids": {"role-1"},
            "expected": {
                "resolved_scopes_count": 1,
                "resolved_app_roles_count": 1,
            }
        },
        {
            "name": "Unknown scope",
            "scope_names": {"UnknownScope"},
            "app_role_ids": None,
            "expected": {
                "resolved_scopes_count": 1,  # Still returns entry with basic info
            }
        },
    ]
    
    passed = 0
    failed = 0
    
    for test_case in test_cases:
        name = test_case["name"]
        result = resolve_permission_details(
            resource_sp=resource_sp,
            scope_names=test_case.get("scope_names"),
            app_role_ids=test_case.get("app_role_ids"),
        )
        
        checks_passed = True
        expected = test_case["expected"]
        
        # Check expected fields
        for key, expected_value in expected.items():
            if key.endswith("_count"):
                # Count fields - need to map to actual result keys
                base_key = key.replace("_count", "")
                # Try exact match and common plurals
                possible_keys = [base_key, base_key + "s"]
                actual_value = None
                for possible_key in possible_keys:
                    if possible_key in result and isinstance(result[possible_key], list):
                        actual_value = len(result[possible_key])
                        break
                if actual_value is None:
                    actual_value = 0
            else:
                actual_value = result.get(key)
            
            if actual_value != expected_value:
                print(f"✗ FAIL: {name}")
                print(f"  {key}: expected {expected_value}, got {actual_value}")
                checks_passed = False
                break
        
        if checks_passed:
            print(f"✓ PASS: {name}")
            passed += 1
        else:
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def main():
    """Run all tests."""
    print("=" * 60)
    print("Enhanced Scanner Features Test Suite")
    print("=" * 60)
    
    all_passed = True
    
    # Run all test functions
    all_passed = all_passed and test_analyze_credentials()
    all_passed = all_passed and test_analyze_reply_urls()
    all_passed = all_passed and test_resolve_permission_details()
    
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
