# OID-See Release Notes

All releases, newest first.

| Version | Date | Type |
|---------|------|------|
| [v1.1.1](#release-notes---oid-see-v111) | April 14, 2026 | Scanner intelligence release |
| [v1.1.0](#release-notes---oid-see-v110) | March 31, 2026 | Major feature release |
| [v1.0.1](#release-notes---oid-see-v101) | January 18, 2026 | Maintenance release |
| [v1.0.0](#release-notes---oid-see-v100) | January 5, 2026 | Production release |
| [private-beta-2](#release-notes---private-beta-2) | Dec 2025 | Beta release |
| [private-beta-1](#release-notes---private-beta-1) | Nov 2025 | Beta release |

---

# Release Notes - OID-See v1.1.1

## 🔐 Scanner Intelligence Release — April 14, 2026

OID-See v1.1.1 makes scope and permission risk classification more accurate by integrating Microsoft's official permission privilege levels, and improves first-party app detection reliability with a bundled offline fallback list.

## What's Changed

### 📊 Microsoft Permissions Tiering (Issue [#56](https://github.com/OID-See/OID-See/issues/56))

> Raised by [@Mynster9361](https://github.com/Mynster9361)

The scanner now fetches Microsoft Graph's official `permissions.json` at scan time to obtain privilege levels (1–5) for every Graph permission. These levels override the existing pattern-matching classification when they represent a higher risk class. Adds a new `HAS_HIGH_PRIVILEGE_PERMISSION` contributor (weight 15 for level ≥ 4, weight 25 for level 5). Gracefully degrades to pattern-matching when offline.

| MS Level | Meaning | Contributor weight |
|----------|---------|-------------------|
| 5 | Near-admin | +25 |
| 4 | Elevated write/read | +15 |
| 1–3 | Low–moderate | No additional contributor |

### 🏢 Expanded First-Party App Coverage (Issue [#57](https://github.com/OID-See/OID-See/issues/57))

> Raised by [@Mynster9361](https://github.com/Mynster9361)

`data/microsoft_first_party_apps_fallback.json` (~90 well-known MS apps) is now bundled with the scanner. `_fetch_microsoft_apps_list()` seeds the lookup with this fallback before merging Merill's live data (Merill wins on collision). First-party detection now works fully offline.

## Upgrade Guide

No changes required. Both features are fully additive and backward-compatible. No new Python dependencies.

[📖 Read the full v1.1.1 Release Notes →](RELEASE_NOTES_v1.1.1.md)

---

# Release Notes - OID-See v1.1.0

## 🚀 Major Performance Release — March 31, 2026

OID-See v1.1.0 is a major architectural overhaul of the web viewer focused on real-world tenant scale. Testing with genuine enterprise tenants revealed that the previous architecture blocked the browser main thread during import of large exports (30k+ nodes, 50k+ edges), causing desktop browsers to show "page not responding" dialogs. This release eliminates those problems entirely by moving all heavy processing to a Web Worker, adds cross-tenant / external identity posture scanning, and introduces a full set of posture-aware filter presets.

## What's Changed

### ⚡ Web Worker Architecture

**Problem**: The web viewer previously performed JSON parsing, query/lens filtering, and vis-network graph conversion on the browser main thread. For a real enterprise tenant (~30k nodes, ~50k edges):
- JSON parsing alone could take 15+ seconds on mobile
- Filtering 80k+ objects synchronously blocked the UI
- The highlight.js syntax highlighter in the input panel would freeze on multi-MB JSON
- iOS Safari WebKit would run out of memory before the Dashboard could even mount, causing a full browser crash

**Solution**: A single Web Worker (`src/workers/dataWorker.ts`) now handles all CPU-heavy operations. The main thread only receives results and updates React state.

**Worker message protocol**:

| Direction | Message | Payload |
|-----------|---------|---------|
| Main → Worker | `LOAD` | `{ text: string }` |
| Main → Worker | `FILTER` | `{ id, query, lens, pathAware }` |
| Main → Worker | `LOAD_GRAPH` | `{ subsetNodeIds?: string[] }` |
| Main → Worker | `ABORT_GRAPH` | — |
| Worker → Main | `PROGRESS` | `{ message: string }` |
| Worker → Main | `LOADED` | `{ nodeCount, edgeCount, exceedsGraphLimits }` |
| Worker → Main | `FILTERED` | `{ id, nodes, edges, warnings }` |
| Worker → Main | `GRAPH_READY` | `{ nodes, edges }` |
| Worker → Main | `ERROR` | `{ message: string }` |

**Why single worker, not multiple?**
A single stateful worker holds all data internally (`allNodes`, `allEdges`). This avoids inter-worker communication overhead and keeps the architecture simple. The worker processes messages sequentially, with filter requests deduplicated by ID so stale responses are discarded.

**Performance impact**:

| Scenario | v1.0.1 | v1.1.0 |
|----------|--------|--------|
| 5MB file import (UI responsiveness) | Main thread blocked ~60s | Main thread never blocked |
| 30k node tenant initial display | Browser "not responding" dialog | Sub-second UI update |
| iOS Safari import | Full browser crash | Loads cleanly; graph capped at 3k nodes |
| Filtering 80k objects | UI freeze during filter | Worker processes asynchronously |
| Graph conversion (3k nodes) | Main thread blocked | Worker thread, ~50-100ms |

### 🗑️ Input Panel Removed

**Problem**: The left-side JSON editor (Input panel) added no security value and was the primary source of main-thread blocking:
- `highlight.js` syntax highlighting ran synchronously on the full JSON text — 15+ seconds on a 5MB file
- The panel re-parsed JSON on every keystroke
- Users never needed to edit raw JSON in the viewer

**Changes**:
- ✅ Input panel removed entirely — no more paste, Format button, or Render button
- ✅ Layout changed from 3-panel (input + view + details) to 2-panel (view + details)
- ✅ "Upload JSON" button reads the file and sends it directly to the worker
- ✅ "Load sample" sends the bundled sample object via the worker
- ✅ Drag-and-drop onto the main panel area still works

### 📱 Graph View on All Devices

The Graph tab is now available on **all browsers including iOS Safari**. The existing 3,000 highest-risk node cap keeps vis-network stable regardless of device memory. Testing with 27,537 nodes / 50,017 edges confirmed fast, smooth operation on both desktop and mobile.

- ✅ Graph tab enabled on all browsers (iOS Safari, Chrome iOS, Firefox iOS, all desktop browsers)
- ✅ 3,000 highest-risk nodes / 4,500 edges cap ensures stable canvas memory usage
- ✅ Physics simulation automatically disabled for large graphs (≥5,000 nodes in dataset)
- ✅ Dashboard iOS restrictions remain in place for the stats computation path (unrelated to graph canvas)

### 🌐 External Identity & Cross-Tenant Posture

**New scanner capability**: `oidsee_scanner.py` now collects tenant-level guest access and cross-tenant access policies from Microsoft Graph and emits a `TenantPolicy` node (type `externalIdentityPosture`) into the export.

**Signals collected**:
| Signal | Graph endpoint | Values |
|--------|---------------|--------|
| Guest access level | `/policies/authorizationPolicy` | `restricted`, `limited`, `permissive` |
| Cross-tenant default stance | `/policies/crossTenantAccessPolicy` | `restrictive`, `moderate`, `permissive` |
| Overall posture rating | Derived | `hardened`, `moderate`, `permissive`, `unknown` |

**`EXTERNAL_IDENTITY_POSTURE_AMPLIFIER` risk contributor**: When posture is `permissive` and a service principal already has high-risk indicators (broad reachability, governance risk, unverified publisher with privilege, or first-party reachability), it receives a +8 score amplifier. This reflects that a permissive external identity stance increases the blast radius of a compromised or malicious app.

**Dashboard**: A posture card is displayed in the Dashboard when the `TenantPolicy` node is present in the export, summarising guest access and cross-tenant stance.

**New preset filters** for cross-tenant / posture investigation:

| Filter name | What it finds |
|-------------|--------------|
| External Identity Posture | The `TenantPolicy` node (summary card) |
| Permissive Tenant Posture | Tenants rated `permissive` overall |
| Hardened Tenant Posture | Tenants rated `hardened` overall |
| Permissive Guest Access | Tenants with permissive guest access policy |
| Permissive Cross-Tenant Default | Tenants with permissive cross-tenant default |
| Posture Amplified Risk | SPs that received the `EXTERNAL_IDENTITY_POSTURE_AMPLIFIER` boost |
| Third-Party Apps | Service principals owned by external organisations |
| Multi-Tenant Sign-In Audience | SPs registered for `AzureADMultipleOrgs` or wider |



### 🔐 New Scanner Authentication Methods

> **Contributed by [@SuryenduB](https://github.com/SuryenduB) — [PR #74](https://github.com/OID-See/OID-See/pull/74)**

`oidsee_scanner.py` now supports a `--auth-method` parameter with five options, making it easier to authenticate in different environments without modifying the script:

| Method | Description | Best for |
|--------|-------------|----------|
| `interactive-browser` | Opens the system's default browser for OAuth login (recommended) | Standard desktop use |
| `azure-cli` | Reuses an existing `az login` session — no re-authentication needed | Developers already using Azure CLI |
| `default` | Tries credential sources in order: environment variables → managed identity → Azure CLI → interactive browser | Flexible / automation |
| `device-code` | Prints a code to enter at `aka.ms/devicelogin` — works without a local browser | SSH sessions, CI/CD with interactive approval |
| `client-secret` | Non-interactive service principal authentication | Automated pipelines |

**Usage examples**:

```bash
# Recommended for most users
python oidsee_scanner.py --tenant-id <TENANT_ID> --auth-method interactive-browser --out scan.json

# Fastest for developers with az login already done
python oidsee_scanner.py --tenant-id <TENANT_ID> --auth-method azure-cli --out scan.json

# Flexible credential chain
python oidsee_scanner.py --tenant-id <TENANT_ID> --auth-method default --out scan.json
```

**Backward compatibility**: If `--auth-method` is omitted, the scanner falls back to the legacy behaviour — client-secret auth if `--client-secret` is provided, otherwise device-code. Existing scripts require no changes.

**New argument**: `--interactive-browser-client-id` lets you specify a custom public client app ID for browser auth (defaults to the Azure CLI client ID).

---

### ⚡ Lazy Graph Loading

**Problem**: Previously, switching to any view after import would trigger vis-network graph data preparation, even if the user never opened the Graph tab.

**Solution**: The vis-network canvas is now only initialised when the user explicitly:
- Clicks the Graph tab
- Clicks "Visualise" from Table or Tree view (subset visualisation)

The graph view shows a "Load Graph View" button with a note about how many nodes will be shown for very large datasets.

### 📏 File Size Awareness

- File size is shown in the loading overlay before parsing begins (e.g. "Reading Large (5.1 MB) file…")
- After loading, datasets exceeding 3,000 nodes or 4,500 edges show an InfoDialog explaining the graph cap and that other views show the full dataset

### 🔢 Large Dataset Limits

| View | Data shown |
|------|-----------|
| Dashboard | Full dataset (30k+ nodes) |
| Table | Full dataset (30k+ nodes) |
| Tree | Full dataset (30k+ nodes) |
| Matrix | Full dataset (30k+ nodes) |
| Graph | Capped at 3,000 highest-risk nodes / 4,500 edges |

The graph cap has always existed; v1.1.0 makes it explicit and ensures all other views are unaffected.

## Upgrade Guide

### For Existing v1.0.1 Users

**Scanner updates**: `oidsee_scanner.py` gains new `--auth-method` options (`interactive-browser`, `azure-cli`, `default`) and the `--interactive-browser-client-id` argument. Existing scan commands work without modification — the new arguments are entirely optional.

**Viewer updates automatically** if you use [https://oid-see.netlify.app/](https://oid-see.netlify.app/).

For local deployments:
```bash
git fetch origin
git checkout v1.1.0
npm install
npm run build
```

### Breaking Changes

**Input Panel removed**: If you relied on pasting JSON directly into the editor panel, use **Upload JSON** instead (click the button or drag-and-drop your JSON file onto the main area). The uploaded file is processed entirely locally — nothing is sent to any server.

**No scanner changes required**: The Python scanner (`oidsee_scanner.py`) is backward-compatible — all existing scan commands work unchanged. New `--auth-method` options are opt-in additions.

## Technical Details

### Architecture

```
Browser Main Thread
│
├── React UI (renders filtered results, handles user events)
├── applyQuery() — vis-network filter (≤3k nodes, fast, stays on main thread)
└── Worker message handler (onmessage)
     │
     ▼
Web Worker (src/workers/dataWorker.ts)
│
├── allNodes: OidSeeNode[]    ← entire dataset lives here
├── allEdges: OidSeeEdge[]
│
├── LOAD:       JSON.parse → store → post LOADED + initial FILTERED
├── FILTER:     applyFilter() → computeWarnings() → post FILTERED
├── LOAD_GRAPH: sort by risk → truncate → convert to vis format → post GRAPH_READY
└── ABORT_GRAPH: cancel in-progress graph build
```

### Files Changed

**New files**:
- `src/workers/dataWorker.ts` — the Web Worker (Vite module worker)
- `src/filters/lens.ts` — `lensEdgeAllowed()` extracted for shared use by worker + main thread
- `src/workers/README.md` — architecture documentation

**Modified**:
- `src/App.tsx` — complete rewrite; 2-panel layout, worker-driven state
- `src/theme.css` — grid-template-columns updated for 2-panel layout
- `src/components/DashboardView.tsx` — synchronous iOS detection, no state race
- `src/components/ViewModeSelector.tsx` — iOS graph-disable removed; graph tab now available on all devices

**Removed**:
- `src/components/JSONEditor.tsx` (input panel) — no longer imported or used
- Main branch's multi-worker files (`WorkerManager.ts`, `fileParser.worker.ts`, `filter.worker.ts`, `graphProcessor.worker.ts`, `analytics.worker.ts`, `layout.worker.ts`) — superseded by the simpler single-worker architecture

### Testing

- ✅ Tested with 5.1MB large sample (multiple view switches, filtering, graph load)
- ✅ Confirmed fast on mobile (iOS/Android) and desktop (Chrome, Edge, Firefox) — including graph view
- ✅ Validated with 27,537 nodes / 50,017 edges real tenant export — graph view, all views fast
- ✅ TypeScript: no new type errors introduced (pre-existing errors in GraphCanvas.tsx unchanged)
- ✅ User acceptance: "stonkingly fast on mobile and desktop"

### Deployment

No changes to Netlify configuration required. Standard Web Workers work as-is on Netlify. `vite.config.ts` updated to include `worker: { format: 'es' }` for correct Vite module worker handling.

## Known Limitations

### Graph View Node Cap

The vis-network Graph View is capped at 3,000 nodes / 4,500 edges. For full-dataset exploration of large tenants, use Table, Tree, Matrix, or Dashboard views. Subset visualisation (selecting rows in Table/Tree and clicking "Visualise") works for up to 500 nodes.

## Community & Support

- **Documentation**: `docs/` directory, `README.md`
- **Issues**: [GitHub Issues](https://github.com/OID-See/OID-See/issues)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

### Acknowledgments

- [@SuryenduB](https://github.com/SuryenduB) for contributing the new scanner authentication methods (`--auth-method interactive-browser | azure-cli | default`) in [PR #74](https://github.com/OID-See/OID-See/pull/74) — a great quality-of-life improvement for all users
- @goldjg for identifying and driving the architectural requirements for large tenant support
- Confirmed against real enterprise tenant data (30k+ nodes, 50k+ edges)

---

**Release Date**: March 30, 2026
**Version**: 1.1.0
**License**: Apache 2.0
**Repository**: https://github.com/OID-See/OID-See

---

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
def categorize_owners_by_type(owners: List[Dict[str, Any]], dir_cache) -> Dict[str, int]:
    """
    Categorize owners by principal type.
    
    Returns a dictionary with counts:
    - 'user': Count of user principal owners
    - 'sp': Count of service principal owners
    - 'unknown': Count of other/unknown owner types
    """
    user_count = 0
    sp_count = 0
    unknown_count = 0
    
    for owner in owners:
        owner_id = owner.get("id")
        if not owner_id:
            unknown_count += 1
            continue
        
        # Resolve owner object to get @odata.type
        owner_obj = dir_cache.get(owner_id) if dir_cache else None
        if not owner_obj:
            unknown_count += 1
            continue
        
        odata_type = owner_obj.get("@odata.type", "").lower()
        if "user" in odata_type:
            user_count += 1
        elif "serviceprincipal" in odata_type:
            sp_count += 1
        else:
            unknown_count += 1
    
    return {"user": user_count, "sp": sp_count, "unknown": unknown_count}
```

**Risk Scoring**:
```python
# Add risk for having owners (inverted from previous model)
owner_categories = categorize_owners_by_type(owners, dir_cache)

if owner_categories["user"] > 0:
    risk_reasons.append({
        "code": "HAS_OWNERS_USER",
        "weight": 15,
        "message": f"Has {owner_categories['user']} user owner(s). Ownership grants change authority."
    })

if owner_categories["sp"] > 0:
    risk_reasons.append({
        "code": "HAS_OWNERS_SP",
        "weight": 8,
        "message": f"Has {owner_categories['sp']} service principal owner(s)."
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

---

# Release Notes - OID-See v1.0.0

## 🎉 Production Release - January 5, 2026

We are thrilled to announce OID-See v1.0, the first production-ready release! This milestone introduces a comprehensive Entra directory role tiering system, privileged scope classification framework, and metadata-driven risk scoring that dramatically improves security visibility in Microsoft 365 and Entra ID environments.

## What is OID-See?

OID-See is a security analysis tool that visualizes and scores OAuth/OIDC relationships in Microsoft 365 and Entra ID tenants. It helps security teams identify risky service principals, detect privilege escalation paths, and understand their identity attack surface.

## Why v1.0 Matters

Previous versions treated all directory roles equally and missed critical privilege patterns. v1.0 introduces:

✅ **Intelligent Role Tiering**: Differentiates between existential threats (Global Admin), blast radius risks (Application Admin), and operational roles (Security Reader)

✅ **Sophisticated Scope Analysis**: Identifies near-admin permissions (ReadWrite.All), state-changing operations (Action scopes), and overly broad grants (.All patterns)

✅ **Production-Ready Architecture**: Metadata-driven approach ensures schema stability and reduces upgrade complexity

✅ **Explainable Security**: Every risk score includes detailed breakdowns showing which tiers and scopes contribute to risk

## Key Features

### 🎯 Entra Role Tiering System

**Three-Tier Risk Model**

- **Tier 0 - Horizontal/Global Control** (🔴 Red)
  - Roles that control identity, authentication, or policy for entire tenant
  - Examples: Global Administrator, Privileged Role Administrator, Security Administrator
  - Risk impact: **6x higher** than Tier 2 roles
  - Scoring: Base 15 + 25 per role, max 75

- **Tier 1 - Vertical/Critical Services** (🟠 Orange)
  - Roles controlling critical workloads or platforms
  - Examples: Cloud Application Administrator, Application Administrator
  - Risk impact: **2x higher** than Tier 2 roles
  - Scoring: Base 8 + 10 per role, max 40

- **Tier 2 - Scoped/Operational** (🟡 Yellow)
  - Roles scoped to specific services with limited blast radius
  - Examples: Security Reader, Reports Reader, License Administrator
  - Scoring: Base 3 + 3 per role, max 15

**Coverage**: 27 Entra role template IDs mapped to tiers

**Explainability**: Risk reasons include:
- `rolesReachableTier0/1/2`: Counts of reachable roles by tier
- `tierBreakdown`: Array showing top roles per tier with display names
- `tierLabel`: Human-readable tier descriptions for UI display

### 🔒 Privileged Scope Classification

**Priority-Based Classification System**

1. **ReadWrite.All** (Weight 30, 🔴 Critical)
   - Near-admin level permissions requiring directory-wide write access
   - Examples: `Directory.ReadWrite.All`, `User.ReadWrite.All`, `Group.ReadWrite.All`
   - Recommendation: Replace with least-privilege alternatives

2. **Action Privileged** (Weight 25, 🟠 High)
   - State-changing operations with deterministic pattern matching
   - Patterns: `.action`, `.manage.`, `.send.`, `.accessasuser.all`, `.full_access`, `.importexport`, `.backup`, `.restore`, `.update`, `.delete`
   - Examples: `Application.ReadWrite.Action`, `User.Manage.All`
   - Recommendation: Review necessity; ensure proper governance

3. **Too Broad** (Weight 15, 🟡 Medium)
   - Permissions ending with `.All` enabling mass enumeration
   - Examples: `Mail.Read.All`, `Files.Read.All`
   - Recommendation: Consider scoped alternatives when possible

4. **Write Privileged** (Weight 20, 🟡 Medium-High)
   - Write or ReadWrite permissions without .All
   - Examples: `User.Write`, `Group.ReadWrite`
   - Recommendation: Validate necessity of write access

5. **Regular** (Weight 0, ⚪ Normal)
   - Standard read-only permissions
   - Examples: `User.Read`, `Calendars.Read`

**Architecture**: Metadata-based approach using `HAS_SCOPES` edge type with properties:
- `scopeRiskClass`: Classification label
- `scopeRiskWeight`: Numeric risk weight
- `isAllWildcard`: Boolean for .All pattern detection

**Benefits**:
- Schema stability (no new edge types)
- Runtime extensibility (patterns in config)
- Backward compatibility (existing edges work)

### 📊 Viewer Enhancements

**Dashboard - Privilege Tier Exposure**

New visual section showing:
- Service principal counts by tier with color-coded cards
- Total role assignments per tier
- Tier descriptions and security implications
- Responsive layout (3-column desktop, 1-column mobile)

**Details Panel Improvements**

When selecting a service principal:
- Tier breakdown with color-coded badges
- Top Tier 0 roles list (critical attention)
- Scope privilege breakdown (ReadWrite.All, Action, .All counts)
- Risk contributor details with scope classifications

**Preset Queries**

Nine new queries for quick filtering:
- "Has Tier 0 Roles" - Critical service principals
- "ReadWrite.All Scopes" - Near-admin permissions
- "Action Scopes" - State-changing operations
- "Tier 0/1/2 Roles" - Role node filtering
- "Privileged Scopes" - Any privileged scope pattern

### 📈 HTML Report Generator

**New Tier Exposure Section**

Visual report includes:
- Tier overview cards with metrics and descriptions
- Top Tier 0 role assignments table
- Security implications by tier
- ReadWrite.All and Action scope summaries

**Enhanced Recommendations**

Prioritized action items:
- 🔴 **Critical**: Tier 0 role reachability
  - "Reduce Tier 0 role reachability; review app assignments/grants; consider Conditional Access, Privileged Identity Management, or access reviews"
- 🟠 **High**: ReadWrite.All scopes
  - "Replace with least-privilege scopes; review necessity; consider application roles with constrained permissions"
- 🟠 **High**: Action scopes
  - "Review Action-style permissions for state-changing operations; ensure proper governance"

## Technical Improvements

### Configuration-Driven Architecture

**scoring_logic.json Enhancements**
- `role_tiering` section with tier definitions and template ID mappings
- `scope_classifications` with `risk_weight` and `patterns` arrays
- Action patterns moved from code to config for extensibility

**Benefits**:
- No code changes required to add new patterns
- Consistent scoring across scanner, viewer, and report
- Easy tuning of weights for organizational policies

### Scanner Improvements

**New Helper Functions**
- `get_role_tier(template_id)`: Lookup tier for any Entra role
- `get_tier_config(tier)`: Retrieve tier configuration
- `classify_scopes(scopes)`: Priority-based classification with metadata

**Enhanced Risk Calculation**
- `compute_risk_for_sp()` now tier-aware with role definitions
- Single `HAS_PRIVILEGED_SCOPES` contributor (unified approach)
- Max scope risk calculation across all resources

**Edge Enrichment**
- Scope edges include `scopeRiskClass`, `scopeRiskWeight`, `isAllWildcard`
- Role nodes include `tier`, `tierLabel` properties
- Backward compatible with existing exports

### Viewer Architecture

**TypeScript Type Safety**
- Edge type enums updated (removed HAS_READWRITE_ALL_SCOPES, HAS_PRIVILEGED_ACTION_SCOPES)
- Preset queries use metadata filtering (`e.properties.scopeRiskClass`)
- Consistent with backend schema

**CSS Improvements**
- Tier card styling with color gradients
- Proper text wrapping for long descriptions
- Full-width dashboard sections
- Responsive breakpoints for mobile

## Testing & Quality

### Test Coverage

**New Test Suite** (`test_tier_scoring.py`)
- Role tier mapping validation
- Tier config retrieval tests
- Scope classification priority verification
- Tier-based weight calculation tests
- Unified scope risk scoring tests

**Results**: 6 test functions, 100% pass rate

### Security Validation

**CodeQL Analysis**: 0 vulnerabilities
- Python: 0 alerts
- JavaScript/TypeScript: 0 alerts

**Build Validation**: All builds pass
- TypeScript/Vite compilation: ✅
- Python syntax checks: ✅
- CSS/SCSS validation: ✅

### Performance

**No Degradation**
- Metadata-based edges avoid schema bloat
- Config-driven patterns enable runtime flexibility
- Tier lookups use O(1) dictionaries

## Upgrade Guide

### For Existing Users

**Good News**: v1.0 is backward compatible!

1. **Existing Exports**: Work without modification
   - Old edge types still supported
   - Risk scores recalculated with new logic

2. **New Scans**: Automatically include tier metadata
   - Role nodes enriched with tier properties
   - Scope edges include risk classification

3. **Configuration**: Optional tuning
   - Adjust tier weights in `scoring_logic.json`
   - Add custom action patterns to config

### Recommended Actions

1. **Re-scan your tenant** to populate tier metadata
2. **Review Tier 0 exposure** in dashboard
3. **Examine ReadWrite.All scopes** using preset queries
4. **Update documentation** for your security team

## Breaking Changes

**None**. This release is fully backward compatible.

## Known Limitations

1. **Role Tiering**: Covers 27 most common Entra roles
   - Unknown roles fall back to legacy scoring (base: 10, per_role: 5, max: 30)
   - Custom roles not yet tier-classified

2. **Action Patterns**: Based on common OAuth2/Graph patterns
   - May not cover all proprietary API scopes
   - Extensible via `scoring_logic.json`

3. **PIM Integration**: Direct role assignments only
   - Eligible (PIM) assignments not yet detected
   - Planned for future release

## Migration Path

### From private-beta-2 to v1.0

No migration required. Simply:
1. Update to v1.0
2. Run new scan (optional but recommended)
3. Enjoy enhanced risk visibility

### From earlier versions

If using pre-beta versions:
1. Review `scoring_logic.json` format changes
2. Update any custom scoring configurations
3. Re-scan tenant for full tier metadata

## Community & Support

### Getting Help

- **Documentation**: See `README.md` and `docs/` directory
- **Issues**: Report bugs via GitHub Issues
- **Security**: Email security@oid-see.io for vulnerabilities

### Contributing

We welcome contributions! Areas of interest:
- Additional Entra role mappings
- Action pattern libraries
- Visualization improvements
- Documentation enhancements

### Acknowledgments

Special thanks to:
- @goldjg for comprehensive security architecture review
- Early beta testers for real-world validation
- Merill Fernando for Microsoft Apps feed integration
- Microsoft Graph team for API documentation

## Conclusion

OID-See v1.0 represents a significant milestone in identity security tooling. By intelligently distinguishing between privilege levels and permission patterns, organizations can now focus their security efforts where they matter most: protecting Tier 0 assets and eliminating near-admin permissions.

---

**Release Date**: January 5, 2026  
**Version**: 1.0.0  
**License**: Apache 2.0  
**Repository**: https://github.com/OID-See/OID-See

---

# Release Notes - private-beta-2

## Overview

This release delivers major improvements to both the OID-See scanner and viewer, making them production-ready for large-scale enterprise deployments.

**Scanner Performance**: Massive performance improvements (97-98% faster) through bulk fetching and Graph API batching. Large tenant scans that took ~103 minutes now complete in ~2-3 minutes.

**Viewer Performance**: Dramatically improved ability to handle large datasets. Previously, loading tenant exports with 10,000+ nodes caused browser unresponsiveness and crashes. This release introduces alternative visualization modes, virtual rendering infrastructure, and comprehensive performance optimizations that enable analysis of datasets with 50,000+ nodes while maintaining browser responsiveness.

**Key Highlights:**
- ✅ Scanner: 97-98% faster scans through bulk fetching and Graph API batching
- ✅ Scanner: Application cache population from 66 min → 1 min (60-360x faster)
- ✅ Scanner: SP data collection from 35 min → 30-60 sec (12-18x faster)
- ✅ Scanner: HTTP requests reduced by 97% (48,576 → 1,621)
- ✅ Viewer: Alternative visualization modes (Table, Tree, Matrix, Dashboard) for large datasets
- ✅ Viewer: Virtual rendering with viewport-based display and progressive detail levels
- ✅ Viewer: Graph View automatically handles datasets up to 3k nodes with physics disabled for larger graphs
- ✅ Architecture documentation for future 30k+ node graph support
- ✅ Large sample dataset (12k nodes, 18k edges) for testing

## What's New

### Alternative Visualization Modes

For organizations with large tenants (10,000+ nodes), the traditional graph visualization becomes impractical. This release adds four alternative views optimized for large-scale data analysis:

#### 1. **Dashboard View** (Recommended Starting Point)
- Statistical summary with key metrics
- Risk distribution pie chart
- Node type breakdown
- Edge type distribution
- Capability analysis
- Load time: < 100ms for any dataset size

#### 2. **Table View** (High Performance)
- Virtual scrolling handles 50,000+ nodes smoothly
- Search, sort, and filter capabilities
- Inline risk analysis
- CSV export functionality
- Column customization
- Load time: ~500ms for 50k nodes

#### 3. **Tree View** (Hierarchical Organization)
- Organize nodes by type (ServicePrincipal, Application, User, Group, Role)
- Risk aggregation at folder level
- Expandable/collapsible sections
- Quick navigation
- Load time: ~800ms for 20k nodes

#### 4. **Matrix View** (Relationship Heat Map)
- Visual heat map of edge distribution between node types
- Quick identification of relationship patterns
- Export to CSV for further analysis
- Load time: ~300ms for any dataset size

#### 5. **Graph View** (Enhanced)
- Automatically truncates to top 3,000 highest-risk nodes for datasets > 3k
- Physics disabled by default for large graphs
- Virtual rendering with viewport-based display
- Progressive detail levels (distant = points, nearby = full detail)
- Clustering for aggregating distant nodes

### Performance Optimizations

#### Virtual Rendering Infrastructure
- **Spatial Indexing**: QuadTree-based spatial index for O(log n) node lookups
- **Viewport Culling**: Only render nodes visible in current viewport
- **Progressive Detail**: Render distant nodes as simple points, full detail when zoomed
- **Clustering**: Aggregate groups of distant nodes into single cluster representations
- **Lazy Loading**: Defer non-critical rendering until after initial display

#### Async Processing & UI Responsiveness
- **Event Loop Yielding**: Long operations yield control back to browser every 16ms
- **Batched Operations**: Process 1,000 items per batch with setTimeout yielding
- **Loading Feedback**: Show progress during file parsing, JSON processing, and graph construction
- **Background Processing**: Move truncation and sorting to background to keep UI responsive

#### Large Graph Detection
- Auto-detect graphs ≥3,000 nodes/edges
- Disable physics by default (gravitational/spring constants = 0)
- Skip stabilization for physics-disabled graphs
- Show clear warnings when truncation occurs

### Architecture Documentation

Added comprehensive technical documentation for future enhancements:

**`docs/LARGE_GRAPH_ARCHITECTURE.md`** - Detailed designs for handling 30k+ node graphs:
- Virtual rendering with viewport-based display
- Web Workers for background processing
- Alternative visualization strategies
- Progressive loading approaches
- Performance targets and testing strategy
- Implementation roadmap with effort estimates

**`docs/visualization-modes.md`** - Complete guide to all view modes:
- When to use each visualization mode
- Performance characteristics
- Feature comparison matrix
- Usage examples and best practices
- Keyboard shortcuts and interactions

### Sample Data for Testing

**`src/samples/sample-large-oidsee-graph.json`** (3.2MB)
- 12,000 nodes (2,400 of each type: ServicePrincipal, Application, User, Group, Role)
- 18,000 edges (distributed across relationship types)
- Risk distribution: 3,600 high-risk, 3,600 medium-risk, 4,800 low-risk
- Exceeds 3k threshold to trigger all large graph optimizations
- Perfect for testing performance improvements

### Diagnostic Tools

**Comprehensive Console Logging:**
- All logs prefixed with `[OID-See]` or `[GraphCanvas]` for easy filtering
- Timing information for all major operations (read, parse, truncate, convert, render)
- Step-by-step timing for filter/lens operations
- DataSet update logging (add, remove, visibility changes)
- Batch operation progress tracking
- vis-network initialization and stabilization events

**Open browser console (F12) to:**
- Track exact timing of operations
- Identify performance bottlenecks
- Debug unresponsive UI issues
- Monitor memory usage patterns

## Performance Improvements

### Before vs After

| Dataset Size | Before (private-beta-1) | After (private-beta-2) |
|-------------|------------------------|------------------------|
| **1,000 nodes** | ✅ Responsive (~2s) | ✅ Responsive (~1s) |
| **3,000 nodes** | ⚠️ Slow (~15s, physics issues) | ✅ Responsive (~2s, physics off) |
| **10,000 nodes** | ❌ Browser unresponsive | ✅ Dashboard View (~100ms)<br>✅ Table View (~1s) |
| **29,000 nodes** | ❌ Browser crash | ✅ Dashboard View (~100ms)<br>✅ Table View (~2.5s)<br>✅ Graph View (3k subset, ~3s) |
| **50,000+ nodes** | ❌ Not possible | ✅ Table View (~5s)<br>✅ Dashboard View (~100ms) |

### Measured Improvements

**Graph View (3k node limit):**
- Loading time: 70% faster (15s → 4.5s)
- No browser "not responding" dialogs
- Smooth pan/zoom interactions
- Immediate filter application

**Table View (50k nodes):**
- Initial render: < 5 seconds
- Virtual scrolling: 60 FPS
- Search/filter: < 500ms
- Sort: < 1 second

**Dashboard View (any size):**
- Load time: < 100ms regardless of dataset size
- Instant statistics generation
- No UI blocking

### Scanner Performance Optimization (97-98% Faster)

**Impact**: Large tenant scans that took ~103 minutes now complete in ~2-3 minutes

**Problem Solved**: Scanner performance degraded significantly in large tenants due to inefficient per-resource Graph API queries and limited parallelism.

**Example Tenant (8,096 service principals)**:
- **Before**: 103 minutes total (66 min app cache + 35 min SP collection + overhead)
- **After**: 2-3 minutes total (1 min app cache + 30-60 sec SP collection + overhead)
- **Improvement**: 97-98% reduction in scan time

#### Key Scanner Optimizations

##### 1. Bulk Application Fetching (60-360x faster)
- **Before**: Made 8,096 individual filtered Graph queries (one per appId)
- **After**: Single bulk query + in-memory filtering
- **Impact**: Application cache population from 66 minutes → 1 minute

##### 2. Graph API Batch Requests (12-18x faster)
- **Before**: 40,480 individual HTTP requests (8,096 SPs × 5 calls each)
- **After**: ~1,620 batch requests using Microsoft Graph `$batch` endpoint
- **Impact**: SP data collection from 35 minutes → 30-60 seconds
- **Details**: Maximized batch sizes (5 SPs × 4 operations = 20 requests per batch) with 20 parallel workers

##### 3. Increased Parallelism (2x faster)
- Worker threads increased from 10 → 20 for resource loading and role definitions
- Thread-safe caching eliminates redundant API calls
- Async cache updates with proper locking

##### 4. Enhanced Progress Indicators
- Clean output showing scan progress without debug clutter
- Error messages displayed for failed batch requests
- Accurate progress tracking based on batch completion

##### 5. Technical Implementation Details
- Properly separates beta and v1.0 API calls per Microsoft Graph requirements
- URLs correctly formatted without version prefix in batch requests
- Comprehensive error handling with automatic fallback to individual requests
- Thread-safe locking for all shared caches and results
- Async cache updates eliminate wait time

#### Scanner Performance Benchmarks

| Tenant Size | Before | After | Improvement |
|-------------|--------|-------|-------------|
| 1,000 SPs | ~13 min | ~30 sec | 96% |
| 5,000 SPs | ~52 min | ~1.5 min | 97% |
| 8,096 SPs | ~103 min | ~2-3 min | 97-98% |
| 10,000 SPs | ~128 min | ~3-4 min | 97-98% |

**HTTP Request Reduction**:
- **Before**: 48,576 individual HTTP requests
- **After**: ~1,621 batch requests
- **Reduction**: 97% fewer round-trips

## Bug Fixes

### vis-network Configuration
- ❌ **Fixed**: Removed invalid `selectOnClick` option (not supported in vis-network 10.x)
- ❌ **Fixed**: Disabled `improvedLayout` for large graphs to prevent layout algorithm errors
- ❌ **Fixed**: Console errors: "Unknown option detected: 'selectOnClick'"

### Rendering & Interaction
- ❌ **Fixed**: Node rendering errors in custom `doubleCircleRenderer` for Group nodes
- ❌ **Fixed**: Pan/zoom interaction conflicts with navigation buttons
- ❌ **Fixed**: Graph canvas freezing during DataSet updates
- ❌ **Fixed**: Null/undefined nodes causing rendering failures

### Filter & Lens Operations
- ❌ **Fixed**: Recurring errors on every lens change for large graphs
- ❌ **Fixed**: `applyQuery` function throwing errors and breaking UI
- ❌ **Fixed**: Filter operations blocking UI thread for extended periods

### Performance & Stability
- ❌ **Fixed**: JSON parsing blocking main thread for 30+ seconds
- ❌ **Fixed**: Graph construction causing browser "not responding" dialogs
- ❌ **Fixed**: Race conditions in DataSet updates
- ❌ **Fixed**: Memory leaks in batch processing
- ❌ **Fixed**: UI blocking during graph truncation and sorting

## Technical Details

### File Changes (46 commits)

**New Files:**
- `docs/LARGE_GRAPH_ARCHITECTURE.md` - Architecture documentation (739 lines)
- `docs/visualization-modes.md` - View modes guide (357 lines)
- `src/components/DashboardView.tsx` - Dashboard implementation (255 lines)
- `src/components/TableView.tsx` - Table view with virtual scrolling (343 lines)
- `src/components/TreeView.tsx` - Hierarchical tree view (277 lines)
- `src/components/MatrixView.tsx` - Relationship matrix (260 lines)
- `src/components/ViewModeSelector.tsx` - View mode switcher (39 lines)
- `src/components/LoadingOverlay.tsx` - Loading indicator (74 lines)
- `src/components/InfoDialog.tsx` - Information dialog (44 lines)
- `src/adapters/VirtualGraphRenderer.ts` - Virtual rendering engine (531 lines)
- `src/adapters/QuadTree.ts` - Spatial indexing (196 lines)
- `src/adapters/ClusteringLayout.ts` - Node clustering (280 lines)
- `src/types/ViewMode.ts` - View mode types (18 lines)
- `src/samples/sample-large-oidsee-graph.json` - Test data (3.2MB)
- `src/samples/README.md` - Sample documentation (42 lines)
- `src/theme.css` - View mode styling (1,015 lines)

**Modified Files:**
- `src/App.tsx` - View mode integration, loading states, truncation logic
- `src/components/GraphCanvas.tsx` - Virtual rendering, batching, error handling
- `src/adapters/toVisData.ts` - Enhanced data conversion with batching
- `README.md` - Updated with visualization modes and performance info
- `docs/README.md` - Added links to new documentation

**Total Changes:** 5,642 insertions, 170 deletions across 21 files

### Implementation Highlights

#### Truncation Strategy
```typescript
const MAX_RENDERABLE_NODES = 3000;
const MAX_RENDERABLE_EDGES = 4500;

if (nodeCount > MAX_RENDERABLE_NODES) {
  // Sort by risk score descending
  const sortedNodes = [...nodes].sort((a, b) => 
    (b.risk?.score ?? 0) - (a.risk?.score ?? 0)
  );
  const truncatedNodes = sortedNodes.slice(0, MAX_RENDERABLE_NODES);
  const nodeIds = new Set(truncatedNodes.map(n => n.id));
  const truncatedEdges = edges.filter(e => 
    nodeIds.has(e.from) && nodeIds.has(e.to)
  );
  
  // Show warning to user
  showTruncationWarning(nodeCount, edgeCount, truncatedNodes.length, truncatedEdges.length);
}
```

#### Virtual Rendering
```typescript
class VirtualGraphRenderer {
  private spatialIndex: QuadTree;
  private viewport: Viewport;
  
  updateVisibility(): void {
    const visibleNodes = this.spatialIndex.query(this.viewport);
    const detailLevel = this.calculateDetailLevel(this.viewport.zoom);
    
    this.renderNodes(visibleNodes, detailLevel);
  }
  
  calculateDetailLevel(zoom: number): 'point' | 'icon' | 'full' {
    if (zoom < 0.3) return 'point';
    if (zoom < 0.7) return 'icon';
    return 'full';
  }
}
```

#### Batched Processing
```typescript
async function processBatched<T>(
  items: T[], 
  batchSize: number, 
  processor: (batch: T[]) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));
    processor(batch);
    
    if (i + batchSize < items.length) {
      // Yield to event loop
      await new Promise(resolve => setTimeout(resolve, 1));
    }
  }
}
```

## Breaking Changes

None. This release is fully backward compatible with existing scan data.

## Upgrade Notes

1. **No configuration changes required** - All optimizations activate automatically based on dataset size
2. **Existing exports work unchanged** - No need to re-scan your tenant
3. **View mode automatically selected** - Dashboard View for large graphs, Graph View for small graphs
4. **Browser requirements unchanged** - Modern browsers (Chrome, Edge, Firefox, Safari)

## Known Limitations

### Graph View Performance Boundary
- Graph View limited to 3,000 nodes due to vis-network canvas rendering constraints
- Graphs exceeding limit automatically truncate to highest-risk nodes
- For full dataset analysis, use Table View, Tree View, or Dashboard View

### Extremely Large Datasets (30k+ nodes)
- While Table/Dashboard views handle 50k+ nodes well, Graph View of entire dataset requires architectural changes
- See `docs/LARGE_GRAPH_ARCHITECTURE.md` for future enhancement roadmap
- Recommended approach: Filter to specific subsets then visualize in Graph View

### Browser Memory
- Very large datasets (50k+ nodes) may consume significant browser memory (1-2GB)
- Close other tabs if experiencing performance issues
- Consider using filters to reduce working set size

## Migration Path

### From private-beta-1 to private-beta-2

1. **Update the viewer** - Pull latest code or visit https://oid-see.netlify.app/
2. **No re-scan needed** - Existing JSON exports work with new viewer
3. **Try alternative views** - For large exports, start with Dashboard View

### Recommended Workflow for Large Datasets

1. **Upload** - Select your OID-See JSON export
2. **Dashboard View** - Get statistical overview (loads instantly)
3. **Table View** - Search, sort, filter to identify items of interest
4. **Apply Filters** - Use query language to reduce dataset (`n.risk.score>=70`)
5. **Graph View** - Visualize filtered subset for relationship analysis

## Testing

- ✅ TypeScript compilation passes
- ✅ Build process completes successfully
- ✅ CodeQL security scan passes with no vulnerabilities
- ✅ Manual testing with 12k node sample dataset
- ✅ Performance validated across all view modes
- ✅ Cross-browser compatibility (Chrome, Edge, Firefox, Safari)
- ✅ Scanner performance validated with test suite
- ✅ Thread safety validated with locks on shared results
- ✅ Proper API version separation (beta and v1.0)

## Contributors

- Implementation: GitHub Copilot
- Testing & Review: @goldjg
- Architecture Design: Collaborative

## Future Enhancements

See `docs/LARGE_GRAPH_ARCHITECTURE.md` for detailed roadmap:
- **Phase 1**: Web Workers for background processing (4-6 weeks)
- **Phase 2**: Full virtual rendering for Graph View (4-6 weeks)  
- **Phase 3**: Advanced analytics dashboard (6-8 weeks)

---

# Release Notes - private-beta-1

## Overview

This release addresses critical false positive issues in OID-See's risk scoring logic. The scanner now correctly respects the `appOwnership` field when calculating risk scores, preventing legitimate Microsoft first-party applications from being incorrectly flagged with attribution-related security risks.

## What's Fixed

### False Positive Risk Elimination

The scanner was incorrectly adding multiple high-severity risks to legitimate Microsoft first-party apps, even though these apps were correctly identified using Merill Fernando's authoritative Microsoft Apps feed. This affected approximately 60+ Microsoft apps in typical tenant scans.

**Risks Fixed:**
- **IDENTITY_LAUNDERING** (15 points) - No longer triggered for confirmed 1st Party apps
- **DECEPTION** (20 points) - No longer triggered for name mismatches in 1st Party apps  
- **MIXED_REPLYURL_DOMAINS** (5-15 points) - No longer triggered when Microsoft apps use multiple Microsoft domains
- **REPLYURL_OUTLIER_DOMAIN** (10 points) - No longer triggered for legitimate Microsoft domain portfolios

### Example Impact

**Before Fix:**
```json
{
  "displayName": "Office Shredding Service",
  "appOwnership": "1st Party",
  "risk": {
    "score": 76,
    "reasons": [
      {"code": "IDENTITY_LAUNDERING", "weight": 15},
      {"code": "DECEPTION", "weight": 20}
    ]
  }
}
```

**After Fix:**
```json
{
  "displayName": "Office Shredding Service", 
  "appOwnership": "1st Party",
  "risk": {
    "score": 41,
    "reasons": [
      {"code": "BROAD_REACHABILITY", "weight": 15},
      {"code": "UNVERIFIED_PUBLISHER", "weight": 6}
    ]
  }
}
```

The false positive risks (IDENTITY_LAUNDERING, DECEPTION) are eliminated, resulting in more accurate risk assessment.

## Technical Details

### Changes Made

**File: `oidsee_scanner.py`**

Four risk calculation sections were updated to respect the `appOwnership` field:

1. **IDENTITY_LAUNDERING** (lines 1942-1956)
   - Added check: `is_first_party = app_ownership == "1st Party"`
   - Gate condition: `and not is_first_party`

2. **DECEPTION** (lines 1921-1940)
   - Added check: `is_first_party = app_ownership == "1st Party"`
   - Gate condition: `and not is_first_party`

3. **MIXED_REPLYURL_DOMAINS** (lines 1958-1975)
   - Added check: `is_first_party = app_ownership == "1st Party"`
   - Gate condition: `and not is_first_party`

4. **REPLYURL_OUTLIER_DOMAIN** (lines 2013-2039)
   - Added checks: `is_first_party` and `is_well_known_ms`
   - Gate condition: `and not is_well_known_ms and not is_first_party`

### Testing

**New Test Suite:** `tests/test_appownership_risk_logic.py`

Five comprehensive tests validate the fixes:
- ✅ 1st Party apps skip IDENTITY_LAUNDERING
- ✅ 1st Party apps skip DECEPTION
- ✅ 1st Party apps skip MIXED_REPLYURL_DOMAINS
- ✅ 1st Party apps skip REPLYURL_OUTLIER_DOMAIN
- ✅ Internal apps skip UNVERIFIED_PUBLISHER (existing behavior)

All tests verify both:
- Negative cases: 1st Party apps are correctly excluded
- Positive cases: 3rd Party apps with same characteristics are still flagged

**Test Results:**
- ✅ All new tests pass (5/5)
- ✅ All existing tests pass
- ✅ No regressions detected

### Integration with Merill's Feed

The scanner fetches app ownership data from:
- **Source:** https://github.com/merill/microsoft-info
- **Feed URL:** https://raw.githubusercontent.com/merill/microsoft-info/main/_info/MicrosoftApps.json

The `appOwnership` field values:
- **"1st Party"** - Legitimate Microsoft apps verified via Merill's feed
- **"3rd Party"** - External apps from other vendors
- **"Internal"** - Apps owned by the scanning tenant

This fix ensures the scanner consistently respects this classification throughout all risk calculations.

## Breaking Changes

None. This is a bug fix that improves accuracy without changing the API or data format.

## Upgrade Notes

1. No configuration changes required
2. Existing scan data remains valid
3. New scans will automatically benefit from corrected risk scoring
4. Consider re-scanning to get updated risk scores for affected applications

## Known Issues

None related to this fix.

## Contributors

- Fixed by: GitHub Copilot
- Integration with: Merill Fernando's Microsoft Apps feed
- Reviewed by: @goldjg

## Git Tagging

When this PR is merged to `main`, tag the merge commit as `private-beta-1`:
```bash
git tag -a private-beta-1 <merge-commit-sha> -m "Release private-beta-1: Fix appOwnership risk scoring"
git push origin private-beta-1
```

## Next Steps

Future enhancements may include:
- Consider reduced weight for UNVERIFIED_PUBLISHER when `appOwnership == "1st Party"`
- Enhanced domain ownership verification via RDAP/WHOIS for non-Microsoft apps
- Additional feed integrations for other trusted app directories
