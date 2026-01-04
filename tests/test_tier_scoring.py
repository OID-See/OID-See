#!/usr/bin/env python3
"""
Tests for tier-based role scoring and enhanced scope classification.
"""

import sys
import os

# Add parent directory to path to import oidsee_scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from oidsee_scanner import (
    classify_scopes,
    classify_app_role_value,
    get_role_tier,
    get_tier_config,
    compute_risk_for_sp,
    SCORING_CONFIG,
)


def test_role_tier_mapping():
    """Test that role tier mapping works."""
    print("\n=== Testing Role Tier Mapping ===")
    
    # Global Administrator (Tier 0)
    global_admin_id = "62e90394-69f5-4237-9190-012177145e10"
    tier = get_role_tier(global_admin_id)
    assert tier == "tier0", f"Expected tier0 for Global Admin, got {tier}"
    print("✓ Global Administrator correctly mapped to Tier 0")
    
    # Cloud Application Administrator (Tier 1)
    cloud_app_admin_id = "158c047a-c907-4556-b7ef-446551a6b5f7"
    tier = get_role_tier(cloud_app_admin_id)
    assert tier == "tier0", f"Expected tier0 for Cloud App Admin (updated), got {tier}"
    print("✓ Cloud Application Administrator correctly mapped to Tier 0")
    
    # Security Reader (Tier 2)
    security_reader_id = "729827e3-9c14-49f7-bb1b-9608f156bbb8"
    tier = get_role_tier(security_reader_id)
    assert tier == "tier2", f"Expected tier2 for Security Reader, got {tier}"
    print("✓ Security Reader correctly mapped to Tier 2")
    
    # Unknown role
    unknown_role = "00000000-0000-0000-0000-000000000000"
    tier = get_role_tier(unknown_role)
    assert tier is None, f"Expected None for unknown role, got {tier}"
    print("✓ Unknown role returns None")


def test_tier_config():
    """Test tier configuration retrieval."""
    print("\n=== Testing Tier Config Retrieval ===")
    
    tier0_config = get_tier_config("tier0")
    assert "weight_per_role" in tier0_config, "tier0 config should have weight_per_role"
    assert tier0_config["weight_per_role"] == 25, f"Expected weight_per_role=25, got {tier0_config['weight_per_role']}"
    print(f"✓ Tier 0 config: {tier0_config['weight_per_role']} per role, max {tier0_config['max_weight']}")
    
    tier1_config = get_tier_config("tier1")
    assert tier1_config["weight_per_role"] == 10, f"Expected weight_per_role=10, got {tier1_config['weight_per_role']}"
    print(f"✓ Tier 1 config: {tier1_config['weight_per_role']} per role, max {tier1_config['max_weight']}")
    
    tier2_config = get_tier_config("tier2")
    assert tier2_config["weight_per_role"] == 3, f"Expected weight_per_role=3, got {tier2_config['weight_per_role']}"
    print(f"✓ Tier 2 config: {tier2_config['weight_per_role']} per role, max {tier2_config['max_weight']}")


