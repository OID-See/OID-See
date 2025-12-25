#!/usr/bin/env python3
"""
Test to verify that ServicePrincipals with empty replyUrls are not inappropriately flagged.

This test ensures that reply URL validation checks (REPLY_URL_ANOMALIES, MIXED_REPLYURL_DOMAINS,
REPLYURL_OUTLIER_DOMAIN) are only performed when there are actual reply URLs to analyze (total_urls > 0).
"""

import sys
from typing import Dict, Any

# Import the functions we're testing
from oidsee_scanner import (
    compute_risk_for_sp,
    analyze_reply_urls,
    check_mixed_replyurl_domains,
    SCORING_CONFIG
)


class MockCache:
    """Mock DirectoryCache for testing."""
    def get(self, oid):
        return None


def test_empty_replyurls_no_false_positives():
    """Test that SPs with empty replyUrls don't trigger reply URL checks."""
    print("\n=== Testing Empty replyUrls (No False Positives) ===")
    
    # Service principal with empty replyUrls (matching the problem statement example)
    sp = {
        "id": "sp:microsoft-azure-syncfabric",
        "displayName": "Microsoft Azure Sync Fabric",
        "replyUrls": [],
        "homepage": None,
        "info": {},
        "appRoleAssignmentRequired": False,
    }
    
    # Analyze reply URLs
    reply_url_analysis = analyze_reply_urls(sp.get("replyUrls", []))
    
    # Verify analysis shows no URLs
    if reply_url_analysis["total_urls"] != 0:
        print(f"✗ FAIL: Expected total_urls=0, got {reply_url_analysis['total_urls']}")
        return False
    
    print(f"✓ PASS: Reply URL analysis shows total_urls=0")
    
    # Check mixed domains
    mixed_domains_result = check_mixed_replyurl_domains(
        sp.get("replyUrls", []),
        sp.get("homepage"),
        sp.get("info", {})
    )
    
    # Verify mixed domains check returns empty result
    if mixed_domains_result["has_mixed_domains"]:
        print(f"✗ FAIL: Expected has_mixed_domains=False for empty replyUrls")
        return False
    
    print(f"✓ PASS: Mixed domains check correctly returns has_mixed_domains=False")
    
    # Compute risk
    mock_cache = MockCache()
    risk = compute_risk_for_sp(
        sp=sp,
        has_impersonation=False,
        has_offline_access=False,
        app_role_max_weight=0,
        has_privileged_scopes=False,
        has_too_many_scopes=False,
        delegated_scopes_by_resource={},
        assignments=[],
        owners=[],
        requires_assignment=False,
        dir_role_assignments=[{"directoryRoleId": "role1"}],  # 1 assignment as in example
        sp_display="Microsoft Azure Sync Fabric",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
    )
    
    # Check that NO reply URL related risk reasons are present
    # This includes URL-based checks AND attribution/deception checks that only matter with OAuth flows
    reply_url_related_codes = [
        "REPLY_URL_ANOMALIES",
        "MIXED_REPLYURL_DOMAINS",
        "REPLYURL_OUTLIER_DOMAIN",
        "DECEPTION",  # Name mismatch only matters in user-facing OAuth flows
        "IDENTITY_LAUNDERING",  # Attribution confusion only matters in user-facing OAuth flows
    ]
    
    found_reply_url_reasons = [
        reason for reason in risk["reasons"]
        if reason["code"] in reply_url_related_codes
    ]
    
    if found_reply_url_reasons:
        print(f"✗ FAIL: Found inappropriate reply URL related reasons for empty replyUrls:")
        for reason in found_reply_url_reasons:
            print(f"  - {reason['code']}: {reason['message']}")
        return False
    
    print(f"✓ PASS: No reply URL related reasons found (as expected)")
    
    # Verify that other risk reasons are still calculated correctly
    # The example shows BROAD_REACHABILITY and PRIVILEGE, so let's verify those can still appear
    other_reasons = [reason["code"] for reason in risk["reasons"]]
    
    # BROAD_REACHABILITY should be present (appRoleAssignmentRequired=False with no assignments)
    if "BROAD_REACHABILITY" in other_reasons:
        print(f"✓ PASS: BROAD_REACHABILITY correctly triggered (independent of reply URLs)")
    
    # PRIVILEGE should be present (1 directory role assignment)
    if "PRIVILEGE" in other_reasons:
        print(f"✓ PASS: PRIVILEGE correctly triggered (independent of reply URLs)")
    
    print(f"\nRisk Score: {risk['score']}")
    print(f"Risk Reasons: {[r['code'] for r in risk['reasons']]}")
    
    return True


