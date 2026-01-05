#!/usr/bin/env python3
"""
Test for group assignment enumeration fix.

This test verifies that when groups are assigned to service principals,
the actual member count is used instead of a hardcoded approximation.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from oidsee_scanner import compute_risk_for_sp, DirectoryCache


class MockDirectoryCache:
    """Mock directory cache for testing."""
    def __init__(self, objects):
        self._cache = {obj["id"]: obj for obj in objects}
    
    def get(self, oid):
        return self._cache.get(oid)


def test_group_assignment_counting():
    """Test that group assignments use actual member counts."""
    print("\n=== Testing Group Assignment Counting ===")
    
    # Mock directory cache with users and a group
    users = [
        {"id": f"user-{i}", "@odata.type": "#microsoft.graph.user", "displayName": f"User {i}"}
        for i in range(10)
    ]
    
    group = {
        "id": "group-1",
        "@odata.type": "#microsoft.graph.group",
        "displayName": "Test Group"
    }
    
    dir_cache = MockDirectoryCache(users + [group])
    
    # Test with group assignment and actual member count
    assignments = [
        {"principalId": "group-1", "appRoleId": "role-1"},
    ]
    
    # Simulate group member count cache with actual count of 444 (as in the bug report)
    group_member_count_cache = {
        "group-1": 444
    }
    
    sp = {
        "id": "sp-1",
        "displayName": "Test App",
        "appRoleAssignmentRequired": True,
    }
    
    risk = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=assignments,
        owners=[],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=dir_cache,
        group_member_count_cache=group_member_count_cache,
    )
    
    # Check that the risk calculation used the actual count
    assigned_to_reasons = [r for r in risk.get("reasons", []) if r.get("code") == "ASSIGNED_TO"]
    
    if not assigned_to_reasons:
        print("✗ FAIL: No ASSIGNED_TO reason found in risk calculation")
        return False
    
    assigned_reason = assigned_to_reasons[0]
    message = assigned_reason.get("message", "")
    
    # The message should reflect the actual count (444), not the old approximation (5)
    if "444" in message:
        print(f"✓ PASS: Risk calculation uses actual group member count (message: {message})")
    else:
        print(f"✗ FAIL: Risk calculation does not use actual count (message: {message})")
        return False
    
    # Test with multiple direct user assignments
    user_assignments = [
        {"principalId": f"user-{i}", "appRoleId": "role-1"}
        for i in range(3)
    ]
    
    risk2 = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=user_assignments,
        owners=[],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=dir_cache,
        group_member_count_cache={},
    )
    
    assigned_to_reasons2 = [r for r in risk2.get("reasons", []) if r.get("code") == "ASSIGNED_TO"]
    if assigned_to_reasons2:
        message2 = assigned_to_reasons2[0].get("message", "")
        if "3" in message2:
            print(f"✓ PASS: Direct user assignment counting works (message: {message2})")
        else:
            print(f"✗ FAIL: Direct user assignment count incorrect (message: {message2})")
            return False
    
    # Test with mixed assignments (users and group)
    mixed_assignments = [
        {"principalId": "user-0", "appRoleId": "role-1"},
        {"principalId": "user-1", "appRoleId": "role-1"},
        {"principalId": "group-1", "appRoleId": "role-1"},
    ]
    
    risk3 = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=mixed_assignments,
        owners=[],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=dir_cache,
        group_member_count_cache=group_member_count_cache,
    )
    
    assigned_to_reasons3 = [r for r in risk3.get("reasons", []) if r.get("code") == "ASSIGNED_TO"]
    if assigned_to_reasons3:
        message3 = assigned_to_reasons3[0].get("message", "")
        # Should be 2 direct users + 444 group members = 446 total
        if "446" in message3:
            print(f"✓ PASS: Mixed assignment counting works (message: {message3})")
        else:
            print(f"✗ FAIL: Mixed assignment count incorrect (message: {message3})")
            return False
    
    return True


def test_no_cache_fallback():
    """Test that missing group cache entries don't cause crashes."""
    print("\n=== Testing Missing Cache Fallback ===")
    
    group = {
        "id": "group-unknown",
        "@odata.type": "#microsoft.graph.group",
        "displayName": "Unknown Group"
    }
    
    dir_cache = MockDirectoryCache([group])
    
    assignments = [
        {"principalId": "group-unknown", "appRoleId": "role-1"},
    ]
    
    # Empty cache - group not in cache
    group_member_count_cache = {}
    
    sp = {
        "id": "sp-1",
        "displayName": "Test App",
        "appRoleAssignmentRequired": True,
    }
    
    risk = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=assignments,
        owners=[],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test App",
        dir_cache=dir_cache,
        group_member_count_cache=group_member_count_cache,
    )
    
    # Should not crash and should handle missing cache gracefully
    print("✓ PASS: Missing cache entry handled gracefully")
    return True


if __name__ == "__main__":
    print("============================================================")
    print("Group Assignment Counting Tests")
    print("============================================================")
    
    success = True
    success = test_group_assignment_counting() and success
    success = test_no_cache_fallback() and success
    
    print("\n============================================================")
    if success:
        print("✓ ALL GROUP ASSIGNMENT TESTS PASSED")
        print("============================================================")
        sys.exit(0)
    else:
        print("✗ SOME GROUP ASSIGNMENT TESTS FAILED")
        print("============================================================")
        sys.exit(1)
