#!/usr/bin/env python3
"""
Test to verify that RDAP/WHOIS enrichment data is used to filter false positives
for REPLYURL_OUTLIER_DOMAIN and MIXED_REPLYURL_DOMAINS checks.

This addresses the issue where Microsoft-owned domains (microsoft.com, microsoftonline.com,
office.com, etc.) were being flagged as outliers even though RDAP/WHOIS shows they all
belong to Microsoft Corporation.
"""

import sys
from typing import Dict, Any

# Import the functions we're testing
from oidsee_scanner import (
    compute_risk_for_sp,
    analyze_reply_urls,
    MICROSOFT_TENANT_IDS
)


class MockCache:
    """Mock DirectoryCache for testing."""
    def get(self, oid):
        return None


def test_enrichment_prevents_false_positives():
    """Test that enrichment data prevents false positives for same-organization domains."""
    print("\n=== Testing Enrichment-Based Filtering ===")
    
    # Microsoft app with multiple Microsoft domains
    sp = {
        "id": "sp:microsoft-app",
        "displayName": "Microsoft App",
        "publisherName": "Microsoft Corporation",
        "appOwnerOrganizationId": MICROSOFT_TENANT_IDS[0],
        "replyUrls": [
            "https://microsoft.com/callback",
            "https://microsoftonline.com/callback",
            "https://office.com/callback",
            "https://microsoft365.com/callback"
        ],
        "homepage": "https://microsoft.com",
        "info": {},
        "verifiedPublisher": None,
        "appRoleAssignmentRequired": True,
    }
    
    reply_url_analysis = analyze_reply_urls(sp.get("replyUrls", []))
    mock_cache = MockCache()
    
    # Test 1: Without enrichment data (should give benefit of doubt)
    print("\n1. Without enrichment data:")
    risk_no_enrichment = compute_risk_for_sp(
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
        sp_display="Microsoft App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
        reply_url_enrichment=None,  # No enrichment
    )
    
    outlier_no_enrich = any(r["code"] == "REPLYURL_OUTLIER_DOMAIN" for r in risk_no_enrichment["reasons"])
    mixed_no_enrich = any(r["code"] == "MIXED_REPLYURL_DOMAINS" for r in risk_no_enrichment["reasons"])
    
    print(f"   REPLYURL_OUTLIER_DOMAIN: {outlier_no_enrich}")
    print(f"   MIXED_REPLYURL_DOMAINS: {mixed_no_enrich}")
    
    if not outlier_no_enrich and not mixed_no_enrich:
        print(f"   ✓ PASS: Benefit of doubt given without enrichment")
    else:
        print(f"   ✗ FAIL: Should give benefit of doubt without enrichment")
        return False
    
    # Test 2: With enrichment showing all domains owned by Microsoft
    print("\n2. With enrichment showing same organization:")
    enrichment_same_org = {
        "rdap_queries": {
            "microsoft.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Microsoft Corporation"},
                    "objects": {}
                }
            },
            "microsoftonline.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Microsoft Corporation"},
                    "objects": {}
                }
            },
            "office.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Microsoft Corporation"},
                    "objects": {}
                }
            },
            "microsoft365.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Microsoft Corporation"},
                    "objects": {}
                }
            }
        }
    }
    
    risk_same_org = compute_risk_for_sp(
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
        sp_display="Microsoft App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis,
        reply_url_enrichment=enrichment_same_org,
    )
    
    outlier_same_org = any(r["code"] == "REPLYURL_OUTLIER_DOMAIN" for r in risk_same_org["reasons"])
    mixed_same_org = any(r["code"] == "MIXED_REPLYURL_DOMAINS" for r in risk_same_org["reasons"])
    
    print(f"   REPLYURL_OUTLIER_DOMAIN: {outlier_same_org}")
    print(f"   MIXED_REPLYURL_DOMAINS: {mixed_same_org}")
    
    if not outlier_same_org and not mixed_same_org:
        print(f"   ✓ PASS: Same organization confirmed, no false positive")
    else:
        print(f"   ✗ FAIL: Should not flag when same organization confirmed")
        return False
    
    # Test 3: With enrichment showing different organizations
    print("\n3. With enrichment showing different organizations:")
    enrichment_diff_org = {
        "rdap_queries": {
            "microsoft.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Microsoft Corporation"},
                    "objects": {}
                }
            },
            "evil.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Evil Corporation"},
                    "objects": {}
                }
            }
        }
    }
    
    sp_mixed_orgs = {
        "id": "sp:suspicious-app",
        "displayName": "Suspicious App",
        "publisherName": "Microsoft Corporation",
        "appOwnerOrganizationId": MICROSOFT_TENANT_IDS[0],
        "replyUrls": [
            "https://microsoft.com/callback",
            "https://evil.com/steal"
        ],
        "homepage": "https://microsoft.com",
        "info": {},
        "verifiedPublisher": None,
        "appRoleAssignmentRequired": True,
    }
    
    reply_url_analysis_mixed = analyze_reply_urls(sp_mixed_orgs.get("replyUrls", []))
    
    risk_diff_org = compute_risk_for_sp(
        sp=sp_mixed_orgs,
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
        sp_display="Suspicious App",
        dir_cache=mock_cache,
        reply_url_analysis=reply_url_analysis_mixed,
        reply_url_enrichment=enrichment_diff_org,
    )
    
    outlier_diff_org = any(r["code"] == "REPLYURL_OUTLIER_DOMAIN" for r in risk_diff_org["reasons"])
    mixed_diff_org = any(r["code"] == "MIXED_REPLYURL_DOMAINS" for r in risk_diff_org["reasons"])
    
    print(f"   REPLYURL_OUTLIER_DOMAIN: {outlier_diff_org}")
    print(f"   MIXED_REPLYURL_DOMAINS: {mixed_diff_org}")
    
    if outlier_diff_org or mixed_diff_org:
        print(f"   ✓ PASS: Different organizations detected, correctly flagged")
    else:
        print(f"   ✗ FAIL: Should flag when different organizations detected")
        return False
    
    return True


def main():
    """Run all tests."""
    print("=" * 70)
    print("Enrichment-Based Filtering Test Suite")
    print("=" * 70)
    
    all_passed = True
    
    # Run test
    all_passed = all_passed and test_enrichment_prevents_false_positives()
    
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
