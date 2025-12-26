#!/usr/bin/env python3
"""
Test to verify that RDAP/WHOIS enrichment data is used to filter false positives
for REPLYURL_OUTLIER_DOMAIN and MIXED_REPLYURL_DOMAINS checks.

This addresses the issue where Microsoft-owned domains (microsoft.com, microsoftonline.com,
office.com, etc.) were being flagged as outliers even though RDAP/WHOIS shows they all
belong to Microsoft Corporation.

Also verifies that enrichment summary is properly formatted without raw RDAP/WHOIS data.
"""

import sys
from typing import Dict, Any

# Import the functions we're testing
from oidsee_scanner import (
    compute_risk_for_sp,
    analyze_reply_urls,
    MICROSOFT_TENANT_IDS,
    _create_enrichment_summary
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


def test_enrichment_summary_format():
    """Test that enrichment summary is properly formatted without raw data."""
    print("\n=== Testing Enrichment Summary Format ===")
    
    # Create enrichment data with raw RDAP data
    enrichment_data = {
        "rdap_queries": {
            "microsoft.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Microsoft Corporation"},
                    "objects": {}
                },
                "asn": "8075",
                "asn_description": "MICROSOFT-CORP-MSN-AS-BLOCK"
            },
            "office.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "Microsoft Corporation"},
                    "objects": {}
                },
                "asn": "8075",
                "asn_description": "MICROSOFT-CORP-MSN-AS-BLOCK"
            },
            "evil.com": {
                "success": False,
                "error": "Lookup failed"
            }
        }
    }
    
    domains = ["microsoft.com", "office.com", "evil.com"]
    
    # Generate summary
    summary = _create_enrichment_summary(enrichment_data, domains)
    
    if not summary:
        print("   ✗ FAIL: Summary should not be None")
        return False
    
    # Verify summary structure
    expected_keys = ["domains_analyzed", "domains_enriched", "same_organization", "organizations_found", "domain_details"]
    for key in expected_keys:
        if key not in summary:
            print(f"   ✗ FAIL: Missing key '{key}' in summary")
            return False
    
    print(f"   ✓ PASS: Summary has all expected keys")
    
    # Verify no raw_data in summary
    summary_str = str(summary)
    if "raw_data" in summary_str:
        print(f"   ✗ FAIL: Summary contains raw_data (should be omitted)")
        return False
    
    print(f"   ✓ PASS: Summary does not contain raw_data")
    
    # Verify same_organization flag
    if summary["same_organization"] != True:
        print(f"   ✗ FAIL: Expected same_organization=True, got {summary['same_organization']}")
        return False
    
    print(f"   ✓ PASS: same_organization correctly set to True")
    
    # Verify organizations found
    if len(summary["organizations_found"]) != 1:
        print(f"   ✗ FAIL: Expected 1 organization, found {len(summary['organizations_found'])}")
        return False
    
    print(f"   ✓ PASS: Found 1 organization: {summary['organizations_found']}")
    
    # Verify domain details
    domain_details = summary["domain_details"]
    if "microsoft.com" not in domain_details:
        print(f"   ✗ FAIL: Missing microsoft.com in domain_details")
        return False
    
    if domain_details["microsoft.com"]["enriched"] != True:
        print(f"   ✗ FAIL: microsoft.com should be marked as enriched")
        return False
    
    if domain_details["microsoft.com"]["organization"] != "Microsoft Corporation":
        print(f"   ✗ FAIL: Wrong organization for microsoft.com")
        return False
    
    print(f"   ✓ PASS: Domain details properly structured")
    
    # Verify failed domain
    if domain_details["evil.com"]["enriched"] != False:
        print(f"   ✗ FAIL: evil.com should be marked as not enriched")
        return False
    
    print(f"   ✓ PASS: Failed domains properly handled")
    
    return True


def test_organization_name_normalization():
    """Test that organization name variations are properly normalized."""
    print("\n=== Testing Organization Name Normalization ===")
    
    from oidsee_scanner import _normalize_organization_name
    
    # Test Microsoft variations
    test_cases = [
        ("MICROSOFT", "microsoft"),
        ("MSFT", "microsoft"),
        ("Microsoft Corporation", "microsoft"),
        ("Microsoft Corp.", "microsoft"),
        ("Microsoft Corp", "microsoft"),
        ("microsoft", "microsoft"),
        ("Microsoft Services", "microsoft"),
        ("Microsoft Service", "microsoft"),
    ]
    
    all_passed = True
    for input_name, expected_normalized in test_cases:
        result = _normalize_organization_name(input_name)
        if result != expected_normalized:
            print(f"   ✗ FAIL: '{input_name}' → '{result}', expected '{expected_normalized}'")
            all_passed = False
        else:
            print(f"   ✓ PASS: '{input_name}' → '{result}'")
    
    if not all_passed:
        return False
    
    # Test that variations map to same normalized form
    print("\n   Testing that MICROSOFT and MSFT normalize to the same value:")
    microsoft_norm = _normalize_organization_name("MICROSOFT")
    msft_norm = _normalize_organization_name("MSFT")
    
    if microsoft_norm != msft_norm:
        print(f"   ✗ FAIL: MICROSOFT → '{microsoft_norm}', MSFT → '{msft_norm}' (should be equal)")
        return False
    
    print(f"   ✓ PASS: Both normalize to '{microsoft_norm}'")
    
    # Test enrichment with variations
    print("\n   Testing enrichment with organization name variations:")
    enrichment_data = {
        "rdap_queries": {
            "office.com": {
                "success": True,
                "raw_data": {
                    "network": {"name": "MSFT"},
                    "objects": {}
                },
                "asn": "8068",
                "asn_description": "MICROSOFT-CORP-MSN-AS-BLOCK, US"
            },
            "office365.us": {
                "success": True,
                "raw_data": {
                    "network": {"name": "MICROSOFT"},
                    "objects": {}
                },
                "asn": "8070",
                "asn_description": "MICROSOFT-CORP-MSN-AS-BLOCK, US"
            }
        }
    }
    
    domains = ["office.com", "office365.us"]
    summary = _create_enrichment_summary(enrichment_data, domains)
    
    if not summary:
        print("   ✗ FAIL: Summary should not be None")
        return False
    
    # Should recognize MSFT and MICROSOFT as the same organization
    if summary["same_organization"] != True:
        print(f"   ✗ FAIL: Expected same_organization=True, got {summary['same_organization']}")
        print(f"   Organizations found: {summary['organizations_found']}")
        return False
    
    print(f"   ✓ PASS: MSFT and MICROSOFT recognized as same organization")
    print(f"   Organizations found: {summary['organizations_found']}")
    
    if len(summary["organizations_found"]) != 1:
        print(f"   ✗ FAIL: Expected 1 normalized organization, found {len(summary['organizations_found'])}")
        return False
    
    print(f"   ✓ PASS: Only 1 normalized organization in list")
    
    return True


def main():
    """Run all tests."""
    print("=" * 70)
    print("Enrichment-Based Filtering Test Suite")
    print("=" * 70)
    
    all_passed = True
    
    # Run tests
    all_passed = all_passed and test_enrichment_prevents_false_positives()
    all_passed = all_passed and test_enrichment_summary_format()
    all_passed = all_passed and test_organization_name_normalization()
    
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
