#!/usr/bin/env python3
"""
Tests for new scoring contributors added to oidsee_scanner.py
"""

import sys
from typing import Dict, Any, List

# Import the functions we're testing
from oidsee_scanner import compute_risk_for_sp, DirectoryCache, GraphClient, SCORING_CONFIG


def mock_directory_cache():
    """Create a mock DirectoryCache for testing."""
    class MockCache:
        def get(self, oid):
            return None
    return MockCache()


def test_unverified_publisher():
    """Test UNVERIFIED_PUBLISHER scoring."""
    print("\n=== Testing UNVERIFIED_PUBLISHER ===")
    
    sp_unverified = {
        "verifiedPublisher": None,
        "replyUrls": [],
        "info": {},
    }
    
    sp_verified = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "replyUrls": [],
        "info": {},
    }
    
    mock_cache = mock_directory_cache()
    
    # Unverified publisher should contribute to score
    risk_unverified = compute_risk_for_sp(
        sp=sp_unverified,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner-1"}],  # Has owner to avoid NO_OWNERS
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=mock_cache,
    )
    
    # Check that UNVERIFIED_PUBLISHER is in reasons
    unverified_found = any(r["code"] == "UNVERIFIED_PUBLISHER" for r in risk_unverified["reasons"])
    if unverified_found:
        unverified_weight = next(r["weight"] for r in risk_unverified["reasons"] if r["code"] == "UNVERIFIED_PUBLISHER")
        expected_weight = SCORING_CONFIG.get("compute_risk_for_sp", {}).get("scoring_contributors", {}).get("UNVERIFIED_PUBLISHER", {}).get("weight", 6)
        if unverified_weight == expected_weight:
            print(f"✓ PASS: Unverified publisher adds {unverified_weight} points")
        else:
            print(f"✗ FAIL: Expected weight {expected_weight}, got {unverified_weight}")
            return False
    else:
        print("✗ FAIL: UNVERIFIED_PUBLISHER not found in reasons")
        return False
    
    # Verified publisher should NOT contribute UNVERIFIED_PUBLISHER
    risk_verified = compute_risk_for_sp(
        sp=sp_verified,
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
        sp_display="Test App",
        dir_cache=mock_cache,
    )
    
    verified_found = any(r["code"] == "UNVERIFIED_PUBLISHER" for r in risk_verified["reasons"])
    if not verified_found:
        print("✓ PASS: Verified publisher does not trigger UNVERIFIED_PUBLISHER")
    else:
        print("✗ FAIL: Verified publisher should not trigger UNVERIFIED_PUBLISHER")
        return False
    
    return True


def test_identity_laundering():
    """Test IDENTITY_LAUNDERING scoring."""
    print("\n=== Testing IDENTITY_LAUNDERING ===")
    
    # Microsoft tenant IDs that should trigger identity laundering
    microsoft_tenant_id = "f8cdef31-a31e-4b4a-93e4-5f571e91255a"  # MSA tenant
    
    sp_laundering = {
        "verifiedPublisher": None,  # Unverified
        "appOwnerOrganizationId": microsoft_tenant_id,
        "replyUrls": [],
        "info": {},
    }
    
    sp_normal = {
        "verifiedPublisher": None,
        "appOwnerOrganizationId": "some-other-tenant-id",
        "replyUrls": [],
        "info": {},
    }
    
    mock_cache = mock_directory_cache()
    
    # Identity laundering should be detected
    risk_laundering = compute_risk_for_sp(
        sp=sp_laundering,
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
    )
    
    laundering_found = any(r["code"] == "IDENTITY_LAUNDERING" for r in risk_laundering["reasons"])
    if laundering_found:
        laundering_weight = next(r["weight"] for r in risk_laundering["reasons"] if r["code"] == "IDENTITY_LAUNDERING")
        expected_weight = SCORING_CONFIG.get("compute_risk_for_sp", {}).get("scoring_contributors", {}).get("IDENTITY_LAUNDERING", {}).get("weight", 15)
        if laundering_weight == expected_weight:
            print(f"✓ PASS: Identity laundering adds {laundering_weight} points")
        else:
            print(f"✗ FAIL: Expected weight {expected_weight}, got {laundering_weight}")
            return False
    else:
        print("✗ FAIL: IDENTITY_LAUNDERING not found in reasons")
        return False
    
    # Normal app should not trigger identity laundering
    risk_normal = compute_risk_for_sp(
        sp=sp_normal,
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
        sp_display="Normal App",
        dir_cache=mock_cache,
    )
    
    normal_found = any(r["code"] == "IDENTITY_LAUNDERING" for r in risk_normal["reasons"])
    if not normal_found:
        print("✓ PASS: Normal app does not trigger IDENTITY_LAUNDERING")
    else:
        print("✗ FAIL: Normal app should not trigger IDENTITY_LAUNDERING")
        return False
    
    return True


