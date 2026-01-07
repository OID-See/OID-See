#!/usr/bin/env python3
"""
Tests for ownership scoring inversion.
Tests that NO_OWNERS no longer penalizes and HAS_OWNERS adds risk based on owner type.
"""

import sys
import os
from typing import Dict, Any, List

# Add parent directory to path to import oidsee_scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the functions we're testing
from oidsee_scanner import (
    compute_risk_for_sp, 
    DirectoryCache, 
    SCORING_CONFIG,
)


def mock_directory_cache_with_principals(principals: Dict[str, Dict[str, Any]]):
    """Create a mock DirectoryCache that returns specific principals."""
    class MockCache:
        def __init__(self, principals_dict):
            self.principals = principals_dict
        
        def get(self, oid):
            return self.principals.get(oid)
    
    return MockCache(principals)


def get_scoring_weight(reason_code: str) -> int:
    """Helper function to retrieve scoring weight for a reason code from config."""
    return SCORING_CONFIG.get("compute_risk_for_sp", {}).get("scoring_contributors", {}).get(reason_code, {}).get("weight", 0)


def test_no_owners_no_penalty():
    """Test that apps with no owners do not receive a risk penalty."""
    print("\n=== Testing NO OWNERS (No Penalty) ===")
    
    sp_no_owners = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "replyUrls": [],
        "info": {},
    }
    
    mock_cache = mock_directory_cache_with_principals({})
    
    # App with no owners should NOT have NO_OWNERS reason
    risk_no_owners = compute_risk_for_sp(
        sp=sp_no_owners,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[],  # No owners
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=mock_cache,
    )
    
    # Check that NO_OWNERS is NOT in reasons
    no_owners_found = any(r["code"] == "NO_OWNERS" for r in risk_no_owners["reasons"])
    if no_owners_found:
        # Check if weight is 0 (deprecated but present)
        no_owners_weight = next(r["weight"] for r in risk_no_owners["reasons"] if r["code"] == "NO_OWNERS")
        if no_owners_weight == 0:
            print(f"✓ PASS: NO_OWNERS present but weight is 0 (deprecated)")
        else:
            print(f"✗ FAIL: NO_OWNERS has non-zero weight {no_owners_weight}")
            return False
    else:
        print("✓ PASS: NO_OWNERS not in reasons (no penalty for no owners)")
    
    # Check that no HAS_OWNERS reasons are present
    has_owners_found = any(r["code"].startswith("HAS_OWNERS") for r in risk_no_owners["reasons"])
    if has_owners_found:
        print("✗ FAIL: HAS_OWNERS reasons should not be present for no owners")
        return False
    else:
        print("✓ PASS: No HAS_OWNERS reasons for app with no owners")
    
    return True


def test_user_owners_adds_risk():
    """Test that apps with user owners receive HAS_OWNERS_USER risk."""
    print("\n=== Testing USER OWNERS (Risk Added) ===")
    
    sp_with_user_owners = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "replyUrls": [],
        "info": {},
    }
    
    # Mock directory cache with user principals
    principals = {
        "user-1": {"@odata.type": "#microsoft.graph.user", "displayName": "User One"},
        "user-2": {"@odata.type": "#microsoft.graph.user", "displayName": "User Two"},
    }
    mock_cache = mock_directory_cache_with_principals(principals)
    
    # App with user owners
    risk_user_owners = compute_risk_for_sp(
        sp=sp_with_user_owners,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "user-1"}, {"id": "user-2"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=mock_cache,
    )
    
    # Check that HAS_OWNERS_USER is in reasons
    user_owners_found = any(r["code"] == "HAS_OWNERS_USER" for r in risk_user_owners["reasons"])
    if user_owners_found:
        user_owners_weight = next(r["weight"] for r in risk_user_owners["reasons"] if r["code"] == "HAS_OWNERS_USER")
        expected_weight = get_scoring_weight("HAS_OWNERS_USER")
        if user_owners_weight == expected_weight:
            print(f"✓ PASS: HAS_OWNERS_USER adds {user_owners_weight} points")
        else:
            print(f"✗ FAIL: Expected weight {expected_weight}, got {user_owners_weight}")
            return False
    else:
        print("✗ FAIL: HAS_OWNERS_USER not found in reasons")
        return False
    
    # Check that NO_OWNERS is NOT in reasons (or has weight 0)
    no_owners_found = any(r["code"] == "NO_OWNERS" and r["weight"] > 0 for r in risk_user_owners["reasons"])
    if no_owners_found:
        print("✗ FAIL: NO_OWNERS should not penalize apps with owners")
        return False
    else:
        print("✓ PASS: NO_OWNERS not penalizing apps with user owners")
    
    return True


