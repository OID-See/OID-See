# Changelog

All notable changes to OID-See will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [private-beta-2] - 2026-01-04

### Changed
- **BREAKING PERFORMANCE IMPROVEMENT**: Scanner now uses bulk fetching and Graph API batching for 97-98% faster scans in large tenants
- Application fetching rewritten from individual filtered queries to single bulk query + in-memory filtering (60-360x faster)
- SP data collection rewritten to use Microsoft Graph `$batch` API with maximized batch sizes (12-18x faster)
- Increased parallelism from 10 to 20 workers for resource loading and role definitions
- Added progress indicators for long-running operations

### Added
- Graph API batch request support with proper API version separation (beta/v1.0)
- Thread-safe owners cache to eliminate redundant API calls
- Parallelized DirectoryCache batch processing (5 concurrent workers)
- Comprehensive error handling with automatic fallback to individual requests
- Performance optimization test suite validating batch processing and thread safety

### Performance
- Large tenant (8,096 SPs) scan time: **103 minutes → 2-3 minutes** (97-98% faster)
- Application cache population: **66 minutes → 1 minute** (60-360x faster)
- SP data collection: **35 minutes → 30-60 seconds** (12-18x faster)
- HTTP requests reduced from 48,576 to ~1,621 (97% reduction)

### Technical Details
- Bulk application fetch uses single `/applications` query with in-memory filtering
- Graph batch API combines up to 20 requests per HTTP call
- Batch sizes optimized: 5 SPs per beta batch (5 × 4 operations = 20 requests)
- 20 parallel batch workers with async cache updates
- Proper URL formatting for batch requests (no version prefix)
- Thread-safe locking for all shared caches and results

## [private-beta-1] - 2026-01-03

### Summary
This release fixes critical false positive issues in the risk scoring logic where legitimate Microsoft first-party applications were incorrectly flagged with high-severity risks despite being correctly identified via the authoritative Microsoft Apps feed.

**Impact**: Eliminated false positives for 60+ Microsoft first-party apps that were incorrectly receiving combined risk scores of +35 to +50 points from attribution-related risks.

**Attribution**: Scanner integrates with Merill Fernando's Microsoft Apps list (https://github.com/merill/microsoft-info) to identify legitimate Microsoft applications.

