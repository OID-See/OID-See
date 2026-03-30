# Large Graph Architecture

## Executive Summary

This document describes the architectural approach used in OID-See to handle extremely large exports (30k+ nodes, 50k+ edges) in the web viewer.

**Implemented Solution:** A single Web Worker (`src/workers/dataWorker.ts`) handles all heavy processing — JSON parsing, filter/lens evaluation, and vis-network graph conversion — completely off the main thread. The main thread is never blocked during import or filtering. Performance testing with real-world 30k+ node tenant exports confirmed the approach as "stonkingly fast on mobile and desktop."

The alternative visualization modes (Table, Tree, Matrix, Dashboard) described in this document were also fully implemented and show the **complete dataset** with no node cap. Graph View remains capped at 3,000 highest-risk nodes / 4,500 edges for vis-network canvas stability.

## Implemented Solution

### Web Worker Architecture (dataWorker.ts)

All heavy processing runs in a single Vite module Web Worker (`src/workers/dataWorker.ts`). The main thread is never blocked.

**Why a single worker?** Simpler shared state — the full parsed dataset lives in one place, no inter-worker communication, no serialisation overhead between workers.

#### Message Protocol

**Main → Worker:**

| Message | Payload | Description |
|---------|---------|-------------|
| `LOAD` | `{ text: string }` | Parse JSON text and build node/edge dataset |
| `FILTER` | `{ id, query, lens, pathAware }` | Apply query and lens to current dataset |
| `LOAD_GRAPH` | `{ subsetNodeIds? }` | Convert dataset (or subset) to vis-network format |
| `ABORT_GRAPH` | — | Cancel an in-progress graph conversion |

**Worker → Main:**

| Message | Payload | Description |
|---------|---------|-------------|
| `PROGRESS` | `{ message }` | Status update during long operations |
| `LOADED` | `{ nodeCount, edgeCount, exceedsGraphLimits }` | Parse complete |
| `FILTERED` | `{ id, nodes, edges, warnings }` | Filter result ready |
| `GRAPH_READY` | `{ nodes, edges }` | vis-network data ready for render |
| `ERROR` | `{ message }` | Unrecoverable error |

#### What stays on the main thread

- React state and UI rendering
- `applyQuery` for graph view subset (≤ 3,000 nodes, fast)
- vis-network canvas rendering

### Large Dataset Behaviour

- **Graph View**: Capped at 3,000 highest-risk nodes and 4,500 edges. A warning InfoDialog is shown after load when these thresholds are exceeded.
- **Table / Tree / Matrix / Dashboard**: Show the full dataset — no cap.
- **File size**: Displayed in the loading overlay before parsing begins.
- **Graph View lazy loading**: The vis-network canvas is only initialised when the user clicks the Graph tab or clicks "Visualise" from Table/Tree view.
- **iOS Safari**: Graph View is permanently disabled on all iOS devices. Apple requires all iOS browsers to use the WebKit engine, which runs out of memory on large vis-network canvases. All other views work normally on iOS.

### Input Panel Removed

The previous left-side JSON editor (paste / Format / Render buttons) has been removed entirely. It was a source of main-thread blocking via highlight.js syntax highlighting on large JSON. Data is now loaded via:
1. **Upload JSON** button / drag-and-drop → file text sent to worker via `postMessage`
2. **Load sample** button → sample fetched and sent to worker

## Historical Context & Previous Recommendations

The remainder of this document preserves the original architectural analysis and the alternative approaches that were considered. The sections below were written before the Web Worker implementation and describe the state of the codebase at that time.

---

## Previous State & Limitations (Historical)

The following optimizations were implemented and tested:

1. **Hard rendering limits** (3,000 nodes / 4,500 edges)
   - Auto-truncation to highest-risk nodes
   - Edge filtering to maintain relationships
   
2. **Async processing & batching**
   - 100ms render delay for UI responsiveness
   - 1,000 item batches with 1ms yielding
   - Race condition prevention for concurrent updates

3. **Physics optimization**
   - Automatic physics disabling for large graphs
   - Disabled improvedLayout algorithm
   - Skip stabilization for faster rendering

