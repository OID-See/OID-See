# Changelog

All notable changes to OID-See will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

<<<<<<< HEAD
### Added - Viewer Performance Optimizations & Alternative Visualization Modes

#### Alternative Visualization Modes (for large datasets 10,000+ nodes)
- **Table View**: High-performance tabular view with virtual scrolling, supports 50,000+ nodes
- **Tree View**: Hierarchical organization by node type with risk aggregation
- **Matrix View**: Heat map showing relationship distribution between node types  
- **Dashboard View**: Statistical summary with key metrics and risk distribution
- **Hybrid Approach**: Graph View automatically truncates to top 3,000 highest-risk nodes for datasets exceeding thresholds

#### Virtual Rendering Infrastructure
- Viewport-based rendering using spatial indexing (QuadTree) for efficient node visibility
- Progressive detail levels - distant nodes render as points, nearby nodes show full detail
- Clustering system for aggregating distant nodes to reduce canvas load
- Smart visibility detection only renders what's in current viewport

#### Performance Enhancements
- Async rendering with yielding to event loop prevents UI blocking
- Batched DataSet operations (1,000 items per batch) for large graph updates
- Loading overlay with progress indicators during file processing
- Comprehensive console logging for performance diagnostics (`[OID-See]` and `[GraphCanvas]` prefixes)

#### Large Graph Handling
- Auto-detection of graphs ≥3,000 nodes/edges
- Physics disabled by default for large graphs (gravitational/spring constants set to 0)
- Hard rendering limits: MAX_RENDERABLE_NODES = 3,000, MAX_RENDERABLE_EDGES = 4,500
- Clear warnings when graph truncation occurs with original counts displayed

#### Architecture Documentation
- Added `docs/LARGE_GRAPH_ARCHITECTURE.md` with detailed technical designs for handling 30k+ node graphs
- Added `docs/visualization-modes.md` with comprehensive guide to all view modes
- Implementation roadmaps for virtual rendering, Web Workers, and progressive loading

#### Sample Data
- Added `sample-large-oidsee-graph.json` (3.2MB, 12k nodes, 18k edges) for testing large graph scenarios
- Sample data triggers all large graph optimizations for demonstration

### Fixed
- Scanner risk scoring now correctly respects the `appOwnership` field populated from Merill Fernando's Microsoft Apps feed
- **IDENTITY_LAUNDERING** risk no longer incorrectly flags legitimate Microsoft first-party apps
- **DECEPTION** risk no longer incorrectly flags name mismatches in legitimate Microsoft first-party apps
- **MIXED_REPLYURL_DOMAINS** risk no longer incorrectly flags Microsoft apps using multiple legitimate Microsoft domains
- **REPLYURL_OUTLIER_DOMAIN** risk no longer incorrectly flags Microsoft apps using their legitimate domain portfolio
- Fixed vis-network configuration errors (removed invalid `selectOnClick` option)
- Fixed `improvedLayout` algorithm errors for large graphs
- Fixed node rendering errors in custom `doubleCircleRenderer`
- Fixed pan/zoom interaction issues on graph canvas
- Fixed filter/lens operation errors that caused recurring UI failures
- Fixed UI blocking during JSON parsing and graph construction
- Fixed race conditions in DataSet updates with `updateInProgressRef`

### Changed
- Risk calculation logic in `compute_risk_for_sp()` now consistently gates on `app_ownership == "1st Party"` for attribution-related risks
- Updated sample data to use anonymized real tenant export demonstrating fixed behavior
- Graph viewer now defaults to Dashboard View for large datasets (10k+ nodes)
- Navigation buttons re-enabled with proper conflict resolution
- Error handling improved with fallback rendering for malformed nodes
- Enhanced InfoDialog component (separate from ErrorDialog) for non-error notifications

### Performance Metrics
- **Small graphs (<3k nodes)**: No performance impact, physics enabled by default
- **Medium graphs (3k-10k nodes)**: Truncated to 3k nodes, responsive with physics disabled
- **Large graphs (10k-50k+ nodes)**: Alternative views (Table/Tree/Matrix/Dashboard) provide excellent performance
- **Virtual rendering**: Handles 50k+ nodes with viewport-based display
=======
## [private-beta-2] - 2026-01-04

### Changed
- **BREAKING PERFORMANCE IMPROVEMENT**: Scanner now uses bulk fetching and Graph API batching for 97-98% faster scans in large tenants
- Application fetching rewritten from individual filtered queries to single bulk query + in-memory filtering (60-360x faster)
- SP data collection rewritten to use Microsoft Graph `$batch` API with maximized batch sizes (12-18x faster)
- Increased parallelism from 10 to 20 workers for resource loading and role definitions
- Added progress indicators for long-running operations
>>>>>>> copilot/improve-scanner-performance

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

