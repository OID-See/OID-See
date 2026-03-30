# Changelog

All notable changes to OID-See will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-03-30

### Added
- `src/workers/dataWorker.ts`: single Web Worker (Vite module worker syntax) handles all heavy processing — JSON parsing, filter/lens evaluation (`applyFilter`), and vis-network graph conversion — so the main thread is never blocked during import or filtering
- `src/filters/lens.ts`: `lensEdgeAllowed()` extracted and exported for shared use by the worker and main thread
- iOS Safari protection: Graph tab permanently disabled on all iOS devices (Apple requires all iOS browsers to use the WebKit engine, which runs out of memory on large vis-network canvases); Table, Tree, Matrix, and Dashboard views work fully on iOS
- File size displayed in the loading overlay before parsing begins
- Large dataset warning InfoDialog shown after loading when nodeCount > 3,000 or edgeCount > 4,500
- Drag-and-drop support: drop an OID-See JSON export onto the main panel area to load it

### Removed
- Input panel (left-side JSON editor): removed entirely — no more paste, Format button, or Render button; was also a source of main-thread blocking via highlight.js syntax highlighting on large JSON
- `src/workers/WorkerManager.ts` and associated multi-worker files (superseded by the simpler single-worker `dataWorker.ts`)

### Changed
- Graph view is now lazy-loaded: the vis-network canvas is only initialised when the Graph tab is selected or "Visualise" is clicked from Table/Tree view
- `filteredNodes` / `filteredEdges` are now driven by `FILTERED` messages from the worker; state updates wrapped in `startTransition` to keep the UI responsive
- Layout changed from 3-panel (input + view + details) to 2-panel (view + details)
- Graph view capped at 3,000 highest-risk nodes / 4,500 edges; Table, Tree, Matrix, and Dashboard views show the full dataset (30k+ nodes)

### Performance
- 30k+ node tenant exports now load and filter without blocking the UI thread
- iOS Safari no longer crashes or becomes unresponsive on import

## [1.0.1] - 2026-01-18

### Changed
- **Ownership Scoring Inversion**: Application ownership is now treated as a risk factor rather than a security control, based on Glenn Van Rymenant's analysis showing that ownership grants change authority over trusted identity objects. Per [appgovscore.com analysis](https://www.appgovscore.com/blog/entra-id-application-ownership-risks-problems), apps with no owners have reduced mutation attack surface; apps with user owners have highest risk.
  - Deprecated `NO_OWNERS` risk contributor (weight set to 0 for backward compatibility)
  - Added `HAS_OWNERS_USER` (+15 points) for user principal owners
  - Added `HAS_OWNERS_SP` (+8 points) for service principal owners  
  - Added `HAS_OWNERS_UNKNOWN` (+5 points) for group/role owners
  - Added `categorize_owners_by_type()` helper using `@odata.type` from directory cache
  - ServicePrincipal nodes now include `ownershipInsights` property with breakdown by owner type
  - Updated viewer query from "Without Owners" to "With Owners (Change Authority)"
  - Updated report metrics from `apps_without_owners` to `apps_with_owners`
  - Documentation updated in `docs/schema.md` and `docs/scoring-logic.md` with new risk reason codes

### Fixed
- **App Assignment Enumeration**: Fixed incorrect count of assigned users when groups are assigned to service principals. The scanner now fetches actual transitive member counts from Microsoft Graph API instead of using a hardcoded approximation of 5 users per group. This ensures accurate reporting of reachable users in risk scoring and exports.
  - Added `fetch_group_member_count()` method to query Microsoft Graph's `transitiveMembers/$count` endpoint
  - Added `fetch_group_member_counts_batched()` method using Microsoft Graph batch API for optimal performance
  - Batch API processes up to 20 groups per request, with multi-threading for parallel batch execution
  - Performance: 974 groups now process in significantly less time using batched API vs individual requests
  - Added caching for group member counts to avoid redundant API calls
  - Updated risk scoring to use actual member counts in `ASSIGNED_TO` contributor
  - Changed risk reason message from "approximating ~N users" to "reaching N users" for accuracy

- **Graph View Button State & Performance**: Fixed critical UI issues where graph view button remained stuck in loading state and eliminated severe performance regressions when loading large datasets.
  - Fixed graph button remaining disabled after file upload by properly clearing stale data state
  - Eliminated 7-second delays when loading large files (12k+ nodes) by skipping unnecessary filter operations on initial load
  - Optimized empty query case: skip filter worker entirely when query is empty and lens is 'full'
  - Memoized `filteredNodes` and `filteredEdges` to prevent expensive `.map()` operations on every render
  - Used React 19's `startTransition` to mark view mode changes as non-urgent, keeping UI responsive
  - Optimized view components to eliminate expensive array operations on 12k+ items:
    - TableView: Cast objects directly instead of using spread operator
    - DashboardView: Build top risky nodes list incrementally
    - TreeView: Sort arrays in-place instead of creating copies
  - Performance improvement: View switching now completes in <100ms vs 700-7000ms before

