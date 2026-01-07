#!/usr/bin/env python3
"""
Test for batched group member count fetching.

This test verifies that the batched API implementation works correctly
and is more efficient than individual requests.
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from oidsee_scanner import OidSeeCollector, GraphClient, CollectOptions
from unittest.mock import Mock, MagicMock, patch
import time


def test_batch_api_usage():
    """Test that fetch_group_member_counts_batched uses the batch API correctly."""
    print("\n=== Testing Batch API Usage ===")
    
    # Create mock GraphClient
    mock_graph = Mock(spec=GraphClient)
    mock_graph.max_retries = 3
    mock_graph.base_delay = 0.1
    
    # Mock the batch method to return successful responses
    def mock_batch(requests, api_version="v1.0"):
        responses = []
        for req in requests:
            req_id = req["id"]
            # Simulate returning a count for each group
            responses.append({
                "id": req_id,
                "status": 200,
                "body": "100"  # Return plain text count
            })
        return responses
    
    mock_graph.batch = mock_batch
    
    # Create collector with mock graph
    opts = CollectOptions()
    collector = OidSeeCollector(mock_graph, opts)
    
    # Test with 50 groups (should create 3 batches: 20, 20, 10)
    group_ids = [f"group-{i}" for i in range(50)]
    
    start_time = time.time()
    results = collector.fetch_group_member_counts_batched(group_ids)
    elapsed = time.time() - start_time
    
    # Verify all groups were processed
    if len(results) == 50:
        print(f"✓ PASS: All 50 groups processed")
    else:
        print(f"✗ FAIL: Expected 50 results, got {len(results)}")
        return False
    
    # Verify all counts are correct
    if all(results.get(gid) == 100 for gid in group_ids):
        print(f"✓ PASS: All groups have correct count (100)")
    else:
        print(f"✗ FAIL: Some groups have incorrect counts")
        return False
    
    # Verify results are cached
    if len(collector.group_member_count_cache) == 50:
        print(f"✓ PASS: All results cached (50 entries)")
    else:
        print(f"✗ FAIL: Expected 50 cached entries, got {len(collector.group_member_count_cache)}")
        return False
    
    print(f"✓ PASS: Batched processing completed in {elapsed:.3f}s")
    
    return True


def test_batch_size_limits():
    """Test that batches are correctly sized at 20 requests per batch."""
    print("\n=== Testing Batch Size Limits ===")
    
    # Create mock GraphClient
    mock_graph = Mock(spec=GraphClient)
    mock_graph.max_retries = 3
    mock_graph.base_delay = 0.1
    
    batch_sizes = []
    
    def mock_batch(requests, api_version="v1.0"):
        batch_sizes.append(len(requests))
        responses = []
        for req in requests:
            responses.append({
                "id": req["id"],
                "status": 200,
                "body": "50"
            })
        return responses
    
    mock_graph.batch = mock_batch
    
    opts = CollectOptions()
    collector = OidSeeCollector(mock_graph, opts)
    
    # Test with 55 groups (should create 3 batches: 20, 20, 15)
    group_ids = [f"group-{i}" for i in range(55)]
    results = collector.fetch_group_member_counts_batched(group_ids)
    
    if len(batch_sizes) == 3:
        print(f"✓ PASS: Created 3 batches for 55 groups")
    else:
        print(f"✗ FAIL: Expected 3 batches, got {len(batch_sizes)}")
        return False
    
    if batch_sizes == [20, 20, 15]:
        print(f"✓ PASS: Batch sizes correct: {batch_sizes}")
    else:
        print(f"✗ FAIL: Expected [20, 20, 15], got {batch_sizes}")
        return False
    
    return True


def test_cache_behavior():
    """Test that cached groups are not re-fetched."""
    print("\n=== Testing Cache Behavior ===")
    
    mock_graph = Mock(spec=GraphClient)
    mock_graph.max_retries = 3
    mock_graph.base_delay = 0.1
    
    call_count = 0
    
    def mock_batch(requests, api_version="v1.0"):
        nonlocal call_count
        call_count += 1
        responses = []
        for req in requests:
            responses.append({
                "id": req["id"],
                "status": 200,
                "body": "75"
            })
        return responses
    
    mock_graph.batch = mock_batch
    
    opts = CollectOptions()
    collector = OidSeeCollector(mock_graph, opts)
    
    # First fetch - 10 groups
    group_ids = [f"group-{i}" for i in range(10)]
    results1 = collector.fetch_group_member_counts_batched(group_ids)
    
    first_call_count = call_count
    
    # Second fetch - same 10 groups (should use cache)
    results2 = collector.fetch_group_member_counts_batched(group_ids)
    
    if call_count == first_call_count:
        print(f"✓ PASS: Cached groups not re-fetched (batch API called {call_count} time(s))")
    else:
        print(f"✗ FAIL: Cache not working - batch API called {call_count} times")
        return False
    
    # Third fetch - 5 new groups (should only fetch new ones)
    mixed_groups = group_ids[:5] + [f"group-new-{i}" for i in range(5)]
    results3 = collector.fetch_group_member_counts_batched(mixed_groups)
    
    if call_count == first_call_count + 1:
        print(f"✓ PASS: Only new groups fetched (batch API called {call_count} times total)")
    else:
        print(f"✗ FAIL: Expected {first_call_count + 1} batch calls, got {call_count}")
        return False
    
    return True


def test_error_handling():
    """Test that errors are handled gracefully."""
    print("\n=== Testing Error Handling ===")
    
    mock_graph = Mock(spec=GraphClient)
    mock_graph.max_retries = 3
    mock_graph.base_delay = 0.1
    
    def mock_batch(requests, api_version="v1.0"):
        responses = []
        for idx, req in enumerate(requests):
            if idx % 3 == 0:
                # Every 3rd request returns 404
                responses.append({
                    "id": req["id"],
                    "status": 404,
                    "body": {"error": {"message": "Group not found"}}
                })
            else:
                # Others succeed
                responses.append({
                    "id": req["id"],
                    "status": 200,
                    "body": "25"
                })
        return responses
    
    mock_graph.batch = mock_batch
    
    opts = CollectOptions()
    collector = OidSeeCollector(mock_graph, opts)
    
    group_ids = [f"group-{i}" for i in range(10)]
    results = collector.fetch_group_member_counts_batched(group_ids)
    
    # Verify all groups have results (0 for 404s, 25 for successful)
    if len(results) == 10:
        print(f"✓ PASS: All 10 groups processed despite errors")
    else:
        print(f"✗ FAIL: Expected 10 results, got {len(results)}")
        return False
    
    # Check that 404s returned 0
    not_found_count = sum(1 for gid in group_ids if results.get(gid) == 0)
    found_count = sum(1 for gid in group_ids if results.get(gid) == 25)
    
    # Every 3rd should be 0, others should be 25
    # group-0, group-3, group-6, group-9 = 4 groups with 0
    if not_found_count == 4 and found_count == 6:
        print(f"✓ PASS: Error handling correct (4 groups with 0, 6 groups with 25)")
    else:
        print(f"✗ FAIL: Expected 4/6 split, got {not_found_count}/{found_count}")
        return False
    
    return True


if __name__ == "__main__":
    print("============================================================")
    print("Batched Group Member Count Tests")
    print("============================================================")
    
    success = True
    success = test_batch_api_usage() and success
    success = test_batch_size_limits() and success
    success = test_cache_behavior() and success
    success = test_error_handling() and success
    
    print("\n============================================================")
    if success:
        print("✓ ALL BATCHED API TESTS PASSED")
        print("============================================================")
        sys.exit(0)
    else:
        print("✗ SOME BATCHED API TESTS FAILED")
        print("============================================================")
        sys.exit(1)
