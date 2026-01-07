#!/usr/bin/env python3
"""
Unit tests for external identity posture feature.

Tests JWT parsing, token permission gating, and risk amplifier logic.
"""

import sys
import os
import json

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import oidsee_scanner


def test_jwt_parsing_delegated():
    """Test JWT parsing for delegated token with Policy.Read.All."""
    print("\n=== Testing JWT Parsing (Delegated) ===")
    
    # Create a test JWT with delegated scopes including Policy.Read.All
    # Format: header.payload.signature (we only parse payload)
    # Payload: {"scp": "User.Read Policy.Read.All Directory.Read.All", "appid": "test"}
    payload_json = '{"scp": "User.Read Policy.Read.All Directory.Read.All", "appid": "test"}'
    import base64
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
    test_token = f"eyJhbGciOiJSUzI1NiJ9.{payload_b64}.signature"
    
    # Test parse_jwt_payload
    payload = oidsee_scanner.parse_jwt_payload(test_token)
    assert payload.get('scp') == 'User.Read Policy.Read.All Directory.Read.All', "JWT payload parsing failed"
    print("✓ JWT payload parsing successful")
    
    # Test get_token_permissions
    perms = oidsee_scanner.get_token_permissions(test_token)
    assert perms['tokenType'] == 'delegated', f"Expected delegated token, got {perms['tokenType']}"
    assert perms['hasPolicyReadAll'] == True, "Should detect Policy.Read.All in delegated token"
    assert 'Policy.Read.All' in perms['scopes'], "Policy.Read.All should be in scopes list"
    print("✓ Token permissions detection successful (delegated with Policy.Read.All)")
    
    return True


def test_jwt_parsing_app_only():
    """Test JWT parsing for app-only token with Policy.Read.All."""
    print("\n=== Testing JWT Parsing (App-Only) ===")
    
    # Create a test JWT with app roles including Policy.Read.All
    # Payload: {"roles": ["Directory.Read.All", "Policy.Read.All"], "appid": "test"}
    payload_json = '{"roles": ["Directory.Read.All", "Policy.Read.All"], "appid": "test"}'
    import base64
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
    test_token = f"eyJhbGciOiJSUzI1NiJ9.{payload_b64}.signature"
    
    # Test get_token_permissions
    perms = oidsee_scanner.get_token_permissions(test_token)
    assert perms['tokenType'] == 'app-only', f"Expected app-only token, got {perms['tokenType']}"
    assert perms['hasPolicyReadAll'] == True, "Should detect Policy.Read.All in app-only token"
    assert 'Policy.Read.All' in perms['roles'], "Policy.Read.All should be in roles list"
    print("✓ Token permissions detection successful (app-only with Policy.Read.All)")
    
    return True


def test_jwt_parsing_without_policy_read():
    """Test JWT parsing for token without Policy.Read.All."""
    print("\n=== Testing JWT Parsing (No Policy.Read.All) ===")
    
    # Create a test JWT without Policy.Read.All
    # Payload: {"scp": "User.Read Directory.Read.All", "appid": "test"}
    payload_json = '{"scp": "User.Read Directory.Read.All", "appid": "test"}'
    import base64
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode().rstrip('=')
    test_token = f"eyJhbGciOiJSUzI1NiJ9.{payload_b64}.signature"
    
    # Test get_token_permissions
    perms = oidsee_scanner.get_token_permissions(test_token)
    assert perms['tokenType'] == 'delegated', f"Expected delegated token, got {perms['tokenType']}"
    assert perms['hasPolicyReadAll'] == False, "Should NOT detect Policy.Read.All when not present"
    print("✓ Token permissions detection successful (no Policy.Read.All)")
    
    return True


def test_jwt_parsing_invalid():
    """Test JWT parsing for invalid token."""
    print("\n=== Testing JWT Parsing (Invalid Token) ===")
    
    # Test with invalid token
    perms = oidsee_scanner.get_token_permissions("invalid.token.here")
    assert perms['tokenType'] == 'unknown', "Invalid token should return unknown type"
    assert perms['hasPolicyReadAll'] == False, "Invalid token should not have Policy.Read.All"
    print("✓ Invalid token handling successful")
    
    return True


