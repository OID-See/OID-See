#!/usr/bin/env python3
"""
End-to-end integration test for new scanner features.
Tests the complete flow with wildcard URLs, public client indicators, and scoring.
"""

import sys
import os

# Add parent directory to path to import oidsee_scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from oidsee_scanner import (
    compute_risk_for_sp,
    analyze_reply_urls,
    analyze_public_client_indicators
)


class MockCache:
    """Mock DirectoryCache for testing."""
    def get(self, oid):
        return None


def test_wildcard_url_scoring():
    """Test that wildcard URLs contribute to risk scoring."""
    print("\n=== Testing Wildcard URL Risk Scoring ===")
    
    # Create a service principal with wildcard URLs
    sp_data = {
        "appId": "12345678-1234-1234-1234-123456789012",
        "appDisplayName": "Wildcard Test App",
        "appOwnerOrganizationId": "00000000-0000-0000-0000-000000000000",
        "verifiedPublisher": None,
    }
    
    reply_urls = [
        "https://app.contoso.com/callback",
        "https://*.contoso.com/wildcard"
    ]
    
    reply_url_analysis = analyze_reply_urls(reply_urls)
    
    risk = compute_risk_for_sp(
        sp=sp_data,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{'id': 'owner1'}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display=sp_data.get('appDisplayName', 'Test App'),
        dir_cache=MockCache(),
        credential_insights=None,
        reply_url_analysis=reply_url_analysis,
        public_client_indicators=None
    )
    
    # Check that wildcard URL anomaly is detected
    wildcard_found = False
    for reason in risk['reasons']:
        if reason['code'] == 'REPLY_URL_ANOMALIES' and reason.get('subtype') == 'wildcard':
            wildcard_found = True
            print(f"✓ PASS: Wildcard URL detected in risk scoring")
            print(f"  Message: {reason['message']}")
            print(f"  Weight: {reason['weight']}")
            break
    
    if not wildcard_found:
        print("✗ FAIL: Wildcard URL not detected in risk scoring")
        return False
    
    return True


def test_public_client_scoring():
    """Test that public client indicators contribute to risk scoring."""
    print("\n=== Testing Public Client Risk Scoring ===")
    
    # Create an app with public client flows enabled
    app_obj = {
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
    }
    
    public_client_indicators = analyze_public_client_indicators(app_obj)
    
    sp_data = {
        "appId": "12345678-1234-1234-1234-123456789012",
        "appDisplayName": "Public Client Test App",
        "appOwnerOrganizationId": "00000000-0000-0000-0000-000000000000",
        "verifiedPublisher": None,
    }
    
    risk = compute_risk_for_sp(
        sp=sp_data,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{'id': 'owner1'}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display=sp_data.get('appDisplayName', 'Test App'),
        dir_cache=MockCache(),
        credential_insights=None,
        reply_url_analysis=None,
        public_client_indicators=public_client_indicators
    )
    
    # Check that public client flow risk is detected
    public_client_found = False
    implicit_flow_found = False
    
    for reason in risk['reasons']:
        if reason['code'] == 'PUBLIC_CLIENT_FLOW_RISK':
            if reason.get('subtype') == 'public_client':
                public_client_found = True
                print(f"✓ PASS: Public client flow detected in risk scoring")
                print(f"  Message: {reason['message']}")
                print(f"  Weight: {reason['weight']}")
            elif reason.get('subtype') == 'implicit_flow':
                implicit_flow_found = True
                print(f"✓ PASS: Implicit flow detected in risk scoring")
                print(f"  Message: {reason['message']}")
                print(f"  Weight: {reason['weight']}")
    
    if not public_client_found:
        print("✗ FAIL: Public client flow not detected in risk scoring")
        return False
    
    if not implicit_flow_found:
        print("✗ FAIL: Implicit flow not detected in risk scoring")
        return False
    
    return True


def test_combined_scenario():
    """Test a combined scenario with multiple risk factors."""
    print("\n=== Testing Combined Risk Scenario ===")
    
    # Create an app with multiple risk factors
    app_obj = {
        "publicClient": {
            "redirectUris": ["ms-app://callback"]
        },
        "web": {
            "implicitGrantSettings": {
                "enableAccessTokenIssuance": True,
                "enableIdTokenIssuance": False
            }
        },
        "spa": {}
    }
    
    reply_urls = [
        "https://app.contoso.com/callback",
        "https://*.contoso.com/wildcard",
        "http://localhost:8080/dev"
    ]
    
    reply_url_analysis = analyze_reply_urls(reply_urls)
    public_client_indicators = analyze_public_client_indicators(app_obj)
    
    sp_data = {
        "appId": "12345678-1234-1234-1234-123456789012",
        "appDisplayName": "High Risk Test App",
        "appOwnerOrganizationId": "00000000-0000-0000-0000-000000000000",
        "verifiedPublisher": None,
    }
    
    risk = compute_risk_for_sp(
        sp=sp_data,
        has_impersonation=False,
        has_offline_access=True,  # Add offline access
        app_role_max_weight=0,
        has_privileged_scopes=True,  # Add privileged scopes
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[],  # No owners
        requires_assignment=False,  # Broad reachability
        dir_role_assignments=[],
        sp_display=sp_data.get('appDisplayName', 'Test App'),
        dir_cache=MockCache(),
        credential_insights=None,
        reply_url_analysis=reply_url_analysis,
        public_client_indicators=public_client_indicators
    )
    
    print(f"\nRisk Score: {risk['score']}")
    print(f"Risk Level: {risk['level']}")
    print(f"\nRisk Reasons ({len(risk['reasons'])} total):")
    for reason in risk['reasons']:
        subtype = f" [{reason['subtype']}]" if 'subtype' in reason else ""
        print(f"  • {reason['code']}{subtype}: {reason['message']} (weight: {reason.get('weight', 0)})")
    
    # Verify expected risk contributors are present
    expected_codes = [
        'REPLY_URL_ANOMALIES',  # wildcard + non-https
        'PUBLIC_CLIENT_FLOW_RISK',  # public client + implicit
        'OFFLINE_ACCESS_PERSISTENCE',
        'HAS_PRIVILEGED_SCOPES',
        'NO_OWNERS',
        'BROAD_REACHABILITY'
    ]
    
    found_codes = {reason['code'] for reason in risk['reasons']}
    all_found = True
    
    for expected_code in expected_codes:
        if expected_code in found_codes:
            print(f"✓ PASS: {expected_code} detected")
        else:
            print(f"✗ FAIL: {expected_code} not detected")
            all_found = False
    
    if risk['score'] > 50:
        print(f"✓ PASS: Combined risk score is elevated ({risk['score']})")
    else:
        print(f"✗ FAIL: Combined risk score is too low ({risk['score']})")
        all_found = False
    
    return all_found


def main():
    """Run all integration tests."""
    print("=" * 70)
    print("End-to-End Integration Tests")
    print("=" * 70)
    
    all_passed = True
    all_passed &= test_wildcard_url_scoring()
    all_passed &= test_public_client_scoring()
    all_passed &= test_combined_scenario()
    
    print("\n" + "=" * 70)
    if all_passed:
        print("✓ ALL INTEGRATION TESTS PASSED")
    else:
        print("✗ SOME INTEGRATION TESTS FAILED")
    print("=" * 70)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