def test_sp_owners_adds_lower_risk():
    """Test that apps with service principal owners receive HAS_OWNERS_SP risk (lower than user)."""
    print("\n=== Testing SP OWNERS (Lower Risk) ===")
    
    sp_with_sp_owners = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "replyUrls": [],
        "info": {},
    }
    
    # Mock directory cache with service principal owners
    principals = {
        "sp-owner-1": {"@odata.type": "#microsoft.graph.servicePrincipal", "displayName": "SP Owner One"},
    }
    mock_cache = mock_directory_cache_with_principals(principals)
    
    # App with SP owner
    risk_sp_owners = compute_risk_for_sp(
        sp=sp_with_sp_owners,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "sp-owner-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=mock_cache,
    )
    
    # Check that HAS_OWNERS_SP is in reasons
    sp_owners_found = any(r["code"] == "HAS_OWNERS_SP" for r in risk_sp_owners["reasons"])
    if sp_owners_found:
        sp_owners_weight = next(r["weight"] for r in risk_sp_owners["reasons"] if r["code"] == "HAS_OWNERS_SP")
        expected_weight = get_scoring_weight("HAS_OWNERS_SP")
        if sp_owners_weight == expected_weight:
            print(f"✓ PASS: HAS_OWNERS_SP adds {sp_owners_weight} points")
        else:
            print(f"✗ FAIL: Expected weight {expected_weight}, got {sp_owners_weight}")
            return False
    else:
        print("✗ FAIL: HAS_OWNERS_SP not found in reasons")
        return False
    
    # Verify that SP owner weight is less than user owner weight
    user_owner_weight = get_scoring_weight("HAS_OWNERS_USER")
    sp_owner_weight = get_scoring_weight("HAS_OWNERS_SP")
    if sp_owner_weight < user_owner_weight:
        print(f"✓ PASS: SP owner weight ({sp_owner_weight}) is less than user owner weight ({user_owner_weight})")
    else:
        print(f"✗ FAIL: SP owner weight ({sp_owner_weight}) should be less than user owner weight ({user_owner_weight})")
        return False
    
    return True


def test_mixed_owners():
    """Test that apps with mixed owner types receive multiple HAS_OWNERS reasons."""
    print("\n=== Testing MIXED OWNERS (Multiple Reasons) ===")
    
    sp_with_mixed_owners = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "replyUrls": [],
        "info": {},
    }
    
    # Mock directory cache with mixed principals
    principals = {
        "user-1": {"@odata.type": "#microsoft.graph.user", "displayName": "User One"},
        "sp-1": {"@odata.type": "#microsoft.graph.servicePrincipal", "displayName": "SP One"},
        "group-1": {"@odata.type": "#microsoft.graph.group", "displayName": "Group One"},
    }
    mock_cache = mock_directory_cache_with_principals(principals)
    
    # App with mixed owners
    risk_mixed_owners = compute_risk_for_sp(
        sp=sp_with_mixed_owners,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "user-1"}, {"id": "sp-1"}, {"id": "group-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=mock_cache,
    )
    
    # Check that HAS_OWNERS_USER is in reasons
    user_owners_found = any(r["code"] == "HAS_OWNERS_USER" for r in risk_mixed_owners["reasons"])
    if not user_owners_found:
        print("✗ FAIL: HAS_OWNERS_USER not found for mixed owners")
        return False
    else:
        print("✓ PASS: HAS_OWNERS_USER found for mixed owners")
    
    # Check that HAS_OWNERS_SP is in reasons
    sp_owners_found = any(r["code"] == "HAS_OWNERS_SP" for r in risk_mixed_owners["reasons"])
    if not sp_owners_found:
        print("✗ FAIL: HAS_OWNERS_SP not found for mixed owners")
        return False
    else:
        print("✓ PASS: HAS_OWNERS_SP found for mixed owners")
    
    # Check that HAS_OWNERS_UNKNOWN is in reasons (for group)
    unknown_owners_found = any(r["code"] == "HAS_OWNERS_UNKNOWN" for r in risk_mixed_owners["reasons"])
    if not unknown_owners_found:
        print("✗ FAIL: HAS_OWNERS_UNKNOWN not found for mixed owners with group")
        return False
    else:
        print("✓ PASS: HAS_OWNERS_UNKNOWN found for mixed owners with group")
    
    return True


def test_unknown_owner_type():
    """Test that owners of unknown type receive HAS_OWNERS_UNKNOWN risk."""
    print("\n=== Testing UNKNOWN OWNER TYPE ===")
    
    sp_with_unknown_owner = {
        "verifiedPublisher": {"verifiedPublisherId": "some-id"},
        "replyUrls": [],
        "info": {},
    }
    
    # Mock directory cache with unknown/group principal
    principals = {
        "unknown-1": {"@odata.type": "#microsoft.graph.directoryRole", "displayName": "Some Role"},
    }
    mock_cache = mock_directory_cache_with_principals(principals)
    
    # App with unknown owner
    risk_unknown_owner = compute_risk_for_sp(
        sp=sp_with_unknown_owner,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "unknown-1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=mock_cache,
    )
    
    # Check that HAS_OWNERS_UNKNOWN is in reasons
    unknown_owners_found = any(r["code"] == "HAS_OWNERS_UNKNOWN" for r in risk_unknown_owner["reasons"])
    if unknown_owners_found:
        unknown_weight = next(r["weight"] for r in risk_unknown_owner["reasons"] if r["code"] == "HAS_OWNERS_UNKNOWN")
        expected_weight = get_scoring_weight("HAS_OWNERS_UNKNOWN")
        if unknown_weight == expected_weight:
            print(f"✓ PASS: HAS_OWNERS_UNKNOWN adds {unknown_weight} points")
        else:
            print(f"✗ FAIL: Expected weight {expected_weight}, got {unknown_weight}")
            return False
    else:
        print("✗ FAIL: HAS_OWNERS_UNKNOWN not found in reasons")
        return False
    
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("OWNERSHIP SCORING INVERSION TESTS")
    print("=" * 60)
    
    tests = [
        test_no_owners_no_penalty,
        test_user_owners_adds_risk,
        test_sp_owners_adds_lower_risk,
        test_mixed_owners,
        test_unknown_owner_type,
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
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)
    
    sys.exit(0 if failed == 0 else 1)