## [1.0.0] - 2026-01-05

### 🎉 Major Release - v1.0 GA

This is the first production-ready release of OID-See, incorporating comprehensive Entra directory role tiering, privileged scope classification, and metadata-driven risk scoring.

### Added - Entra Role Tiering System

#### Role Tiering Framework
- **Tier 0 (Horizontal/Global Control)**: Roles that control identity, authentication, or policy for entire tenant
  - Global Administrator, Privileged Role Administrator, Security Administrator, Conditional Access Administrator
  - Base weight: 15, Per-role weight: 25, Max weight: 75
  - Risk score impact: 6x higher than Tier 2 roles
- **Tier 1 (Vertical/Critical Services)**: Roles controlling critical workloads or platforms
  - Cloud Application Administrator, Application Administrator, Azure DevOps Administrator
  - Base weight: 8, Per-role weight: 10, Max weight: 40
- **Tier 2 (Scoped/Operational)**: Roles scoped to specific services with limited blast radius
  - Security Reader, Reports Reader, License Administrator
  - Base weight: 3, Per-role weight: 3, Max weight: 15
- 27 Entra role template IDs mapped to tiers in `scoring_logic.json`

#### Tier-Aware Risk Scoring
- `PRIVILEGE` contributor now calculates tier-based weights that accumulate across tiers
- Risk reasons include `tierBreakdown` array with counts and top roles per tier
- Service principal nodes include `rolesReachableTier0/1/2` counts for explainability
- Role nodes enriched with `tier` and `tierLabel` properties for visualization

### Added - Privileged Scope Classification

#### Priority-Based Scope Classification
- **ReadWrite.All** (Priority 1, Weight 30): Near-admin level permissions
- **Action Privileged** (Priority 2, Weight 25): State-changing operations with deterministic patterns
  - Patterns: `.action`, `.manage.`, `.send.`, `.accessasuser.all`, `.full_access`, `.importexport`, `.backup`, `.restore`, `.update`, `.delete`
- **Too Broad** (Priority 3, Weight 15): Permissions ending with `.All`
- **Write Privileged** (Priority 4, Weight 20): Write or ReadWrite permissions
- **Regular** (Priority 5, Weight 0): Standard read-only permissions

#### Metadata-Based Edge Approach
- All scope edges use `HAS_SCOPES` edge type with metadata properties:
  - `scopeRiskClass`: Classification label (readwrite_all, action_privileged, too_broad, write_privileged, regular)
  - `scopeRiskWeight`: Numeric risk weight (30, 25, 15, 20, or 0)
  - `isAllWildcard`: Boolean flag for .All scopes
- Unified `HAS_PRIVILEGED_SCOPES` risk contributor calculates max scope risk across all resources
- Preserves schema stability (no new edge types required)

#### App Role Classification
- **ReadWrite.All** (Weight 60): Highest privilege app roles
- **Action** (Weight 55): State-changing app role operations
- High write markers (Weight 50) for Directory.ReadWrite and similar
- Config-driven patterns extensible for future additions

### Added - Viewer Enhancements

#### Dashboard - Privilege Tier Exposure Section
- Visual tier cards showing service principal counts by tier (0/1/2)
- Total role assignments per tier with color-coded badges (red/orange/yellow)
- Tier descriptions: Horizontal/Global Control, Critical Services, Scoped/Operational
- Responsive layout: 3-column on desktop, single-column on mobile (<900px)

#### Details Panel
- Tier breakdown visualization with color-coded badges
- List of top Tier 0 roles with display names
- Scope privilege breakdown showing ReadWrite.All, Action, and .All counts
- Risk reason details include `scopeRiskClass` and `scopeRiskDetails`

#### Preset Queries
- "Has Tier 0 Roles": Filter service principals with Tier 0 reachable roles
- "ReadWrite.All Scopes": Filter by `e.properties.scopeRiskClass=readwrite_all`
- "Action Scopes": Filter by `e.properties.scopeRiskClass=action_privileged`
- "Tier 0/1/2 Roles": Filter role nodes by tier property
- "Privileged Scopes": Filter by `e.properties.scopeRiskClass~privileged`

### Added - HTML Report Generator

#### Tier Exposure Section
- Visual tier cards with counts and descriptions (mirroring dashboard)
- Top Tier 0 role assignments table showing service principal and role name
- Tier meaning explanations (security-focused descriptions)
- ReadWrite.All and Action scope metrics with counts

#### Enhanced Recommendations
- **Critical Priority**: Tier 0 role reachability recommendations
  - "Reduce Tier 0 role reachability; review app assignments/grants; consider CA / PIM / access reviews"
