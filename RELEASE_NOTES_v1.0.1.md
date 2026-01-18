# Release Notes - OID-See v1.0.1

## 🔧 Maintenance Release - January 18, 2026

OID-See v1.0.1 is a maintenance release that addresses critical accuracy and performance issues discovered in v1.0.0, plus inverts the ownership scoring model to align with security best practices. This release focuses on improving data accuracy for app assignments, fixing significant viewer performance regressions, and correcting the treatment of application ownership as a risk factor.

## What's Changed

### 🔄 Ownership Scoring Inversion

**Problem**: OID-See treated applications with no owners as a negative security signal (penalized with NO_OWNERS), which reversed the actual risk model for Entra ID applications. Application ownership grants principals change authority over trusted identity objects, which increases risk rather than indicating good security hygiene.

**Solution**: Based on Glenn Van Rymenant's [analysis](https://www.appgovscore.com/blog/entra-id-application-ownership-risks-problems), ownership is now treated as a risk factor. Apps with no owners have reduced mutation attack surface; apps with user owners have the highest risk.

**Changes**:
- ✅ Deprecated `NO_OWNERS` risk contributor (weight → 0 for backward compatibility)
- ✅ Added `HAS_OWNERS_USER` (+15 points) for user principal owners
- ✅ Added `HAS_OWNERS_SP` (+8 points) for service principal owners
- ✅ Added `HAS_OWNERS_UNKNOWN` (+5 points) for group/role owners
- ✅ ServicePrincipal nodes include `ownershipInsights` property with breakdown by owner type
- ✅ Viewer query changed from "Without Owners" to "With Owners (Change Authority)"
- ✅ Report metrics updated from `apps_without_owners` to `apps_with_owners`

**Technical Implementation**:
```python
def categorize_owners_by_type(owners: List[dict], dir_cache: dict) -> dict:
    """Categorize owners by principal type using @odata.type."""
    categories = {"user": 0, "servicePrincipal": 0, "unknown": 0}
    for owner in owners:
        owner_id = owner.get("id")
        cached = dir_cache.get(owner_id, {})
        odata_type = cached.get("@odata.type", "")
        
        if "user" in odata_type.lower():
            categories["user"] += 1
        elif "serviceprincipal" in odata_type.lower():
            categories["servicePrincipal"] += 1
        else:
            categories["unknown"] += 1
    return categories
```

**Risk Scoring**:
```python
# Add risk for having owners (inverted from previous model)
if owner_categories["user"] > 0:
    risk_reasons.append({
        "code": "HAS_OWNERS_USER",
        "weight": 15,
        "message": f"Has {owner_categories['user']} user owner(s). Ownership grants change authority."
    })
```

**Example Output**:
```json
{
  "displayName": "Contoso Portal",
  "ownershipInsights": {
    "totalOwners": 3,
    "userOwners": 2,
    "spOwners": 1,
    "unknownOwners": 0
  },
  "risk": {
    "score": 45,
    "reasons": [
      {"code": "HAS_OWNERS_USER", "weight": 15, "message": "Has 2 user owner(s)"},
      {"code": "HAS_OWNERS_SP", "weight": 8, "message": "Has 1 SP owner(s)"}
    ]
  }
}
```

**Backward Compatibility**: NO_OWNERS retained in config with weight 0. Existing exports display deprecated code with zero contribution.

## What's Fixed

### 🎯 Accurate App Assignment Enumeration

**Problem**: The scanner was approximating ~5 users per group when calculating how many users could be reached through service principal app assignments. This resulted in significantly inaccurate risk scores and misleading reports.

**Solution**: The scanner now fetches actual transitive member counts from Microsoft Graph API using the `transitiveMembers/$count` endpoint.

**Impact**:
- ✅ Accurate user reachability counts in risk scoring
- ✅ Correct `ASSIGNED_TO` risk contributor weights
- ✅ Reliable data for security assessments
- ✅ Updated risk reason messages show actual user counts

**Technical Implementation**:
```python
def fetch_group_member_count(group_id: str) -> int:
    """Fetch actual transitive member count from Graph API."""
    url = f"https://graph.microsoft.com/v1.0/groups/{group_id}/transitiveMembers/$count"
    response = session.get(url, headers={"ConsistencyLevel": "eventual"})
    return int(response.text)

def fetch_group_member_counts_batched(group_ids: List[str]) -> Dict[str, int]:
    """Batch fetch member counts for multiple groups using Graph API batch endpoint."""
    # Process up to 20 groups per batch request
    # Use multi-threading for parallel batch execution
    # Cache results to avoid redundant API calls
```

