#!/usr/bin/env python3
"""
Test to verify app role node ID uniqueness fix
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the functions we're testing
from oidsee_scanner import node_id, make_edge


def test_approle_node_uniqueness():
    """Test that app role nodes with same display name get unique IDs"""
    print("\n=== Testing App Role Node ID Uniqueness ===")
    
    # Test case 1: Two roles with same display name but different GUIDs
    role1_id = "8749cf44-2fc9-4fee-bc76-cbaac00bae98"
    role2_id = "9856de55-3fda-5gff-cd87-ddbbd11cbf09"
    role_display = "Unknown Role"
    
    # Create node IDs using the GUID (passing None for display name)
    node1_id = node_id("approle", role1_id, None)
    node2_id = node_id("approle", role2_id, None)
    
    # Verify they are different
    assert node1_id != node2_id, f"Node IDs should be unique but both are: {node1_id}"
    assert role1_id in node1_id, f"Node ID should contain GUID: {node1_id}"
    assert role2_id in node2_id, f"Node ID should contain GUID: {node2_id}"
    
    print(f"✓ Role 1 ('{role_display}'): {node1_id}")
    print(f"✓ Role 2 ('{role_display}'): {node2_id}")
    print(f"✓ App role nodes with same display name have unique IDs")
    
    # Test case 2: Create edges to these nodes from the same source
    sp_node = "sp:microsoft-office-365-portal"
    resource_id = "resource-123"
    
    edge1 = make_edge(sp_node, node1_id, "HAS_APP_ROLE", {"resourceId": resource_id})
    edge2 = make_edge(sp_node, node2_id, "HAS_APP_ROLE", {"resourceId": resource_id})
    
    # Verify edges have different IDs
    assert edge1["id"] != edge2["id"], f"Edge IDs should be unique but both are: {edge1['id']}"
    
    print(f"✓ Edge 1 ID: {edge1['id']}")
    print(f"✓ Edge 2 ID: {edge2['id']}")
    print(f"✓ Edges to different app role nodes have unique IDs")


def test_approle_node_with_display_name():
    """Test that app roles with display names still work"""
    print("\n=== Testing App Role Node with Display Name ===")
    
    role_id = "741f803b-c850-494e-b5df-cde7c675a1ca"
    role_display = "Directory.Read.All"
    
    # Create node ID with display name (old behavior - now we pass None)
    node_with_display = node_id("approle", role_id, role_display)
    # This should now use the display name as before
    print(f"✓ With display name: {node_with_display}")
    
    # Create node ID without display name (new behavior for uniqueness)
    node_without_display = node_id("approle", role_id, None)
    # This should use the GUID
    print(f"✓ Without display name: {node_without_display}")
    
    # They should be different
    assert node_with_display != node_without_display or role_display == role_id, \
        "Display name and GUID-based IDs should differ"


if __name__ == "__main__":
    try:
        test_approle_node_uniqueness()
        test_approle_node_with_display_name()
        print("\n" + "=" * 60)
        print("SUCCESS: App role node uniqueness fix validated")
        print("=" * 60)
        sys.exit(0)
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Test error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