def test_enhanced_scope_classification():
    """Test enhanced scope classification with new priorities."""
    print("\n=== Testing Enhanced Scope Classification ===")
    
    # Test ReadWrite.All (highest priority)
    scopes = {"User.ReadWrite.All", "User.Read.All"}
    result = classify_scopes(scopes)
    assert result["classification"] == "readwrite_all", f"Expected readwrite_all, got {result['classification']}"
    assert result["edge_type"] == "HAS_READWRITE_ALL_SCOPES", f"Expected HAS_READWRITE_ALL_SCOPES, got {result['edge_type']}"
    assert "User.ReadWrite.All" in result["readwrite_all"]
    print("✓ ReadWrite.All correctly classified as highest priority")
    
    # Test Action scopes (second priority)
    scopes = {"Application.ReadWrite.Action", "User.Read.All"}
    result = classify_scopes(scopes)
    assert result["classification"] == "action_privileged", f"Expected action_privileged, got {result['classification']}"
    assert result["edge_type"] == "HAS_PRIVILEGED_ACTION_SCOPES"
    print("✓ Action scopes correctly classified")
    
    # Test .All (third priority, without ReadWrite)
    scopes = {"User.Read.All", "Group.Read.All"}
    result = classify_scopes(scopes)
    assert result["classification"] == "too_broad", f"Expected too_broad, got {result['classification']}"
    assert result["edge_type"] == "HAS_TOO_MANY_SCOPES"
    print("✓ .All scopes (without ReadWrite) correctly classified")
    
    # Test write scopes (fourth priority)
    scopes = {"User.Write", "Group.Read"}
    result = classify_scopes(scopes)
    assert result["classification"] == "write_privileged", f"Expected write_privileged, got {result['classification']}"
    assert result["edge_type"] == "HAS_PRIVILEGED_SCOPES"
    print("✓ Write scopes correctly classified")
    
    # Test regular scopes
    scopes = {"User.Read", "Calendars.Read"}
    result = classify_scopes(scopes)
    assert result["classification"] == "regular", f"Expected regular, got {result['classification']}"
    assert result["edge_type"] == "HAS_SCOPES"
    print("✓ Regular scopes correctly classified")


def test_enhanced_app_role_classification():
    """Test enhanced app role classification."""
    print("\n=== Testing Enhanced App Role Classification ===")
    
    # Test ReadWrite.All (highest weight)
    weight = classify_app_role_value("Directory.ReadWrite.All")
    assert weight == 60, f"Expected weight=60 for ReadWrite.All, got {weight}"
    print(f"✓ ReadWrite.All app role: weight={weight}")
    
    # Test Action (second highest weight)
    weight = classify_app_role_value("Application.ReadWrite.Action")
    assert weight == 55, f"Expected weight=55 for Action, got {weight}"
    print(f"✓ Action app role: weight={weight}")
    
    # Test high write markers (third highest)
    weight = classify_app_role_value("Directory.ReadWrite")
    assert weight == 50, f"Expected weight=50 for high write, got {weight}"
    print(f"✓ High write app role: weight={weight}")
    
    # Test high read markers
    weight = classify_app_role_value("Directory.Read.All")
    assert weight == 25, f"Expected weight=25 for high read, got {weight}"
    print(f"✓ High read app role: weight={weight}")
    
    # Test default
    weight = classify_app_role_value("SomeRandomPermission")
    assert weight == 35, f"Expected default weight=35, got {weight}"
    print(f"✓ Default app role: weight={weight}")


