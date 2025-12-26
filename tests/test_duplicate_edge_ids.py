#!/usr/bin/env python3
"""
Tests for duplicate edge ID fix:
- Verify that ASSIGNED_TO edges with different appRoleIds get unique IDs
- Verify that HAS_APP_ROLE edges with different resourceIds get unique IDs
"""

import sys
import os

# Add parent directory to path to import oidsee_scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the functions we're testing
from oidsee_scanner import make_edge


def test_assigned_to_unique_ids():
    """Test that ASSIGNED_TO edges with different appRoleIds get unique IDs."""
    print("\n=== Testing ASSIGNED_TO edge uniqueness ===")
    
    # Create two ASSIGNED_TO edges between the same nodes with different appRoleIds
    edge1 = make_edge(
        "user:alice",
        "sp:microsoft-graph",
        "ASSIGNED_TO",
        {"appRoleId": "741f803b-c850-494e-b5df-cde7c675a1ca"}
    )
    
    edge2 = make_edge(
        "user:alice",
        "sp:microsoft-graph",
        "ASSIGNED_TO",
        {"appRoleId": "5facf0c1-8979-4e95-abcf-ff3d079771c0"}
    )
    
    # Verify IDs are different
    assert edge1["id"] != edge2["id"], f"Edge IDs should be unique but both are: {edge1['id']}"
    
    # Verify IDs contain the appRoleId
    assert "741f803b-c850-494e-b5df-cde7c675a1ca" in edge1["id"], f"Edge ID should contain appRoleId: {edge1['id']}"
    assert "5facf0c1-8979-4e95-abcf-ff3d079771c0" in edge2["id"], f"Edge ID should contain appRoleId: {edge2['id']}"
    
    print(f"✓ Edge 1 ID: {edge1['id']}")
    print(f"✓ Edge 2 ID: {edge2['id']}")
    print("✓ ASSIGNED_TO edges have unique IDs")


def test_has_app_role_unique_ids():
    """Test that HAS_APP_ROLE edges with different resourceIds get unique IDs."""
    print("\n=== Testing HAS_APP_ROLE edge uniqueness ===")
    
    # Create two HAS_APP_ROLE edges between the same nodes with different resourceIds
    edge1 = make_edge(
        "sp:my-app",
        "approle:directory.read.all",
        "HAS_APP_ROLE",
        {"resourceId": "resource-1"}
    )
    
    edge2 = make_edge(
        "sp:my-app",
        "approle:directory.read.all",
        "HAS_APP_ROLE",
        {"resourceId": "resource-2"}
    )
    
    # Verify IDs are different
    assert edge1["id"] != edge2["id"], f"Edge IDs should be unique but both are: {edge1['id']}"
    
    # Verify IDs contain the resourceId
    assert "resource-1" in edge1["id"], f"Edge ID should contain resourceId: {edge1['id']}"
    assert "resource-2" in edge2["id"], f"Edge ID should contain resourceId: {edge2['id']}"
    
    print(f"✓ Edge 1 ID: {edge1['id']}")
    print(f"✓ Edge 2 ID: {edge2['id']}")
    print("✓ HAS_APP_ROLE edges have unique IDs")


def test_other_edges_unchanged():
    """Test that other edge types still work as before."""
    print("\n=== Testing other edge types remain unchanged ===")
    
    edge = make_edge(
        "sp:my-app",
        "user:alice",
        "OWNS",
        {}
    )
    
    # Verify ID format is as expected
    expected_id = "e-own-my-app-alice"
    assert edge["id"] == expected_id, f"Expected ID '{expected_id}' but got '{edge['id']}'"
    
    print(f"✓ OWNS edge ID: {edge['id']}")
    print("✓ Other edge types work as expected")


def test_assigned_to_without_app_role_id():
    """Test ASSIGNED_TO edge without appRoleId still works."""
    print("\n=== Testing ASSIGNED_TO without appRoleId ===")
    
    edge = make_edge(
        "user:alice",
        "sp:microsoft-graph",
        "ASSIGNED_TO",
        {}
    )
    
    # Should still work, just without suffix
    assert edge["id"] == "e-assigned-alice-microsoft-graph", f"Unexpected ID: {edge['id']}"
    
    print(f"✓ Edge ID: {edge['id']}")
    print("✓ ASSIGNED_TO without appRoleId works correctly")


def run_all_tests():
    """Run all test cases."""
    print("=" * 60)
    print("Testing Duplicate Edge ID Fix")
    print("=" * 60)
    
    tests = [
        test_assigned_to_unique_ids,
        test_has_app_role_unique_ids,
        test_other_edges_unchanged,
        test_assigned_to_without_app_role_id,
    ]
    
    passed = 0
    failed = 0
    
    for test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"✗ Test failed: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ Test error: {e}")
            failed += 1
    
    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