def test_nonempty_replyurls_checks_applied():
    """Test that SPs with reply URLs DO trigger appropriate checks."""
    print("\n=== Testing Non-Empty replyUrls (Checks Applied) ===")
    
    # Service principal with problematic reply URLs
    sp = {
        "id": "sp:test-app",
        "displayName": "Test App",
        "replyUrls": [
            "http://insecure.example.com/callback",  # Non-HTTPS
            "https://evil.com/steal",  # Mixed domain
        ],
        "homepage": "https://example.com",
        "info": {},
        "appRoleAssignmentRequired": True,
    }
    
    # Analyze reply URLs
    reply_url_analysis = analyze_reply_urls(sp.get("replyUrls", []))
    
    # Verify analysis shows URLs
    if reply_url_analysis["total_urls"] != 2:
        print(f"✗ FAIL: Expected total_urls=2, got {reply_url_analysis['total_urls']}")
        return False
    
    print(f"✓ PASS: Reply URL analysis shows total_urls=2")
    
    # Compute risk
    mock_cache = MockCache()
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
        sp_display="Test App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
    )
    
    # Check that reply URL related risk reasons ARE present
    reply_url_related_codes = [
        "REPLY_URL_ANOMALIES",
        "MIXED_REPLYURL_DOMAINS",
        "REPLYURL_OUTLIER_DOMAIN",
    ]
    
    found_reply_url_reasons = [
        reason["code"] for reason in risk["reasons"]
        if reason["code"] in reply_url_related_codes
    ]
    
    if not found_reply_url_reasons:
        print(f"✗ FAIL: Expected reply URL related reasons for non-empty replyUrls, but found none")
        return False
    
    print(f"✓ PASS: Reply URL related reasons found: {found_reply_url_reasons}")
    
    # Verify specific checks are triggered
    if "REPLY_URL_ANOMALIES" in found_reply_url_reasons:
        print(f"✓ PASS: REPLY_URL_ANOMALIES correctly triggered for non-HTTPS URL")
    
    if "MIXED_REPLYURL_DOMAINS" in found_reply_url_reasons or "REPLYURL_OUTLIER_DOMAIN" in found_reply_url_reasons:
        print(f"✓ PASS: Mixed domain checks correctly triggered")
    
    return True


def test_single_valid_replyurl():
    """Test that SPs with a single valid reply URL don't trigger inappropriate checks."""
    print("\n=== Testing Single Valid replyUrl ===")
    
    # Service principal with a single valid reply URL
    sp = {
        "id": "sp:valid-app",
        "displayName": "Valid App",
        "replyUrls": ["https://example.com/callback"],
        "homepage": "https://example.com",
        "info": {},
        "appRoleAssignmentRequired": True,
    }
    
    # Analyze reply URLs
    reply_url_analysis = analyze_reply_urls(sp.get("replyUrls", []))
    
    # Verify analysis shows 1 URL
    if reply_url_analysis["total_urls"] != 1:
        print(f"✗ FAIL: Expected total_urls=1, got {reply_url_analysis['total_urls']}")
        return False
    
    print(f"✓ PASS: Reply URL analysis shows total_urls=1")
    
    # Compute risk
    mock_cache = MockCache()
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
        sp_display="Valid App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
    )
    
    # Check that NO reply URL anomaly reasons are present (it's a valid HTTPS URL)
    anomaly_reasons = [
        reason for reason in risk["reasons"]
        if reason["code"] == "REPLY_URL_ANOMALIES"
    ]
    
    if anomaly_reasons:
        print(f"✗ FAIL: Found inappropriate anomaly reasons for valid reply URL:")
        for reason in anomaly_reasons:
            print(f"  - {reason['code']}: {reason['message']}")
        return False
    
    print(f"✓ PASS: No anomaly reasons for valid HTTPS reply URL")
    
    # Mixed domain checks should also not trigger (single domain)
    mixed_domain_reasons = [
        reason for reason in risk["reasons"]
        if reason["code"] in ["MIXED_REPLYURL_DOMAINS", "REPLYURL_OUTLIER_DOMAIN"]
    ]
    
    if mixed_domain_reasons:
        print(f"✗ FAIL: Found inappropriate mixed domain reasons for single domain:")
        for reason in mixed_domain_reasons:
            print(f"  - {reason['code']}: {reason['message']}")
        return False
    
    print(f"✓ PASS: No mixed domain reasons for single domain")
    
    return True