def test_tier_based_risk_scoring():
    """Test tier-based risk scoring in compute_risk_for_sp."""
    print("\n=== Testing Tier-Based Risk Scoring ===")
    
    # Mock directory cache
    class MockCache:
        def get(self, oid):
            return None
    
    # Mock role definitions
    role_defs = {
        "62e90394-69f5-4237-9190-012177145e10": {  # Global Admin
            "id": "62e90394-69f5-4237-9190-012177145e10",
            "displayName": "Global Administrator"
        },
        "729827e3-9c14-49f7-bb1b-9608f156bbb8": {  # Security Reader
            "id": "729827e3-9c14-49f7-bb1b-9608f156bbb8",
            "displayName": "Security Reader"
        }
    }
    
    # Test SP with Tier 0 role
    dir_role_assignments = [
        {"roleDefinitionId": "62e90394-69f5-4237-9190-012177145e10"}
    ]
    
    sp = {"verifiedPublisher": None, "replyUrls": [], "info": {}}
    risk = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner1"}],
        requires_assignment=True,
        dir_role_assignments=dir_role_assignments,
        sp_display="Test SP",
        dir_cache=MockCache(),
        role_defs=role_defs,
        has_readwrite_all_scopes=False,
        has_action_scopes=False,
    )
    
    # Check that PRIVILEGE reason exists
    privilege_reason = next((r for r in risk["reasons"] if r["code"] == "PRIVILEGE"), None)
    assert privilege_reason is not None, "PRIVILEGE reason should exist"
    assert privilege_reason["rolesReachableTier0"] == 1, "Should have 1 Tier 0 role"
    assert privilege_reason["rolesReachableTier1"] == 0, "Should have 0 Tier 1 roles"
    
    # Weight should be higher for Tier 0 (base=15 + per_role=25 = 40)
    assert privilege_reason["weight"] == 40, f"Expected weight=40 for 1 Tier 0 role, got {privilege_reason['weight']}"
    print(f"✓ Tier 0 role scoring: weight={privilege_reason['weight']}")
    
    # Test with Tier 2 role
    dir_role_assignments = [
        {"roleDefinitionId": "729827e3-9c14-49f7-bb1b-9608f156bbb8"}
    ]
    
    risk = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner1"}],
        requires_assignment=True,
        dir_role_assignments=dir_role_assignments,
        sp_display="Test SP",
        dir_cache=MockCache(),
        role_defs=role_defs,
        has_readwrite_all_scopes=False,
        has_action_scopes=False,
    )
    
    privilege_reason = next((r for r in risk["reasons"] if r["code"] == "PRIVILEGE"), None)
    assert privilege_reason["rolesReachableTier2"] == 1, "Should have 1 Tier 2 role"
    # Tier 2: base=3 + per_role=3 = 6
    assert privilege_reason["weight"] == 6, f"Expected weight=6 for 1 Tier 2 role, got {privilege_reason['weight']}"
    print(f"✓ Tier 2 role scoring: weight={privilege_reason['weight']}")
    print("✓ Tier 0 scores higher than Tier 2 (40 > 6)")


def test_new_scope_scoring():
    """Test new scope types in risk scoring."""
    print("\n=== Testing New Scope Type Scoring ===")
    
    class MockCache:
        def get(self, oid):
            return None
    
    sp = {"verifiedPublisher": None, "replyUrls": [], "info": {}}
    
    # Test ReadWrite.All scoring
    risk = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test SP",
        dir_cache=MockCache(),
        has_readwrite_all_scopes=True,
        has_action_scopes=False,
    )
    
    readwrite_reason = next((r for r in risk["reasons"] if r["code"] == "HAS_READWRITE_ALL_SCOPES"), None)
    assert readwrite_reason is not None, "HAS_READWRITE_ALL_SCOPES reason should exist"
    assert readwrite_reason["weight"] == 30, f"Expected weight=30, got {readwrite_reason['weight']}"
    print(f"✓ ReadWrite.All scope scoring: weight={readwrite_reason['weight']}")
    
    # Test Action scope scoring
    risk = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[{"id": "owner1"}],
        requires_assignment=True,
        dir_role_assignments=[],
        sp_display="Test SP",
        dir_cache=MockCache(),
        has_readwrite_all_scopes=False,
        has_action_scopes=True,
    )
    
    action_reason = next((r for r in risk["reasons"] if r["code"] == "HAS_PRIVILEGED_ACTION_SCOPES"), None)
    assert action_reason is not None, "HAS_PRIVILEGED_ACTION_SCOPES reason should exist"
    assert action_reason["weight"] == 25, f"Expected weight=25, got {action_reason['weight']}"
    print(f"✓ Action scope scoring: weight={action_reason['weight']}")


if __name__ == "__main__":
    print("Running Tier Scoring Tests...")
    
    try:
        test_role_tier_mapping()
        test_tier_config()
        test_enhanced_scope_classification()
        test_enhanced_app_role_classification()
        test_tier_based_risk_scoring()
        test_new_scope_scoring()
        
        print("\n" + "="*50)
        print("✅ All tests passed!")
        print("="*50)
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