- **High Priority**: ReadWrite.All scope recommendations
  - "Replace with least-privilege scopes; review necessity; consider application roles + constrained permissions"
- **High Priority**: Action scope recommendations
  - "Review Action-style permissions for state-changing operations"

### Changed - Configuration & Architecture

#### Scoring Logic (scoring_logic.json)
- Added `role_tiering` section with `tiers` and `role_template_ids` mappings
- Updated `classify_scopes.scope_classifications` with `risk_weight` and `patterns`
- Enhanced `compute_risk_for_sp.scoring_contributors` with tier-aware PRIVILEGE
- Action patterns moved from code to config for extensibility

#### Scanner (oidsee_scanner.py)
- `classify_scopes()` returns metadata with `risk_weight` instead of separate edge types
- `compute_risk_for_sp()` accepts `role_defs` parameter for tier lookup
- `get_role_tier()` and `get_tier_config()` helper functions for tier mapping
- Edge properties include `scopeRiskClass`, `scopeRiskWeight`, `isAllWildcard`
- Removed separate boolean flags (`has_readwrite_all_scopes`, `has_action_scopes`)

#### Viewer (React/TypeScript)
- Edge type enums reduced (no HAS_READWRITE_ALL_SCOPES/HAS_PRIVILEGED_ACTION_SCOPES)
- Preset queries use `e.properties.scopeRiskClass` metadata filtering
- CSS styling for tier cards with gradients and proper text wrapping

### Fixed - Dashboard Layout
- Tier cards now use full width with `repeat(3, 1fr)` grid layout
- Text wrapping fixed with `word-wrap: break-word` and reduced font size (0.75rem)
- Dashboard sections span full width with `grid-column: 1 / -1`
- Responsive behavior at 900px breakpoint for single-column on narrow screens

### Testing
- Comprehensive test suite (`test_tier_scoring.py`) with 6 test functions
- Tests validate: role tier mapping, tier config retrieval, scope classification priority, tier-based scoring
- All tests pass (100% success rate)
- CodeQL security scan: 0 vulnerabilities
- Build validation: TypeScript/Vite, Python syntax checks

### Performance
- No performance degradation from tier-based scoring
- Metadata-based edges avoid schema proliferation
- Config-driven patterns enable runtime extensibility

### Documentation
- Updated inline code documentation for tier functions
- Enhanced scoring_logic.json with detailed descriptions
- Test coverage documents expected behavior

### Breaking Changes
- None. Changes are additive and backward compatible with existing exports

### Upgrade Notes
- Existing OID-See exports will work without modification
- New tier metadata automatically populated on next scan
- Scope edges use same HAS_SCOPES type with added metadata

## [private-beta-2] - 2026-01-04

### Changed - Scanner Performance Optimizations
- **BREAKING PERFORMANCE IMPROVEMENT**: Scanner now uses bulk fetching and Graph API batching for 97-98% faster scans in large tenants
- Application fetching rewritten from individual filtered queries to single bulk query + in-memory filtering (60-360x faster)
- SP data collection rewritten to use Microsoft Graph `$batch` API with maximized batch sizes (12-18x faster)
- Increased parallelism from 10 to 20 workers for resource loading and role definitions
- Added progress indicators for long-running operations

### Added - Scanner Improvements
- Graph API batch request support with proper API version separation (beta/v1.0)
- Thread-safe owners cache to eliminate redundant API calls
- Parallelized DirectoryCache batch processing (5 concurrent workers)
- Comprehensive error handling with automatic fallback to individual requests
- Performance optimization test suite validating batch processing and thread safety

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

### Changed - Viewer Improvements
- Risk calculation logic in `compute_risk_for_sp()` now consistently gates on `app_ownership == "1st Party"` for attribution-related risks
- Updated sample data to use anonymized real tenant export demonstrating fixed behavior
- Graph viewer now defaults to Dashboard View for large datasets (10k+ nodes)
- Navigation buttons re-enabled with proper conflict resolution
- Error handling improved with fallback rendering for malformed nodes
- Enhanced InfoDialog component (separate from ErrorDialog) for non-error notifications

### Performance - Scanner
- Large tenant (8,096 SPs) scan time: **103 minutes → 2-3 minutes** (97-98% faster)
- Application cache population: **66 minutes → 1 minute** (60-360x faster)
- SP data collection: **35 minutes → 30-60 seconds** (12-18x faster)
- HTTP requests reduced from 48,576 to ~1,621 (97% reduction)

### Performance - Viewer
- **Small graphs (<3k nodes)**: No performance impact, physics enabled by default
- **Medium graphs (3k-10k nodes)**: Truncated to 3k nodes, responsive with physics disabled
- **Large graphs (10k-50k+ nodes)**: Alternative views (Table/Tree/Matrix/Dashboard) provide excellent performance
- **Virtual rendering**: Handles 50k+ nodes with viewport-based display

### Technical Details - Scanner
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