4. **Error handling**
   - Graceful fallbacks for malformed data
   - Try-catch around filter/lens operations
   - Custom renderer error handling

5. **User feedback**
   - Loading overlay with immediate feedback
   - Clear truncation warnings
   - Comprehensive console logging for diagnostics

### Identified Bottlenecks

Testing with 29k node real tenant exports identified these fundamental issues:

1. **vis-network canvas rendering is synchronous**
   - Drawing 3k+ nodes blocks the main thread regardless of batching
   - No way to make canvas operations non-blocking
   - Browser "not responding" dialogs appear during render cycles

2. **Complex data model adds overhead**
   - Custom renderers (doubleCircleRenderer for Groups)
   - Risk scoring calculations
   - Relationship filtering for edges
   - Each adds processing time per node/edge

3. **Filter/lens operations are blocking**
   - applyQuery evaluates expressions against all nodes
   - Even with try-catch, large datasets cause delays
   - No way to interrupt or yield during evaluation

4. **Memory pressure**
   - Keeping 29k nodes in browser memory
   - vis-network maintains multiple data structures
   - DataSets, view state, layout information

### Previously Recommended Architectural Changes (Now Implemented or Superseded)

### 1. Virtual Rendering with Viewport-Based Display

**Problem Solved:** Reduces canvas rendering overhead by only displaying visible nodes

**Implementation Approach:**

#### 1.1 Core Concept
Instead of rendering all nodes, only render nodes within the current viewport plus a buffer zone. As users pan/zoom, dynamically load/unload nodes.

#### 1.2 Technical Design

```typescript
interface VirtualGraph {
  allNodes: OidSeeNode[];      // Full dataset in memory
  allEdges: OidSeeEdge[];      // Full dataset in memory
  visibleNodes: OidSeeNode[];  // Currently rendered (100-500 nodes)
  visibleEdges: OidSeeEdge[];  // Edges connecting visible nodes
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
}

class VirtualGraphRenderer {
  private spatialIndex: QuadTree<OidSeeNode>; // For fast spatial queries
  private renderBatchSize = 100;
  private viewportBuffer = 1.2; // 20% buffer outside viewport
  
  updateViewport(newViewport: Viewport) {
    // 1. Query spatial index for nodes in viewport + buffer
    const nodesToRender = this.spatialIndex.query(
      newViewport.x - buffer,
      newViewport.y - buffer,
      newViewport.width + 2*buffer,
      newViewport.height + 2*buffer
    );
    
    // 2. Batch update visible nodes
    this.batchUpdateVisible(nodesToRender);
    
    // 3. Update edges connecting visible nodes
    this.updateVisibleEdges(nodesToRender);
  }
  
  private batchUpdateVisible(nodes: OidSeeNode[]) {
    // Process in small batches with yielding
    for (let i = 0; i < nodes.length; i += this.renderBatchSize) {
      const batch = nodes.slice(i, i + this.renderBatchSize);
      this.dataSet.add(batch);
      if (i + this.renderBatchSize < nodes.length) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
  }
}
```

#### 1.3 Initial Layout Strategy

**Challenge:** Need initial positions for 29k nodes without rendering them all

**Solution - Clustering-Based Layout:**

```typescript
interface ClusterNode {
  id: string;
  nodeIds: string[];      // Original nodes in this cluster
  position: { x: number; y: number };
  size: number;           // Number of nodes represented
  riskScore: number;      // Aggregate risk
}

class ClusteringLayoutEngine {
  async computeInitialLayout(nodes: OidSeeNode[]): Promise<NodePosition[]> {
    // 1. Group nodes by type and risk
    const clusters = this.createClusters(nodes, {
      maxClusterSize: 100,
      groupBy: ['type', 'riskLevel']
    });
    
    // 2. Use force-directed layout on clusters (fast with only ~50-200 clusters)
    const clusterPositions = await this.layoutClusters(clusters);
    
    // 3. Assign positions to individual nodes within each cluster
    return this.distributeNodesInClusters(nodes, clusterPositions);
  }
  
  private createClusters(nodes: OidSeeNode[], options: ClusterOptions): ClusterNode[] {
    // K-means or hierarchical clustering
    // Prioritize high-risk nodes (should be in smaller, more visible clusters)
    // Group by type (ServicePrincipal, Application, User, Group, Role)
  }
}
```

