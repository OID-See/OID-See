#!/usr/bin/env python3
"""
Test enrichment functionality including RDAP and IP WHOIS.
"""

import sys
from oidsee_scanner import enrich_reply_urls, _query_rdap_domain, _query_ip_whois


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


def test_rdap_enrichment():
    """Test RDAP enrichment."""
    print("\n=== Testing RDAP Enrichment ===")
    
    # Use a well-known domain
    reply_urls = [
        "https://example.com/callback"
    ]
    
    result = enrich_reply_urls(reply_urls, enable_dns=False, enable_rdap=True, enable_ipwhois=False)
    
    # Check if RDAP queries were attempted
    if "rdap_queries" in result:
        if len(result["rdap_queries"]) > 0:
            print(f"✓ PASS: RDAP queries performed for {len(result['rdap_queries'])} domains")
            for domain, rdap_result in result["rdap_queries"].items():
                if rdap_result.get("success"):
                    print(f"  - {domain}: RDAP data retrieved")
                    if rdap_result.get("registrar"):
                        print(f"    Registrar: {rdap_result.get('registrar')}")
                    if rdap_result.get("status"):
                        print(f"    Status: {', '.join(rdap_result.get('status', []))}")
                else:
                    print(f"  - {domain}: {rdap_result.get('error', 'Unknown error')}")
            return True
        else:
            print("✗ FAIL: No RDAP queries performed")
            return False
    else:
        print("✗ FAIL: RDAP queries not in result")
        return False


def test_ip_whois_enrichment():
    """Test IP WHOIS enrichment."""
    print("\n=== Testing IP WHOIS Enrichment ===")
    
    # Use public IP addresses
    reply_urls = [
        "https://8.8.8.8/callback",  # Google DNS
        "https://1.1.1.1/oauth"       # Cloudflare DNS
    ]
    
    result = enrich_reply_urls(reply_urls, enable_dns=False, enable_rdap=False, enable_ipwhois=True)
    
    # Check if IP WHOIS queries were attempted
    if "ipwhois_queries" in result:
        if len(result["ipwhois_queries"]) > 0:
            print(f"✓ PASS: IP WHOIS queries performed for {len(result['ipwhois_queries'])} IPs")
            for ip, whois_result in result["ipwhois_queries"].items():
                if whois_result.get("success"):
                    print(f"  - {ip}: WHOIS data retrieved")
                    if whois_result.get("organization"):
                        print(f"    Organization: {whois_result.get('organization')}")
                    if whois_result.get("country"):
                        print(f"    Country: {whois_result.get('country')}")
                else:
                    print(f"  - {ip}: {whois_result.get('error', 'Unknown error')}")
            return True
        else:
            print("✗ FAIL: No IP WHOIS queries performed")
            return False
    else:
        print("✗ FAIL: IP WHOIS queries not in result")
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


def test_enrichment_error_handling():
    """Test that enrichment errors don't crash."""
    print("\n=== Testing Enrichment Error Handling ===")
    
    reply_urls = [
        "https://nonexistent-domain-that-should-not-exist-123456789.com/callback"
    ]
    
    try:
        result = enrich_reply_urls(reply_urls, enable_dns=True, enable_rdap=False, enable_ipwhois=False)
        
        # Should have enrichment errors but not crash
        if "enrichment_errors" in result or "dns_lookups" in result:
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
    all_passed &= test_rdap_enrichment()
    all_passed &= test_ip_whois_enrichment()
    all_passed &= test_enrichment_with_wildcards()
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