**Performance**: Large tenant with 974 groups now processes member counts in seconds instead of using hardcoded approximations.

**Example**:

Before:
```json
{
  "code": "ASSIGNED_TO",
  "message": "Assigned to 3 groups, approximating ~15 users"
}
```

After:
```json
{
  "code": "ASSIGNED_TO",
  "message": "Assigned to 3 groups, reaching 847 users"
}
```

### ⚡ Graph View Performance & Button State

**Problem**: Multiple critical viewer issues discovered after v1.0.0 release:
1. Graph view button remained stuck in loading state (disabled with hourglass) after file upload
2. Loading large files (12k+ nodes) caused ~7 second delays before any views became available
3. Switching between views was extremely slow (700-7000ms per click) with UI violations
4. Browser would freeze during view transitions on large datasets

**Root Causes**:
1. **Button State**: `processGraphData()` didn't clear the `data` state, preventing lazy loading from triggering on subsequent file uploads
2. **Initial Load Delay**: Filter operation ran unnecessarily on empty query during data load, processing 12k+ nodes and taking ~7 seconds
3. **View Switch Slowness**: `filteredNodes` and `filteredEdges` not memoized, causing expensive `.map()` operations (12k+ items) on every render
4. **UI Blocking**: View mode state changes happened synchronously, blocking UI thread during expensive component mounting

**Solutions**:
1. Clear graph data state at start of `processGraphData()` to ensure lazy loading triggers
2. Skip filtering during initial data load with loading guard
3. Optimize empty query case: skip filter worker entirely when query is empty and lens is 'full'
4. Memoize `filteredNodes` and `filteredEdges` to prevent re-computation on every render
5. Use React 19's `startTransition` to mark view mode changes as non-urgent
6. Optimize view components to eliminate expensive array operations:
   - **TableView**: Cast objects directly instead of spread operator
   - **DashboardView**: Build lists incrementally instead of full array copies
   - **TreeView**: Sort arrays in-place instead of creating copies

**Performance Impact**:

| Metric | Before v1.0.1 | After v1.0.1 | Improvement |
|--------|---------------|--------------|-------------|
| Initial load (12k nodes) | ~7 seconds | Instant | 100% |
| View switching | 700-7000ms | <100ms | 98-99% |
| UI responsiveness | Freezes/blocks | Smooth | ✅ |
| Graph button state | Stuck disabled | Works correctly | ✅ |

**Code Examples**:

```typescript
// Fix 1: Clear stale data
const processGraphData = useCallback(async (json: OID_DATA) => {
  setData(null); // Clear stale graph data
  parsedDataForGraphRef.current = null; // Reset parsed data ref
  // ... rest of processing
```

```typescript
// Fix 2: Skip unnecessary filtering
useEffect(() => {
  if (loading) return; // Skip during initial load
  
  const isDefaultFilter = query.trim() === '' && lens === 'full';
  if (isDefaultFilter) {
    // Skip filter worker entirely for default state
    if (data && filtered !== data) setFiltered(data);
    return;
  }
  // ... filter logic
}, [data, query, lens, loading])
```

```typescript
// Fix 3: Memoization
const filteredNodes = useMemo(() => 
  filteredOriginal?.nodes?.map(n => n.__oidsee ?? n) ?? []
, [filteredOriginal])
```

```typescript
// Fix 4: Non-blocking transitions
const [, startTransition] = useTransition()
const handleViewModeChange = (mode: ViewMode) => {
  startTransition(() => setViewMode(mode))
}
```

## Upgrade Guide

### For Existing v1.0.0 Users

**Recommended Actions**:

1. **Update to v1.0.1**
   ```bash
   git pull origin main
   git checkout v1.0.1
   ```

2. **Re-scan Your Tenant** (Highly Recommended)
   ```bash
   python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --generate-report --out scan-results.json
   ```
   
   This will:
   - Fetch accurate group member counts
   - Apply correct ownership risk scoring (inverted model)
   - Generate accurate risk scores for app assignments
   - Provide reliable data for security decisions

3. **Use Updated Viewer**
   - Visit https://oid-see.netlify.app/ (automatically updated)
   - Or rebuild locally: `npm install && npm run build`
   - Enjoy instant loading and smooth view switching
   - Updated queries reflect new ownership risk model

### Breaking Changes

**None**. This release is fully backward compatible.

- Existing scan exports will work with the new viewer
- Old scans will show NO_OWNERS with zero weight (deprecated)
- Old scans will show approximated user counts (from v1.0.0)
- New scans will use inverted ownership model and accurate user counts (recommended)

## Technical Details

