# Release Notes - OID-See v1.1.0

## 🚀 Major Performance Release — March 30, 2026

OID-See v1.1.0 is a major architectural overhaul of the web viewer focused on real-world tenant scale. Testing with genuine enterprise tenants revealed that the previous architecture blocked the browser main thread during import of large exports (30k+ nodes, 50k+ edges), causing iOS Safari to crash and desktop browsers to show "page not responding" dialogs. This release eliminates those problems entirely by moving all heavy processing to a Web Worker.

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
| iOS Safari import | Full browser crash | Loads cleanly (graph view disabled) |
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

### 📱 iOS Safari Protection

**Problem**: All iOS browsers (Safari, Chrome, Firefox, Edge) are required by Apple to use the WebKit engine. WebKit has strict memory limits that cause it to kill tabs when vis-network attempts to allocate canvas memory for 3,000+ node graphs.

**Solution**: The Graph tab is permanently disabled on all iOS devices. A clear message explains why and directs users to Table, Tree, Matrix, or Dashboard views — all of which work fully on iOS.

- ✅ `isIOS()` detection runs synchronously at render time (not in a useEffect, avoiding state race conditions)
- ✅ Graph tab shows a tooltip explaining the limitation
- ✅ Dashboard, Table, Tree, and Matrix views are fully functional on iOS

### 🦥 Lazy Graph Loading

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

**No action required for the scanner** — `oidsee_scanner.py` is unchanged. Existing scan exports work without modification.

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

**No scanner changes**: The Python scanner (`oidsee_scanner.py`), scoring logic, schema, and report generator are all unchanged in v1.1.0.

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
- `src/components/ViewModeSelector.tsx` — Graph tab disabled on iOS with tooltip

**Removed**:
- `src/components/JSONEditor.tsx` (input panel) — no longer imported or used
- Main branch's multi-worker files (`WorkerManager.ts`, `fileParser.worker.ts`, `filter.worker.ts`, `graphProcessor.worker.ts`, `analytics.worker.ts`, `layout.worker.ts`) — superseded by the simpler single-worker architecture

### Testing

- ✅ Tested with 5.1MB large sample (multiple view switches, filtering, graph load)
- ✅ Confirmed fast on mobile (iOS/Android) and desktop (Chrome, Edge, Firefox)
- ✅ TypeScript: no new type errors introduced (pre-existing errors in GraphCanvas.tsx/JSONEditor.tsx unchanged)
- ✅ User acceptance: "stonkingly fast on mobile and desktop"

### Deployment

No changes to Netlify configuration required. Standard Web Workers work as-is on Netlify. `vite.config.ts` updated to include `worker: { format: 'es' }` for correct Vite module worker handling.

## Known Limitations

### Graph View on iOS

Graph view is unavailable on all iOS devices by design. This is a fundamental WebKit memory constraint, not a bug that can be fixed in JavaScript. All four other views (Dashboard, Table, Tree, Matrix) work fully on iOS.

### Graph View Node Cap

The vis-network Graph View is capped at 3,000 nodes / 4,500 edges. For full-dataset exploration of large tenants, use Table, Tree, Matrix, or Dashboard views. Subset visualisation (selecting rows in Table/Tree and clicking "Visualise") works for up to 500 nodes.

## Community & Support

- **Documentation**: `docs/` directory, `README.md`
- **Issues**: [GitHub Issues](https://github.com/OID-See/OID-See/issues)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)

### Acknowledgments

- @goldjg for identifying and driving the architectural requirements for large tenant support
- Confirmed against real enterprise tenant data (30k+ nodes, 50k+ edges)

---

**Release Date**: March 30, 2026
**Version**: 1.1.0
**License**: Apache 2.0
**Repository**: https://github.com/OID-See/OID-See