def test_credentials_present():
    """Test CREDENTIALS_PRESENT and PASSWORD_CREDENTIALS_PRESENT scoring."""
    print("\n=== Testing CREDENTIALS_PRESENT ===")
    
    sp_with_password = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "passwordCredentials": [{"keyId": "key-1"}],
        "keyCredentials": [],
        "replyUrls": [],
        "info": {},
    }
    
    sp_with_key = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "passwordCredentials": [],
        "keyCredentials": [{"keyId": "cert-1"}],
        "replyUrls": [],
        "info": {},
    }
    
    sp_no_creds = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "passwordCredentials": [],
        "keyCredentials": [],
        "replyUrls": [],
        "info": {},
    }
    
    mock_cache = mock_directory_cache()
    
    # Test with password credentials
    risk_password = compute_risk_for_sp(
        sp=sp_with_password,
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
        sp_display="App with Password",
        dir_cache=mock_cache,
    )
    
    creds_present = any(r["code"] == "CREDENTIALS_PRESENT" for r in risk_password["reasons"])
    password_present = any(r["code"] == "PASSWORD_CREDENTIALS_PRESENT" for r in risk_password["reasons"])
    
    if creds_present and password_present:
        print("✓ PASS: Password credentials trigger both CREDENTIALS_PRESENT and PASSWORD_CREDENTIALS_PRESENT")
    else:
        print(f"✗ FAIL: Expected both flags, got CREDENTIALS_PRESENT={creds_present}, PASSWORD_CREDENTIALS_PRESENT={password_present}")
        return False
    
    # Test with key credentials only
    risk_key = compute_risk_for_sp(
        sp=sp_with_key,
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
        sp_display="App with Key",
        dir_cache=mock_cache,
    )
    
    creds_present = any(r["code"] == "CREDENTIALS_PRESENT" for r in risk_key["reasons"])
    password_present = any(r["code"] == "PASSWORD_CREDENTIALS_PRESENT" for r in risk_key["reasons"])
    
    if creds_present and not password_present:
        print("✓ PASS: Key credentials trigger CREDENTIALS_PRESENT but not PASSWORD_CREDENTIALS_PRESENT")
    else:
        print(f"✗ FAIL: Expected only CREDENTIALS_PRESENT, got CREDENTIALS_PRESENT={creds_present}, PASSWORD_CREDENTIALS_PRESENT={password_present}")
        return False
    
    # Test with no credentials
    risk_no_creds = compute_risk_for_sp(
        sp=sp_no_creds,
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
        sp_display="App without Creds",
        dir_cache=mock_cache,
    )
    
    creds_present = any(r["code"] == "CREDENTIALS_PRESENT" for r in risk_no_creds["reasons"])
    password_present = any(r["code"] == "PASSWORD_CREDENTIALS_PRESENT" for r in risk_no_creds["reasons"])
    
    if not creds_present and not password_present:
        print("✓ PASS: No credentials do not trigger credential scoring")
    else:
        print(f"✗ FAIL: Expected no credential flags, got CREDENTIALS_PRESENT={creds_present}, PASSWORD_CREDENTIALS_PRESENT={password_present}")
        return False
    
    return True


def test_offline_access_persistence():
    """Test OFFLINE_ACCESS_PERSISTENCE scoring."""
    print("\n=== Testing OFFLINE_ACCESS_PERSISTENCE ===")
    
    sp = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "passwordCredentials": [],
        "keyCredentials": [],
        "replyUrls": [],
        "info": {},
    }
    
    mock_cache = mock_directory_cache()
    
    # With offline_access
    risk_with_offline = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=True,  # This should trigger OFFLINE_ACCESS_PERSISTENCE
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="App with Offline Access",
        dir_cache=mock_cache,
    )
    
    offline_found = any(r["code"] == "OFFLINE_ACCESS_PERSISTENCE" for r in risk_with_offline["reasons"])
    if offline_found:
        offline_weight = next(r["weight"] for r in risk_with_offline["reasons"] if r["code"] == "OFFLINE_ACCESS_PERSISTENCE")
        expected_weight = SCORING_CONFIG.get("compute_risk_for_sp", {}).get("scoring_contributors", {}).get("OFFLINE_ACCESS_PERSISTENCE", {}).get("weight", 8)
        if offline_weight == expected_weight:
            print(f"✓ PASS: Offline access adds {offline_weight} points")
        else:
            print(f"✗ FAIL: Expected weight {expected_weight}, got {offline_weight}")
            return False
    else:
        print("✗ FAIL: OFFLINE_ACCESS_PERSISTENCE not found in reasons")
        return False
    
    # Without offline_access
    risk_without_offline = compute_risk_for_sp(
        sp=sp,
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
        sp_display="App without Offline Access",
        dir_cache=mock_cache,
    )
    
    offline_found = any(r["code"] == "OFFLINE_ACCESS_PERSISTENCE" for r in risk_without_offline["reasons"])
    if not offline_found:
        print("✓ PASS: Without offline access, OFFLINE_ACCESS_PERSISTENCE not triggered")
    else:
        print("✗ FAIL: OFFLINE_ACCESS_PERSISTENCE should not be triggered without offline_access")
        return False
    
    return True


def main():
    print("=" * 60)
    print("New Scoring Contributors Test Suite")
    print("=" * 60)
    
    tests = [
        test_unverified_publisher,
        test_identity_laundering,
        test_credentials_present,
        test_offline_access_persistence,
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
    
    print("\n" + "=" * 60)
    if failed == 0:
        print("✓ ALL TESTS PASSED")
    else:
        print(f"✗ {failed} TEST(S) FAILED, {passed} PASSED")
    print("=" * 60)
    
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