#### 1.4 Implementation Steps

1. **Phase 1: Add spatial indexing**
   - Implement QuadTree or R-Tree for fast spatial queries
   - Pre-compute initial layout using clustering approach
   - Store positions with node data

2. **Phase 2: Viewport tracking**
   - Listen to vis-network pan/zoom events
   - Calculate visible region with buffer
   - Query spatial index for nodes to render

3. **Phase 3: Dynamic loading**
   - Implement batch loading of visible nodes
   - Unload nodes that leave viewport
   - Manage edge updates for visible connections

4. **Phase 4: Progressive enhancement**
   - Show low-detail view while loading (cluster representatives)
   - Progressively increase detail as user zooms in
   - Cache rendered regions for smooth panning

#### 1.5 Expected Performance

- **Initial load:** 2-5 seconds (clustering + spatial index)
- **Rendering:** 200-500ms (100-500 nodes in viewport)
- **Pan/zoom:** 50-100ms (update visible set)
- **Memory:** ~50-100MB (full dataset + spatial index)
- **Responsive:** No blocking operations > 100ms

### 2. Web Workers for Background Processing ✅ IMPLEMENTED

See **Implemented Solution** section above. `src/workers/dataWorker.ts` handles all heavy processing. The multi-worker architecture described below was considered but replaced by the simpler single-worker design.

#### Previously Considered Multi-Worker Architecture (Superseded)

```typescript
// Main thread
class GraphWorkerManager {
  private workers: {
    filter: Worker;
    layout: Worker;
    analysis: Worker;
  };
  
  async applyFilter(query: string, dataset: GraphData): Promise<FilterResult> {
    return this.postToWorker('filter', {
      action: 'apply',
      query,
      nodes: dataset.nodes,
      edges: dataset.edges
    });
  }
  
  async computeLayout(nodes: OidSeeNode[]): Promise<NodePosition[]> {
    return this.postToWorker('layout', {
      action: 'compute',
      nodes,
      algorithm: 'forceatlas2'
    });
  }
}

// Worker thread (filter-worker.ts)
self.addEventListener('message', async (e) => {
  const { action, query, nodes, edges } = e.data;
  
  if (action === 'apply') {
    // Parse query
    const ast = parseQuery(query);
    
    // Filter nodes in batches to allow cancellation
    const filteredNodes = [];
    for (let i = 0; i < nodes.length; i += 1000) {
      const batch = nodes.slice(i, i + 1000);
      const filtered = batch.filter(node => evaluateAST(ast, node));
      filteredNodes.push(...filtered);
      
      // Check for cancellation
      if (shouldCancel()) break;
      
      // Report progress
      self.postMessage({
        type: 'progress',
        processed: i + batch.length,
        total: nodes.length
      });
    }
    
    // Filter edges
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(e => 
      nodeIds.has(e.from) && nodeIds.has(e.to)
    );
    
    self.postMessage({
      type: 'complete',
      nodes: filteredNodes,
      edges: filteredEdges
    });
  }
});
```

#### 2.2 Operations to Offload

1. **Filter/Lens Computations**
   - Parse and evaluate query AST
   - Filter nodes and edges
   - Compute path-aware relationships

2. **Layout Algorithms**
   - Force-directed positioning
   - Clustering
   - Community detection

3. **Risk Analysis**
   - Risk score calculations
   - Aggregations and statistics
   - Attack path analysis

#### 2.3 Implementation Steps

1. **Phase 1: Filter worker**
   - Move applyQuery logic to worker
   - Implement progress reporting
   - Add cancellation support

2. **Phase 2: Layout worker**
   - Implement clustering algorithm
   - Compute initial positions
   - Progressive refinement

3. **Phase 3: Analysis worker**
   - Risk calculations
   - Path finding
   - Graph statistics

#### 2.4 Expected Performance