### Files Changed

**Ownership Scoring Changes** (PR #66):
- `oidsee_scanner.py`: Implemented ownership categorization and risk scoring inversion
- `scoring_logic.json`: Added HAS_OWNERS_USER/SP/UNKNOWN, deprecated NO_OWNERS
- `report_generator.py`: Updated metrics from apps_without_owners to apps_with_owners
- `src/App.tsx`: Updated viewer query from "Without Owners" to "With Owners"
- `docs/schema.md`: Documented new ownershipInsights property and risk codes
- `docs/scoring-logic.md`: Updated documentation for ownership risk model
- `tests/test_ownership_scoring.py`: Comprehensive test suite for ownership scoring

**Scanner Changes** (PR #55):
- `oidsee_scanner.py`: Added batched group member count fetching
- `tests/test_batched_group_counting.py`: Comprehensive test suite
- Documentation updates

**Viewer Changes** (PR #71):
- `src/App.tsx`: Fixed data state management and added memoization
- `src/components/TableView.tsx`: Optimized object casting
- `src/components/DashboardView.tsx`: Incremental list building
- `src/components/TreeView.tsx`: In-place sorting
- Documentation updates

### Testing

**Scanner Tests**:
- ✅ Batched API request validation
- ✅ Member count accuracy verification
- ✅ Caching behavior validation
- ✅ Error handling for batch failures
- ✅ Integration with risk scoring

**Viewer Tests**:
- ✅ Manual testing with 12k node dataset
- ✅ Button state verification across file uploads
- ✅ Performance benchmarking for view switches
- ✅ Memory leak testing
- ✅ Cross-browser compatibility (Chrome, Edge, Firefox, Safari)

### Security

- ✅ CodeQL scan: 0 vulnerabilities
- ✅ No new dependencies added
- ✅ No breaking changes to security model
- ✅ API permissions unchanged (existing Graph API scopes sufficient)

## Known Limitations

### Graph API Rate Limits

The batched member count fetching makes efficient use of Graph API calls, but very large tenants (1000+ groups) may still encounter rate limiting. The scanner includes automatic retry logic with exponential backoff.

**Recommendation**: Run scans during off-peak hours for large tenants.

### Viewer Performance Boundary

While v1.0.1 dramatically improves performance, the Graph View is still limited to ~3,000 nodes due to canvas rendering constraints. For larger datasets:
- Use Dashboard View for overview
- Use Table View for searching/filtering
- Apply filters to reduce dataset before switching to Graph View

See [Visualization Modes Documentation](./docs/visualization-modes.md) for details.

## Migration Path

### From v1.0.0 to v1.0.1

1. **Update Code**
   ```bash
   git fetch origin
   git checkout v1.0.1
   ```

2. **No Configuration Changes Required**
   - All improvements activate automatically
   - No need to modify `scoring_logic.json`
   - Existing scans remain compatible

3. **Re-scan Recommended**
   ```bash
   python oidsee_scanner.py --tenant-id "YOUR_TENANT_ID" --out scan-results.json
   ```

4. **Viewer Updates Automatically**
   - Hosted version (https://oid-see.netlify.app/) updates automatically
   - Local deployments: `npm install && npm run build`

### From Earlier Versions

If you're on private-beta-2 or earlier:
1. Review v1.0.0 Release Notes for major changes
2. Update to v1.0.1 directly
3. Re-scan your tenant
4. Review new tier-aware risk scores

## Community & Support

### Getting Help

- **Documentation**: See `README.md` and `docs/` directory
- **Issues**: Report bugs via [GitHub Issues](https://github.com/OID-See/OID-See/issues)
- **Changelog**: See [CHANGELOG.md](CHANGELOG.md) for detailed changes

### Contributing

We welcome contributions! Areas of interest:
- Performance optimizations
- Additional visualizations
- Documentation improvements
- Bug reports and fixes

### Acknowledgments

Special thanks to:
- @goldjg for identifying the app assignment enumeration issue
- @goldjg for reporting the graph view button and performance issues
- Early adopters for testing and feedback

## Conclusion

OID-See v1.0.1 addresses critical accuracy and performance issues to ensure reliable security assessments. The accurate group member counting provides confidence in risk scores, while the viewer performance improvements enable smooth analysis of large datasets.

**Upgrade Recommendation**: All v1.0.0 users should upgrade to v1.0.1 and re-scan their tenants to benefit from accurate user reachability data.

---

**Release Date**: January 18, 2026  
**Version**: 1.0.1  
**License**: Apache 2.0  
**Repository**: https://github.com/OID-See/OID-See