def test_deception_and_identity_laundering_gating():
    """Test that DECEPTION and IDENTITY_LAUNDERING are gated by total_urls > 0."""
    print("\n=== Testing DECEPTION and IDENTITY_LAUNDERING Gating ===")
    
    from oidsee_scanner import MICROSOFT_TENANT_IDS
    
    # Test with conditions that would trigger both checks, but NO replyUrls
    print("\n1. Testing without replyUrls:")
    sp_no_urls = {
        "id": "sp:deceptive-app",
        "displayName": "Microsoft Awesome App",
        "publisherName": "Totally Different Publisher",  # Name mismatch
        "appOwnerOrganizationId": MICROSOFT_TENANT_IDS[0],  # Microsoft tenant
        "replyUrls": [],
        "homepage": None,
        "info": {},
        "verifiedPublisher": None,  # Unverified
        "appRoleAssignmentRequired": True,
    }
    
    reply_url_analysis_no_urls = analyze_reply_urls(sp_no_urls.get("replyUrls", []))
    mock_cache = MockCache()
    risk_no_urls = compute_risk_for_sp(
        sp=sp_no_urls,
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
        sp_display="Microsoft Awesome App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis_no_urls,
    )
    
    deception_no_urls = any(r["code"] == "DECEPTION" for r in risk_no_urls["reasons"])
    identity_laundering_no_urls = any(r["code"] == "IDENTITY_LAUNDERING" for r in risk_no_urls["reasons"])
    
    if deception_no_urls:
        print(f"   ✗ FAIL: DECEPTION found without replyUrls")
        return False
    else:
        print(f"   ✓ PASS: DECEPTION not triggered without replyUrls")
    
    if identity_laundering_no_urls:
        print(f"   ✗ FAIL: IDENTITY_LAUNDERING found without replyUrls")
        return False
    else:
        print(f"   ✓ PASS: IDENTITY_LAUNDERING not triggered without replyUrls")
    
    # Test with same conditions but WITH replyUrls
    print("\n2. Testing with replyUrls:")
    sp_with_urls = {
        "id": "sp:deceptive-app-with-urls",
        "displayName": "Microsoft Awesome App",
        "publisherName": "Totally Different Publisher",  # Name mismatch
        "appOwnerOrganizationId": MICROSOFT_TENANT_IDS[0],  # Microsoft tenant
        "replyUrls": ["https://example.com/callback"],
        "homepage": None,
        "info": {},
        "verifiedPublisher": None,  # Unverified
        "appRoleAssignmentRequired": True,
    }
    
    reply_url_analysis_with_urls = analyze_reply_urls(sp_with_urls.get("replyUrls", []))
    risk_with_urls = compute_risk_for_sp(
        sp=sp_with_urls,
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
        sp_display="Microsoft Awesome App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis_with_urls,
    )
    
    deception_with_urls = any(r["code"] == "DECEPTION" for r in risk_with_urls["reasons"])
    identity_laundering_with_urls = any(r["code"] == "IDENTITY_LAUNDERING" for r in risk_with_urls["reasons"])
    
    if not deception_with_urls:
        print(f"   ✗ FAIL: DECEPTION not found with replyUrls (should be present)")
        return False
    else:
        print(f"   ✓ PASS: DECEPTION triggered with replyUrls")
    
    if not identity_laundering_with_urls:
        print(f"   ✗ FAIL: IDENTITY_LAUNDERING not found with replyUrls (should be present)")
        return False
    else:
        print(f"   ✓ PASS: IDENTITY_LAUNDERING triggered with replyUrls")
    
    return True


def main():
    """Run all tests."""
    print("=" * 70)
    print("Empty replyUrls Test Suite")
    print("=" * 70)
    
    all_passed = True
    
    # Run all test functions
    all_passed = all_passed and test_empty_replyurls_no_false_positives()
    all_passed = all_passed and test_nonempty_replyurls_checks_applied()
    all_passed = all_passed and test_single_valid_replyurl()
    all_passed = all_passed and test_deception_and_identity_laundering_gating()
    
    print("\n" + "=" * 70)
    if all_passed:
        print("✓ ALL TESTS PASSED")
        print("=" * 70)
        return 0
    else:
        print("✗ SOME TESTS FAILED")
        print("=" * 70)
        return 1


if __name__ == "__main__":
    sys.exit(main())