- **Filter operations:** Continue in background, ~2-5 seconds for 29k nodes
- **UI responsiveness:** No blocking, smooth progress updates
- **Cancellation:** User can interrupt long-running operations
- **Memory:** Each worker ~50-100MB isolated from main thread

### 3. Alternative Visualization Modes

**Problem Solved:** Provide useful views of large datasets without graph rendering

**Implementation Approach:**

#### 3.1 Tabular View with Lazy Loading

```typescript
interface TableView {
  columns: TableColumn[];
  sortBy: string;
  filterQuery: string;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

class VirtualTable {
  private rowHeight = 40;
  private visibleRows = Math.ceil(window.innerHeight / this.rowHeight);
  
  render() {
    // Only render visible rows + buffer
    const startIdx = this.pagination.page * this.pagination.pageSize;
    const endIdx = startIdx + this.visibleRows + 10;
    const visibleData = this.filteredData.slice(startIdx, endIdx);
    
    return (
      <div style={{ height: this.pagination.total * this.rowHeight }}>
        <div style={{ transform: `translateY(${startIdx * this.rowHeight}px)` }}>
          {visibleData.map(node => <NodeRow key={node.id} node={node} />)}
        </div>
      </div>
    );
  }
}
```

**Features:**
- Sort by any column (type, risk score, display name)
- Server-side pagination for 29k+ rows
- Inline actions (expand relationships, visualize subgraph)
- Export filtered results
- Bulk selection for operations

#### 3.2 Hierarchical Tree View

```typescript
interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
  collapsed: boolean;
  riskScore: number;
}

class HierarchicalView {
  buildTree(nodes: OidSeeNode[], edges: OidSeeEdge[]): TreeNode[] {
    // Group by type
    const types = ['ServicePrincipal', 'Application', 'User', 'Group', 'Role'];
    
    return types.map(type => ({
      id: type,
      label: `${type} (${nodes.filter(n => n.type === type).length})`,
      children: this.buildChildrenForType(type, nodes, edges),
      collapsed: true,
      riskScore: this.aggregateRisk(nodes.filter(n => n.type === type))
    }));
  }
}
```

**Features:**
- Collapse/expand branches
- Lazy load children on expand
- Show relationship counts
- Highlight high-risk paths
- Click to visualize subgraph (< 500 nodes)

#### 3.3 Heat Map / Matrix View

```typescript
interface MatrixView {
  rows: NodeType[];      // Source types
  columns: NodeType[];   // Target types
  cells: {
    count: number;
    riskLevel: 'high' | 'medium' | 'low';
  }[][];
}
```

**Shows:**
- Relationship patterns between node types
- Risk distribution across relationships
- Click cell to filter and show in table
- Interactive drill-down

#### 3.4 Dashboard / Summary View

```typescript
interface DashboardMetrics {
  totalNodes: number;
  nodesByType: Record<NodeType, number>;
  totalEdges: number;
  edgesByType: Record<EdgeType, number>;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topRiskyNodes: OidSeeNode[];  // Top 20
  criticalPaths: PathInfo[];     // Most concerning attack paths
}
```

**Features:**
- High-level overview without rendering graph
- Click metrics to filter and view detail
- Export reports
- Time-series comparison (if historical data available)

#### 3.5 Hybrid Approach: "Visualize Subset"

Allow users to select nodes in table/tree view and visualize them:

```typescript
class SubsetVisualizer {
  async visualizeSelection(selectedNodes: OidSeeNode[]) {
    if (selectedNodes.length > 1000) {
      showWarning('Please select fewer than 1000 nodes to visualize');
      return;
    }
    
    // Get edges between selected nodes
    const nodeIds = new Set(selectedNodes.map(n => n.id));
    const edges = this.allEdges.filter(e => 
      nodeIds.has(e.from) && nodeIds.has(e.to)
    );
    
    // Render in popup or side panel
    this.renderGraph(selectedNodes, edges);
  }
}
```

#### 3.6 Implementation Steps

1. **Phase 1: Table view** (highest priority)
   - Virtual scrolling for large datasets
   - Column sorting and filtering
   - Inline expansion for node details

2. **Phase 2: Tree view**
   - Hierarchical grouping
   - Lazy loading of children
   - Integration with table view

