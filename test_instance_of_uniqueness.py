#!/usr/bin/env python3
"""
Test to verify INSTANCE_OF edge uniqueness fix
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the functions we're testing
from oidsee_scanner import node_id, make_edge


def test_instance_of_uniqueness():
    """Test that INSTANCE_OF edges with same display names but different SP IDs get unique edge IDs"""
    print("\n=== Testing INSTANCE_OF Edge Uniqueness ===")
    
    # Scenario: Two service principals with the same display name, both instancing the same application
    sp1_id = "11111111-1111-1111-1111-111111111111"
    sp2_id = "22222222-2222-2222-2222-222222222222"
    app_id = "33333333-3333-3333-3333-333333333333"
    
    display_name = "Microsoft Defender for Cloud"
    
    # Create node IDs - both SPs will have the same node ID due to same display name
    sp1_nid = node_id("sp", sp1_id, display_name)
    sp2_nid = node_id("sp", sp2_id, display_name)
    app_nid = node_id("app", app_id, display_name)
    
    print(f"SP1 node ID: {sp1_nid}")
    print(f"SP2 node ID: {sp2_nid}")
    print(f"App node ID: {app_nid}")
    
    # Both SPs have the same display name, so they get the same node ID
    assert sp1_nid == sp2_nid, "SPs with same display name should have same node ID"
    
    # Create INSTANCE_OF edges with servicePrincipalId to differentiate
    edge1 = make_edge(sp1_nid, app_nid, "INSTANCE_OF", {"servicePrincipalId": sp1_id})
    edge2 = make_edge(sp2_nid, app_nid, "INSTANCE_OF", {"servicePrincipalId": sp2_id})
    
    # Verify edges have different IDs despite same source and destination
    assert edge1["id"] != edge2["id"], f"Edge IDs should be unique but both are: {edge1['id']}"
    assert sp1_id in edge1["id"], f"Edge ID should contain SP1 GUID: {edge1['id']}"
    assert sp2_id in edge2["id"], f"Edge ID should contain SP2 GUID: {edge2['id']}"
    
    print(f"✓ Edge 1 ID: {edge1['id']}")
    print(f"✓ Edge 2 ID: {edge2['id']}")
    print(f"✓ INSTANCE_OF edges with same display names have unique IDs")


def test_instance_of_without_sp_id():
    """Test that INSTANCE_OF edges without servicePrincipalId still work"""
    print("\n=== Testing INSTANCE_OF Without servicePrincipalId ===")
    
    sp_nid = "sp:my-service-principal"
    app_nid = "app:my-application"
    
    # Create edge without servicePrincipalId (backward compatibility)
    edge = make_edge(sp_nid, app_nid, "INSTANCE_OF", {})
    
    # Should still work, just without the unique suffix
    assert edge["id"] == "e-instance-my-service-principal-my-application", \
        f"Unexpected edge ID: {edge['id']}"
    
    print(f"✓ Edge ID: {edge['id']}")
    print(f"✓ INSTANCE_OF without servicePrincipalId works correctly")


def test_all_edge_types_with_suffixes():
    """Test that all edge types with differentiators work correctly"""
    print("\n=== Testing All Edge Types with Differentiators ===")
    
    # ASSIGNED_TO with appRoleId
    edge1 = make_edge("user:alice", "sp:app", "ASSIGNED_TO", 
                      {"appRoleId": "role-123"})
    assert "role-123" in edge1["id"], f"ASSIGNED_TO should include appRoleId: {edge1['id']}"
    print(f"✓ ASSIGNED_TO: {edge1['id']}")
    
    # HAS_APP_ROLE with resourceId
    edge2 = make_edge("sp:app", "approle:role-guid", "HAS_APP_ROLE", 
                      {"resourceId": "resource-456"})
    assert "resource-456" in edge2["id"], f"HAS_APP_ROLE should include resourceId: {edge2['id']}"
    print(f"✓ HAS_APP_ROLE: {edge2['id']}")
    
    # INSTANCE_OF with servicePrincipalId
    edge3 = make_edge("sp:my-sp", "app:my-app", "INSTANCE_OF", 
                      {"servicePrincipalId": "sp-789"})
    assert "sp-789" in edge3["id"], f"INSTANCE_OF should include servicePrincipalId: {edge3['id']}"
    print(f"✓ INSTANCE_OF: {edge3['id']}")
    
    print("✓ All edge types with differentiators work correctly")


if __name__ == "__main__":
    try:
        test_instance_of_uniqueness()
        test_instance_of_without_sp_id()
        test_all_edge_types_with_suffixes()
        print("\n" + "=" * 60)
        print("SUCCESS: INSTANCE_OF edge uniqueness fix validated")
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
