#!/usr/bin/env python3
"""
Test enrichment functionality.
"""

import sys
from oidsee_scanner import enrich_reply_urls


def test_enrichment_disabled():
    """Test that enrichment returns empty results when disabled."""
    print("\n=== Testing Enrichment Disabled ===")
    
    reply_urls = [
        "https://app.contoso.com/callback",
        "https://example.com/oauth"
    ]
    
    result = enrich_reply_urls(reply_urls, enable_dns=False, enable_rdap=False, enable_ipwhois=False)
    
    if not result.get("dns_lookups") and not result.get("rdap_queries") and not result.get("ipwhois_queries"):
        print("✓ PASS: No enrichment performed when disabled")
        return True
    else:
        print("✗ FAIL: Enrichment performed when disabled")
        return False


def test_dns_enrichment():
    """Test DNS enrichment."""
    print("\n=== Testing DNS Enrichment ===")
    
    reply_urls = [
        "https://www.google.com/callback",
        "https://github.com/oauth"
    ]
    
    result = enrich_reply_urls(reply_urls, enable_dns=True, enable_rdap=False, enable_ipwhois=False)
    
    # Check if DNS lookups were attempted
    if "dns_lookups" in result and len(result["dns_lookups"]) > 0:
        print(f"✓ PASS: DNS lookups performed for {len(result['dns_lookups'])} domains")
        for domain, lookup_result in result["dns_lookups"].items():
            if lookup_result.get("success"):
                print(f"  - {domain}: {len(lookup_result.get('resolved_ips', []))} IPs resolved")
            else:
                print(f"  - {domain}: lookup failed")
        return True
    else:
        print("✗ FAIL: DNS lookups not performed")
        return False


def test_enrichment_with_wildcards():
    """Test that wildcard URLs are skipped during enrichment."""
    print("\n=== Testing Enrichment with Wildcard URLs ===")
    
    reply_urls = [
        "https://app.contoso.com/callback",
        "https://*.contoso.com/wildcard"
    ]
    
    result = enrich_reply_urls(reply_urls, enable_dns=True, enable_rdap=False, enable_ipwhois=False)
    
    # Wildcard URLs should be skipped
    if "dns_lookups" in result:
        domains = list(result["dns_lookups"].keys())
        if "*.contoso.com" not in domains and "contoso.com" not in domains:
            print("✓ PASS: Wildcard URLs skipped during enrichment")
            return True
    
    print("✗ FAIL: Wildcard URLs not properly handled")
    return False


def test_ip_literal_detection():
    """Test that IP literals are detected."""
    print("\n=== Testing IP Literal Detection ===")
    
    reply_urls = [
        "https://192.168.1.1/callback",
        "https://10.0.0.1/oauth"
    ]
    
    result = enrich_reply_urls(reply_urls, enable_dns=False, enable_rdap=False, enable_ipwhois=True)
    
    # Check that IP WHOIS placeholder errors are present
    if result.get("enrichment_errors"):
        ip_errors = [e for e in result["enrichment_errors"] if e.get("type") == "ipwhois"]
        if len(ip_errors) > 0:
            print(f"✓ PASS: IP literals detected ({len(ip_errors)} IPs)")
            return True
    
    print("✗ FAIL: IP literals not detected")
    return False


def test_enrichment_error_handling():
    """Test that enrichment errors don't crash."""
    print("\n=== Testing Enrichment Error Handling ===")
    
    reply_urls = [
        "https://nonexistent-domain-that-should-not-exist-123456789.com/callback"
    ]
    
    try:
        result = enrich_reply_urls(reply_urls, enable_dns=True, enable_rdap=False, enable_ipwhois=False)
        
        # Should have enrichment errors but not crash
        if "enrichment_errors" in result:
            print("✓ PASS: Enrichment errors handled gracefully")
            return True
        else:
            print("✓ PASS: No errors encountered (domain might exist)")
            return True
    except Exception as e:
        print(f"✗ FAIL: Enrichment crashed with error: {e}")
        return False


def main():
    """Run all enrichment tests."""
    print("=" * 60)
    print("Enrichment Functionality Tests")
    print("=" * 60)
    
    all_passed = True
    all_passed &= test_enrichment_disabled()
    all_passed &= test_dns_enrichment()
    all_passed &= test_enrichment_with_wildcards()
    all_passed &= test_ip_literal_detection()
    all_passed &= test_enrichment_error_handling()
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL ENRICHMENT TESTS PASSED")
    else:
        print("✗ SOME ENRICHMENT TESTS FAILED")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