3. **Phase 3: Matrix/heatmap**
   - Relationship visualization
   - Click to filter

4. **Phase 4: Dashboard**
   - Metrics and statistics
   - Top N lists
   - Export functionality

### 4. Progressive Loading & Rendering

**Problem Solved:** Show something useful quickly, refine over time

**Implementation Approach:**

#### 4.1 Loading Stages

```typescript
enum LoadingStage {
  PARSING = 'parsing',           // 0-20%: Parse JSON
  INDEXING = 'indexing',          // 20-40%: Build spatial index
  CLUSTERING = 'clustering',      // 40-60%: Group nodes
  LAYOUT = 'layout',             // 60-80%: Compute positions
  RENDERING = 'rendering'         // 80-100%: Draw visible nodes
}

class ProgressiveLoader {
  async load(file: File): Promise<void> {
    // Stage 1: Parse JSON (20%)
    this.updateProgress(LoadingStage.PARSING, 10);
    const data = await this.parseJSON(file);
    this.updateProgress(LoadingStage.PARSING, 20);
    
    // Stage 2: Build indexes (20%)
    this.updateProgress(LoadingStage.INDEXING, 25);
    const spatialIndex = await this.buildSpatialIndex(data.nodes);
    this.updateProgress(LoadingStage.INDEXING, 40);
    
    // Stage 3: Cluster nodes (20%)
    this.updateProgress(LoadingStage.CLUSTERING, 45);
    const clusters = await this.clusterNodes(data.nodes);
    this.updateProgress(LoadingStage.CLUSTERING, 60);
    
    // Stage 4: Compute layout (20%)
    this.updateProgress(LoadingStage.LAYOUT, 65);
    const positions = await this.computeLayout(clusters);
    this.updateProgress(LoadingStage.LAYOUT, 80);
    
    // Stage 5: Render visible (20%)
    this.updateProgress(LoadingStage.RENDERING, 85);
    await this.renderVisible(positions);
    this.updateProgress(LoadingStage.RENDERING, 100);
  }
}
```

#### 4.2 Visual Feedback

```typescript
interface ProgressIndicator {
  stage: LoadingStage;
  percent: number;
  message: string;
  estimatedTime: number;  // seconds remaining
}

// Show detailed progress
<LoadingOverlay>
  <ProgressBar value={percent} />
  <LoadingMessage>
    {stage}: {message}
  </LoadingMessage>
  <EstimatedTime>
    About {estimatedTime}s remaining
  </EstimatedTime>
</LoadingOverlay>
```

#### 4.3 Incremental Refinement

```typescript
class IncrementalRenderer {
  async renderProgressive(nodes: OidSeeNode[]) {
    // Pass 1: Show cluster representatives (100 nodes)
    await this.renderClusters(nodes);
    await delay(50);
    
    // Pass 2: Show high-risk nodes (top 500)
    await this.renderHighRisk(nodes);
    await delay(50);
    
    // Pass 3: Show visible viewport (500 nodes)
    await this.renderViewport(nodes);
    await delay(50);
    
    // Pass 4: Refine layout
    await this.refineLayout();
  }
}
```

## Implementation Roadmap

### Near-Term (Next PR)

**Focus: Table view with virtual scrolling**

**Estimated Effort:** 2-3 weeks

**Tasks:**
1. Implement VirtualTable component with react-window or react-virtual
2. Add column configuration (sortable, filterable)
3. Integrate with existing filter/lens logic
4. Add "Visualize Subset" action (< 500 nodes)
5. Test with 29k node dataset

**Acceptance Criteria:**
- Table loads 29k nodes in < 2 seconds
- Smooth scrolling (60fps)
- All filter/lens operations work
- Can select and visualize subsets

### Mid-Term (Follow-up PRs)

**Focus: Virtual rendering + Web Workers**

**Estimated Effort:** 4-6 weeks

**Tasks:**
1. Implement spatial indexing (QuadTree)
2. Build clustering-based layout engine
3. Create filter worker for background processing
4. Implement viewport-based rendering
5. Add progressive loading stages
6. Test and optimize performance

