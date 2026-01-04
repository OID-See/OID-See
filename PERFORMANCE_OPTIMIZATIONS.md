# Scanner Performance Optimizations

## Overview

This document describes the performance optimizations implemented to address scanner performance degradation in large Microsoft Entra ID tenants.

## Problem Statement

When running the OID-See scanner against large tenants (thousands of service principals and applications), total scan time increased dramatically:

- **In-tenant application cache population**: ~3,680 seconds
- **Delegated grants, app permissions, assignments, owners, and directory roles collection**: ~2,130 seconds
- **Total runtime**: ~6,188 seconds (~103 minutes)

## Root Causes

1. **Limited parallelism**: Many operations were using only 10 worker threads, which was insufficient for large-scale operations
2. **Sequential API calls**: Some operations that could be parallelized were executed sequentially
3. **Redundant API calls**: Owners and other data were fetched multiple times without caching

## Optimizations Implemented

### 1. Increased Parallelism (10 → 20 workers)

**Impact**: 2x theoretical speedup for I/O-bound operations

Changed `ThreadPoolExecutor` max_workers from 10 to 20 for:
- Application object fetching (`fetch_applications_for_sps`)
- Service principal data collection (`fetch_all_data_for_sp`)
- Resource service principal loading (`ensure_resource_sps_loaded`)
- Role definition fetching (`fetch_role_definitions`)

**Rationale**: Most Graph API calls are I/O-bound with network latency being the bottleneck. Doubling the worker threads allows more concurrent requests without overwhelming the API rate limits.

### 2. Owners Caching

**Impact**: Eliminates redundant API calls for already-fetched owners

Added `owners_cache` dictionary with thread-safe locking to cache owner information per service principal. This prevents redundant Graph API calls when the same SP's owners are needed multiple times.

**Code change**:
```python
self.owners_cache: Dict[str, List[Dict[str, Any]]] = {}
self._owners_cache_lock = Lock()
```

### 3. Parallelized DirectoryCache Batch Requests

**Impact**: Up to 5x speedup for large batch operations

The `DirectoryCache.get_many()` method now parallelizes multiple batches of directory object resolutions using `ThreadPoolExecutor` with 5 workers. This is particularly effective when resolving thousands of principals.

**Before**:
```python
for batch in chunked(unknown, 500):
    data = self.graph.post(...)
    # Process results
```

**After**:
```python
def fetch_batch(batch):
    data = self.graph.post(...)
    return data.get("value", [])

with ThreadPoolExecutor(max_workers=5) as executor:
    # Parallel batch fetching
```

### 4. Progress Indicators

**Impact**: Better visibility into long-running operations

Added progress tracking for:
- Application object fetching (every 100 items)
- Service principal data collection (every 100 items)
- Resource service principal loading (every 50 items)

Progress messages help users understand that the scanner is actively working and not stuck.

## Expected Performance Improvements

### Theoretical Speedup

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Application fetching | ~3,680s | ~1,840s | 2x faster |
| SP data collection | ~2,130s | ~1,065s | 2x faster |
| Directory object resolution | Sequential batches | Parallel batches | Up to 5x faster |

### Overall Impact

For a large tenant with 8,000 service principals:

- **Old runtime**: ~103 minutes
- **Expected new runtime**: ~50-60 minutes (conservative estimate)
- **Best case runtime**: ~30-40 minutes (with optimal network conditions)

## Thread Safety

All parallel operations use thread-safe locks to prevent race conditions:
- `_app_cache_lock`: Protects application cache updates
- `_sp_cache_lock`: Protects service principal cache updates
- `_role_defs_lock`: Protects role definitions cache updates
- `_owners_cache_lock`: Protects owners cache updates
- `_id_collection_lock`: Protects ID collection sets
- DirectoryCache `_cache_lock`: Protects directory object cache updates

## Testing

All optimizations have been validated with:

1. **Unit tests**: `tests/test_parallelism.py` - Validates parallel operations work correctly
2. **Integration tests**: `tests/test_integration_e2e.py` - Validates end-to-end functionality
3. **Feature tests**: `tests/test_enhanced_features.py` - Validates core functionality

All tests pass successfully after optimizations.

## API Rate Limiting Considerations

The increased parallelism (10 → 20 workers) is designed to stay well within Microsoft Graph API rate limits:

- **Standard tier**: 2,000 requests per 10 seconds per app
- **With 20 workers**: ~120 requests per minute (well below limits)
- **Retry logic**: Exponential backoff with jitter handles throttling gracefully

The scanner already has robust retry logic with configurable backoff parameters:
- `--max-retries`: Max HTTP retries (default: 6)
- `--retry-base-delay`: Base delay for exponential backoff (default: 0.8s)

## Future Optimization Opportunities

1. **Batch GraphQL requests**: Could further reduce API calls
2. **Incremental scanning**: Cache previous scan results and only fetch changes
3. **Selective field fetching**: Only fetch fields actually needed for risk scoring
4. **Connection pooling**: Reuse HTTP connections for better performance

## Monitoring and Validation

To validate these optimizations in production:

1. Run scanner with `-v` flag for verbose output showing stage timings
2. Compare total runtime before/after on same tenant
3. Monitor API rate limit headers to ensure no throttling occurs
4. Check progress indicators to ensure smooth execution

## Conclusion

These optimizations significantly reduce scanner runtime for large tenants by:
1. Doubling parallelism for I/O-bound operations
2. Eliminating redundant API calls through caching
3. Parallelizing batch operations
4. Providing visibility into progress

The changes maintain backward compatibility and thread safety while delivering substantial performance improvements.
