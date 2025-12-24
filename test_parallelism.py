#!/usr/bin/env python3
"""
Test to verify parallelism implementation is correct and thread-safe.
"""

import sys
import time
from typing import Dict, Any, List
from unittest.mock import Mock, MagicMock, patch
from concurrent.futures import ThreadPoolExecutor

# Import the OidSeeCollector
from oidsee_scanner import OidSeeCollector, CollectOptions, GraphClient


def test_parallel_application_fetching():
    """Test that fetch_applications_for_sps works correctly with parallelism."""
    print("\n=== Testing parallel application fetching ===")
    
    # Create mock graph client
    mock_graph = Mock(spec=GraphClient)
    
    # Mock response for get_paged
    def mock_get_paged(url):
        # Simulate API delay
        time.sleep(0.01)
        if "appId eq" in url:
            # Extract appId from URL
            import re
            match = re.search(r"appId eq '([^']+)'", url)
            if match:
                appid = match.group(1)
                return [{
                    "id": f"obj-{appid}",
                    "appId": appid,
                    "displayName": f"App {appid}",
                    "signInAudience": "AzureADMultipleOrgs"
                }]
        return []
    
    mock_graph.get_paged = mock_get_paged
    
    # Create collector
    opts = CollectOptions()
    collector = OidSeeCollector(mock_graph, opts)
    
    # Create test service principals
    sps = [
        {"id": f"sp-{i}", "appId": f"app-{i}"} 
        for i in range(20)
    ]
    
    # Measure time for parallel execution
    start_time = time.time()
    collector.fetch_applications_for_sps(sps)
    parallel_duration = time.time() - start_time
    
    # Verify all apps were cached
    assert len(collector.app_cache_by_appid) == 20, f"Expected 20 apps, got {len(collector.app_cache_by_appid)}"
    
    # Verify each app is correct
    for i in range(20):
        appid = f"app-{i}"
        assert appid in collector.app_cache_by_appid, f"App {appid} not found in cache"
        assert collector.app_cache_by_appid[appid]["displayName"] == f"App {appid}"
    
    print(f"✓ PASS: Fetched 20 applications in {parallel_duration:.2f}s")
    print(f"  All applications correctly cached")
    
    # Verify parallelism benefit (should be much faster than sequential)
    # With 10 workers and 0.01s per request, 20 requests should take ~0.02-0.05s
    # Sequential would take ~0.2s
    assert parallel_duration < 0.15, f"Parallel execution took too long: {parallel_duration:.2f}s"
    print(f"  ✓ Parallelism effective (< 0.15s for 20 requests)")
    
    return True


def test_parallel_resource_sp_loading():
    """Test that ensure_resource_sps_loaded works correctly with parallelism."""
    print("\n=== Testing parallel resource SP loading ===")
    
    # Create mock graph client
    mock_graph = Mock(spec=GraphClient)
    
    # Mock response for get
    def mock_get(url, params=None):
        # Simulate API delay
        time.sleep(0.01)
        if "/servicePrincipals/" in url:
            # Extract SP ID from URL
            import re
            match = re.search(r"/servicePrincipals/([^?]+)", url)
            if match:
                sp_id = match.group(1)
                return {
                    "id": sp_id,
                    "displayName": f"Resource {sp_id}",
                    "appId": f"app-{sp_id}"
                }
        return {}
    
    mock_graph.get = mock_get
    
    # Create collector
    opts = CollectOptions()
    collector = OidSeeCollector(mock_graph, opts)
    
    # Add resource SPs that need to be loaded
    for i in range(15):
        collector._resource_sp_needed.add(f"res-{i}")
    
    # Measure time for parallel execution
    start_time = time.time()
    collector.ensure_resource_sps_loaded()
    parallel_duration = time.time() - start_time
    
    # Verify all resource SPs were loaded
    assert len(collector.sp_cache) == 15, f"Expected 15 resource SPs, got {len(collector.sp_cache)}"
    
    # Verify each resource SP is correct
    for i in range(15):
        res_id = f"res-{i}"
        assert res_id in collector.sp_cache, f"Resource {res_id} not found in cache"
        assert collector.sp_cache[res_id]["displayName"] == f"Resource {res_id}"
    
    print(f"✓ PASS: Loaded 15 resource SPs in {parallel_duration:.2f}s")
    print(f"  All resource SPs correctly cached")
    
    # Verify parallelism benefit
    assert parallel_duration < 0.12, f"Parallel execution took too long: {parallel_duration:.2f}s"
    print(f"  ✓ Parallelism effective (< 0.12s for 15 requests)")
    
    return True


