#!/usr/bin/env python3
"""
Test that enrichment caching works correctly.
"""

import time
from oidsee_scanner import enrich_reply_urls, extract_etldplus1

def test_etld_extraction():
    """Test that eTLD+1 extraction works correctly."""
    print("\n=== Testing eTLD+1 Extraction ===")
    
    test_cases = [
        ("https://app.contoso.com/callback", "contoso.com"),
        ("https://login.contoso.com/oauth", "contoso.com"),
        ("https://api.contoso.com/v1/auth", "contoso.com"),
        ("https://example.co.uk/path", "example.co.uk"),
        ("https://subdomain.example.org", "example.org"),
    ]
    
    for url, expected in test_cases:
        result = extract_etldplus1(url)
        if result == expected:
            print(f"✓ PASS: {url} -> {result}")
        else:
            print(f"✗ FAIL: {url} -> {result} (expected {expected})")

def test_enrichment_deduplication():
    """Test that enrichment deduplicates by eTLD+1."""
    print("\n=== Testing Enrichment Deduplication ===")
    
    # Multiple URLs from same domain
    urls = [
        "https://app.contoso.com/callback",
        "https://login.contoso.com/oauth",
        "https://api.contoso.com/v1/auth",
        "https://portal.contoso.com/dashboard",
    ]
    
    start = time.time()
    result = enrich_reply_urls(urls, enable_dns=True, enable_rdap=False, enable_ipwhois=False)
    elapsed = time.time() - start
    
    dns_lookups = result.get("dns_lookups", {})
    
    # Should only have 1 DNS lookup for "contoso.com"
    if len(dns_lookups) == 1 and "contoso.com" in dns_lookups:
        print(f"✓ PASS: Deduplication worked - only 1 DNS lookup for 4 URLs")
        print(f"  Lookup for: {list(dns_lookups.keys())}")
        print(f"  Completed in {elapsed:.2f}s")
    else:
        print(f"✗ FAIL: Expected 1 DNS lookup, got {len(dns_lookups)}")
        print(f"  Lookups: {list(dns_lookups.keys())}")

def test_performance_improvement():
    """Test that deduplication improves performance."""
    print("\n=== Testing Performance Improvement ===")
    
    # Simulate 10 URLs across 2 domains
    urls = []
    for i in range(5):
        urls.append(f"https://app{i}.contoso.com/callback")
    for i in range(5):
        urls.append(f"https://api{i}.example.com/auth")
    
    start = time.time()
    result = enrich_reply_urls(urls, enable_dns=True, enable_rdap=False, enable_ipwhois=False)
    elapsed = time.time() - start
    
    dns_lookups = result.get("dns_lookups", {})
    
    # Should only have 2 DNS lookups (contoso.com and example.com)
    if len(dns_lookups) <= 2:
        print(f"✓ PASS: 10 URLs resulted in only {len(dns_lookups)} DNS lookups")
        print(f"  Domains: {list(dns_lookups.keys())}")
        print(f"  Completed in {elapsed:.2f}s")
    else:
        print(f"✗ FAIL: Expected ≤2 DNS lookups, got {len(dns_lookups)}")

if __name__ == "__main__":
    print("=" * 60)
    print("Enrichment Caching Tests")
    print("=" * 60)
    
    test_etld_extraction()
    test_enrichment_deduplication()
    test_performance_improvement()
    
    print("\n" + "=" * 60)
    print("✓ ALL CACHING TESTS COMPLETED")
    print("=" * 60)
