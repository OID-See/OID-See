#!/usr/bin/env python3
"""
Tests for appOwnership field integration in risk scoring logic.
Ensures that 1st Party apps (identified via Merill's feed) are not incorrectly
flagged with IDENTITY_LAUNDERING or DECEPTION risks.
"""

import sys
import os

# Add parent directory to path to import oidsee_scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the functions we're testing
from oidsee_scanner import (
    compute_risk_for_sp, 
    DirectoryCache, 
    MICROSOFT_TENANT_IDS,
    analyze_reply_urls
)


def mock_directory_cache():
    """Create a mock DirectoryCache for testing."""
    class MockCache:
        def get(self, oid):
            return None
    return MockCache()


def test_first_party_no_identity_laundering():
    """Test that 1st Party apps do not trigger IDENTITY_LAUNDERING."""
    print("\n=== Testing 1st Party App Does Not Trigger IDENTITY_LAUNDERING ===")
    
    # Microsoft tenant ID that would normally trigger identity laundering
    microsoft_tenant_id = MICROSOFT_TENANT_IDS[0]
    
    # Simulates an app like "Office Shredding Service" - Microsoft-owned, unverified, but confirmed 1st Party via Merill's feed
    sp_first_party = {
        "verifiedPublisher": None,  # Unverified
        "publisherName": "Microsoft Services",
        "appOwnerOrganizationId": microsoft_tenant_id,
        "replyUrls": ["https://shredder.osi.office.net"],  # Need reply URLs for OAuth flows
        "info": {},
    }
    
    mock_cache = mock_directory_cache()
    reply_url_analysis = analyze_reply_urls(sp_first_party.get("replyUrls", []))
    
    # Test with app_ownership = "1st Party" (correctly identified via Merill's feed)
    risk_first_party = compute_risk_for_sp(
        sp=sp_first_party,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Office Shredding Service",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
        app_ownership="1st Party",  # Identified as 1st Party
    )
    
    # IDENTITY_LAUNDERING should NOT be present
    laundering_found = any(r["code"] == "IDENTITY_LAUNDERING" for r in risk_first_party["reasons"])
    if not laundering_found:
        print("✓ PASS: 1st Party app does not trigger IDENTITY_LAUNDERING")
    else:
        print("✗ FAIL: 1st Party app should not trigger IDENTITY_LAUNDERING")
        print(f"  Risk reasons: {[r['code'] for r in risk_first_party['reasons']]}")
        return False
    
    # Test with app_ownership = "3rd Party" (should trigger IDENTITY_LAUNDERING)
    risk_third_party = compute_risk_for_sp(
        sp=sp_first_party,  # Same SP but marked as 3rd Party
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Fake Microsoft App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
        app_ownership="3rd Party",  # Marked as 3rd Party
    )
    
    # IDENTITY_LAUNDERING SHOULD be present for 3rd Party
    laundering_found = any(r["code"] == "IDENTITY_LAUNDERING" for r in risk_third_party["reasons"])
    if laundering_found:
        print("✓ PASS: 3rd Party app with Microsoft tenant ID triggers IDENTITY_LAUNDERING")
    else:
        print("✗ FAIL: 3rd Party app with Microsoft tenant ID should trigger IDENTITY_LAUNDERING")
        print(f"  Risk reasons: {[r['code'] for r in risk_third_party['reasons']]}")
        return False
    
    return True


def test_first_party_no_deception():
    """Test that 1st Party apps do not trigger DECEPTION risk."""
    print("\n=== Testing 1st Party App Does Not Trigger DECEPTION ===")
    
    # Simulates a Microsoft app with name mismatch (common for MS services)
    sp_first_party = {
        "verifiedPublisher": None,  # Unverified
        "publisherName": "Microsoft Services",
        "appDisplayName": "Azure AD Notification",  # Name mismatch with publisher
        "appOwnerOrganizationId": MICROSOFT_TENANT_IDS[0],
        "replyUrls": ["https://notify.iga.azure.net"],
        "info": {},
    }
    
    mock_cache = mock_directory_cache()
    reply_url_analysis = analyze_reply_urls(sp_first_party.get("replyUrls", []))
    
    # Test with app_ownership = "1st Party"
    risk_first_party = compute_risk_for_sp(
        sp=sp_first_party,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Azure AD Notification",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
        app_ownership="1st Party",
    )
    
    # DECEPTION should NOT be present
    deception_found = any(r["code"] == "DECEPTION" for r in risk_first_party["reasons"])
    if not deception_found:
        print("✓ PASS: 1st Party app does not trigger DECEPTION")
    else:
        print("✗ FAIL: 1st Party app should not trigger DECEPTION")
        print(f"  Risk reasons: {[r['code'] for r in risk_first_party['reasons']]}")
        return False
    
    # Test with app_ownership = "3rd Party" (should trigger DECEPTION)
    risk_third_party = compute_risk_for_sp(
        sp=sp_first_party,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Azure AD Notification",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
        app_ownership="3rd Party",
    )
    
    # DECEPTION SHOULD be present for 3rd Party
    deception_found = any(r["code"] == "DECEPTION" for r in risk_third_party["reasons"])
    if deception_found:
        print("✓ PASS: 3rd Party app with name mismatch triggers DECEPTION")
    else:
        print("✗ FAIL: 3rd Party app with name mismatch should trigger DECEPTION")
        print(f"  Risk reasons: {[r['code'] for r in risk_third_party['reasons']]}")
        return False
    
    return True


def test_internal_app_no_unverified_publisher():
    """Test that Internal apps do not trigger UNVERIFIED_PUBLISHER (existing behavior)."""
    print("\n=== Testing Internal App Does Not Trigger UNVERIFIED_PUBLISHER ===")
    
    sp_internal = {
        "verifiedPublisher": None,
        "publisherName": "MyOrg",
        "appOwnerOrganizationId": "tenant-123",
        "replyUrls": [],
        "info": {},
    }
    
    mock_cache = mock_directory_cache()
    
    # Test with app_ownership = "Internal"
    risk_internal = compute_risk_for_sp(
        sp=sp_internal,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Internal App",
        dir_cache=mock_cache,
        app_ownership="Internal",
    )
    
    # UNVERIFIED_PUBLISHER should NOT be present
    unverified_found = any(r["code"] == "UNVERIFIED_PUBLISHER" for r in risk_internal["reasons"])
    if not unverified_found:
        print("✓ PASS: Internal app does not trigger UNVERIFIED_PUBLISHER")
    else:
        print("✗ FAIL: Internal app should not trigger UNVERIFIED_PUBLISHER")
        return False
    
    return True


def main():
    print("=" * 70)
    print("appOwnership Field Integration in Risk Scoring Test Suite")
    print("=" * 70)
    
    tests = [
        test_first_party_no_identity_laundering,
        test_first_party_no_deception,
        test_internal_app_no_unverified_publisher,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"✗ EXCEPTION in {test.__name__}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 70)
    if failed == 0:
        print("✓ ALL TESTS PASSED")
    else:
        print(f"✗ {failed} TEST(S) FAILED, {passed} PASSED")
    print("=" * 70)
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