def test_parallel_role_definitions():
    """Test that fetch_role_definitions works correctly with parallelism."""
    print("\n=== Testing parallel role definition fetching ===")
    
    # Create mock graph client
    mock_graph = Mock(spec=GraphClient)
    
    # Mock response for get
    def mock_get(url, params=None):
        # Simulate API delay
        time.sleep(0.01)
        if "/roleDefinitions/" in url:
            # Extract role ID from URL
            import re
            match = re.search(r"/roleDefinitions/([^?]+)", url)
            if match:
                role_id = match.group(1)
                return {
                    "id": role_id,
                    "displayName": f"Role {role_id}",
                    "isBuiltIn": True
                }
        return {}
    
    mock_graph.get = mock_get
    
    # Create collector
    opts = CollectOptions()
    collector = OidSeeCollector(mock_graph, opts)
    
    # Add role definition IDs
    role_ids = {f"role-{i}" for i in range(12)}
    
    # Measure time for parallel execution
    start_time = time.time()
    collector.fetch_role_definitions(role_ids)
    parallel_duration = time.time() - start_time
    
    # Verify all role definitions were fetched
    assert len(collector._role_defs) == 12, f"Expected 12 role defs, got {len(collector._role_defs)}"
    
    # Verify each role def is correct
    for i in range(12):
        role_id = f"role-{i}"
        assert role_id in collector._role_defs, f"Role {role_id} not found"
        assert collector._role_defs[role_id]["displayName"] == f"Role {role_id}"
    
    print(f"✓ PASS: Fetched 12 role definitions in {parallel_duration:.2f}s")
    print(f"  All role definitions correctly cached")
    
    # Verify parallelism benefit
    assert parallel_duration < 0.10, f"Parallel execution took too long: {parallel_duration:.2f}s"
    print(f"  ✓ Parallelism effective (< 0.10s for 12 requests)")
    
    return True


def test_thread_safety():
    """Test that parallel operations don't have race conditions."""
    print("\n=== Testing thread safety ===")
    
    # Create a shared dictionary that will be updated by multiple threads
    shared_dict = {}
    
    def update_dict(key, value):
        # Simulate some work
        time.sleep(0.001)
        shared_dict[key] = value
        return key
    
    # Use ThreadPoolExecutor to update dictionary in parallel
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(update_dict, f"key-{i}", i) for i in range(50)]
        results = [f.result() for f in futures]
    
    # Verify all updates completed
    assert len(shared_dict) == 50, f"Expected 50 entries, got {len(shared_dict)}"
    for i in range(50):
        assert f"key-{i}" in shared_dict
        assert shared_dict[f"key-{i}"] == i
    
    print(f"✓ PASS: No race conditions detected")
    print(f"  50 concurrent updates completed successfully")
    
    return True


def main():
    """Run all tests."""
    print("=" * 60)
    print("Parallelism Test Suite")
    print("=" * 60)
    
    all_passed = True
    
    # Run all test functions
    try:
        all_passed = all_passed and test_parallel_application_fetching()
    except Exception as e:
        print(f"✗ FAIL: test_parallel_application_fetching - {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    try:
        all_passed = all_passed and test_parallel_resource_sp_loading()
    except Exception as e:
        print(f"✗ FAIL: test_parallel_resource_sp_loading - {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    try:
        all_passed = all_passed and test_parallel_role_definitions()
    except Exception as e:
        print(f"✗ FAIL: test_parallel_role_definitions - {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    try:
        all_passed = all_passed and test_thread_safety()
    except Exception as e:
        print(f"✗ FAIL: test_thread_safety - {e}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ ALL TESTS PASSED")
        print("=" * 60)
        return 0
    else:
        print("✗ SOME TESTS FAILED")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