**Acceptance Criteria:**
- Graph renders 29k nodes without blocking
- Pan/zoom is smooth (60fps)
- Filters run in background with progress
- No "not responding" dialogs

### Long-Term (Future Enhancements)

**Focus: Alternative visualizations + Advanced analytics**

**Estimated Effort:** 6-8 weeks

**Tasks:**
1. Tree view with lazy loading
2. Matrix/heatmap view
3. Dashboard with metrics
4. Advanced layout algorithms (ForceAtlas2, etc.)
5. Path analysis worker
6. Export and reporting features

## Technical Considerations

### Browser Compatibility

- **Web Workers:** Supported in all modern browsers
- **OffscreenCanvas:** For rendering in workers (Chrome 69+, Firefox 105+)
- **SharedArrayBuffer:** For worker communication (requires COOP/COEP headers)
- **Spatial Indexing:** Pure JavaScript, no compatibility issues

### Memory Management

**Current (3k nodes):** ~50MB
**Target (29k nodes virtual):** ~150MB

**Strategies:**
- Lazy loading of node details
- Weak references for cached data
- Periodic garbage collection hints
- Unload off-screen nodes

### Performance Targets

| Operation | Current (3k) | Target (29k) |
|-----------|-------------|--------------|
| Initial load | 2-3s | 3-5s |
| Filter | 500ms | 2-3s (background) |
| Render | 1-2s | 200-500ms (viewport) |
| Pan/zoom | Instant | 50-100ms |
| Lens change | 1s | 2-3s (background) |

### Testing Strategy

1. **Unit tests:** Worker logic, spatial index, clustering
2. **Integration tests:** Full loading pipeline with large datasets
3. **Performance tests:** Measure rendering time, memory usage
4. **User testing:** Validate UX with real exports

## Alternative Approaches Considered

### 1. Canvas-Only Rendering (Rejected)

**Approach:** Replace vis-network with custom canvas renderer

**Pros:**
- Full control over rendering
- Potentially faster for large graphs

**Cons:**
- Massive implementation effort (layout, physics, interactions)
- Would lose vis-network features (clustering, physics, etc.)
- Custom renderers (doubleCircle) would need reimplementation
- Not worth the effort vs. virtual rendering

### 2. WebGL Rendering (Considered)

**Approach:** Use WebGL for hardware-accelerated rendering

**Pros:**
- Can render 100k+ nodes at 60fps
- Hardware accelerated

**Cons:**
- Complex implementation
- Limited text rendering (labels)
- Browser compatibility concerns
- Overkill for 29k nodes

**Decision:** May revisit if virtual rendering insufficient

### 3. Pre-Aggregation (Rejected - Out of Scope)

**Approach:** Server generates pre-filtered exports

**Pros:**
- No client-side performance issues

**Cons:**
- Requires server-side changes
- Out of scope for current architecture
- Limits flexibility for ad-hoc filtering

### 4. Graph Simplification (Considered)

**Approach:** Automatically merge/hide low-importance nodes

**Pros:**
- Reduces rendering complexity

**Cons:**
- May hide important relationships
- Complex heuristics needed
- User might not understand what's hidden

**Decision:** Better as optional feature, not default

## Conclusion

The Web Worker architecture (`dataWorker.ts`) and the alternative visualization modes (Table, Tree, Matrix, Dashboard) have been fully implemented. OID-See now handles 30k+ node tenant exports without blocking the UI, confirmed by user testing on both mobile and desktop.

**Implemented:**
1. ✅ **Web Worker** — single `dataWorker.ts`, main thread never blocks
2. ✅ **Table view** — full dataset, virtual scrolling
3. ✅ **Tree view** — hierarchical, full dataset
4. ✅ **Matrix view** — relationship heat map
5. ✅ **Dashboard view** — metrics and risk summary
6. ✅ **Lazy graph loading** — vis-network only initialised on demand
7. ✅ **iOS Safari protection** — Graph tab disabled on all iOS devices
8. ✅ **File size display** — shown in loading overlay before parse begins
9. ✅ **Large dataset warning** — InfoDialog shown when nodeCount > 3,000 or edgeCount > 4,500