def test_risk_amplifier_gating():
    """Test that risk amplifier is only applied when conditions are met."""
    print("\n=== Testing Risk Amplifier Gating ===")
    
    # Mock data
    sp = {
        'id': 'test-sp',
        'displayName': 'Test App',
        'appDisplayName': 'Test App',
        'verifiedPublisher': None,
    }
    
    # Create mock DirectoryCache
    class MockDirectoryCache:
        def __init__(self):
            self.data = {}
    
    dir_cache = MockDirectoryCache()
    
    # Test 1: Permissive posture + BROAD_REACHABILITY (should apply amplifier)
    print("\n  Test 1: Permissive posture + broad reachability")
    tenant_posture = {
        'postureRating': 'permissive',
        'guestAccess': 'permissive',
        'crossTenantDefaultStance': 'permissive',
    }
    
    risk = oidsee_scanner.compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[],
        requires_assignment=False,  # This triggers BROAD_REACHABILITY
        dir_role_assignments=[],
        sp_display='Test App',
        dir_cache=dir_cache,
        tenant_posture=tenant_posture,
    )
    
    # Check if amplifier was applied
    has_amplifier = any(r.get('code') == 'EXTERNAL_IDENTITY_POSTURE_AMPLIFIER' for r in risk['reasons'])
    assert has_amplifier, "Amplifier should be applied with permissive posture + broad reachability"
    print("  ✓ Amplifier correctly applied")
    
    # Test 2: Hardened posture (should NOT apply amplifier)
    print("\n  Test 2: Hardened posture (no amplifier)")
    tenant_posture_hardened = {
        'postureRating': 'hardened',
        'guestAccess': 'restricted',
        'crossTenantDefaultStance': 'restrictive',
    }
    
    risk2 = oidsee_scanner.compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[],
        requires_assignment=False,
        dir_role_assignments=[],
        sp_display='Test App',
        dir_cache=dir_cache,
        tenant_posture=tenant_posture_hardened,
    )
    
    has_amplifier2 = any(r.get('code') == 'EXTERNAL_IDENTITY_POSTURE_AMPLIFIER' for r in risk2['reasons'])
    assert not has_amplifier2, "Amplifier should NOT be applied with hardened posture"
    print("  ✓ Amplifier correctly NOT applied with hardened posture")
    
    # Test 3: Permissive posture but no risky conditions (should NOT apply amplifier)
    print("\n  Test 3: Permissive posture but no risky conditions")
    risk3 = oidsee_scanner.compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=['owner1'],  # Has owner
        requires_assignment=True,  # Requires assignment (not broadly reachable)
        dir_role_assignments=[],
        sp_display='Test App',
        dir_cache=dir_cache,
        tenant_posture=tenant_posture,
    )
    
    has_amplifier3 = any(r.get('code') == 'EXTERNAL_IDENTITY_POSTURE_AMPLIFIER' for r in risk3['reasons'])
    assert not has_amplifier3, "Amplifier should NOT be applied without risky conditions"
    print("  ✓ Amplifier correctly NOT applied without risky conditions")
    
    print("\n✓ All risk amplifier gating tests passed")
    return True


def test_conservative_language():
    """Test that risk amplifier uses conservative language."""
    print("\n=== Testing Conservative Language ===")
    
    # Check scoring_logic.json for appropriate language
    with open('scoring_logic.json', 'r') as f:
        config = json.load(f)
    
    amplifier_config = config['compute_risk_for_sp']['scoring_contributors'].get('EXTERNAL_IDENTITY_POSTURE_AMPLIFIER', {})
    
    description = amplifier_config.get('description', '').lower()
    details = amplifier_config.get('details', '').lower()
    
    # Check for appropriate terms
    assert 'amplifies' in description or 'amplifies' in details, "Should use 'amplifies' language"
    assert 'blast radius' in description or 'blast radius' in details, "Should mention 'blast radius'"
    assert 'reduces attacker cost' in details, "Should mention 'reduces attacker cost'"
    
    # Check that exploitability claims are NOT present
    forbidden_terms = ['allows escalation', 'enables escalation', 'exploitable', 'allows privilege']
    for term in forbidden_terms:
        assert term not in description, f"Should NOT use '{term}' in description"
        assert term not in details, f"Should NOT use '{term}' in details"
    
    print("✓ Conservative language verified in scoring_logic.json")
    return True


def main():
    """Run all tests."""
    print("=" * 60)
    print("External Identity Posture Feature Tests")
    print("=" * 60)
    
    all_passed = True
    
    try:
        all_passed &= test_jwt_parsing_delegated()
        all_passed &= test_jwt_parsing_app_only()
        all_passed &= test_jwt_parsing_without_policy_read()
        all_passed &= test_jwt_parsing_invalid()
        all_passed &= test_risk_amplifier_gating()
        all_passed &= test_conservative_language()
    except Exception as e:
        print(f"\n✗ Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED")
    else:
        print("✗ SOME TESTS FAILED")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
