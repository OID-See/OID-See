# Alternative Visualization Modes

OID-See provides multiple visualization modes to efficiently handle and analyze large datasets. Each mode is optimized for different use cases and scales effectively with datasets containing thousands of nodes and edges.

## Overview

The viewer includes five distinct visualization modes accessible via the **View** selector in the header:

1. **Graph View** - Traditional network graph visualization (default)
2. **Table View** - Tabular data view with virtual scrolling
3. **Tree View** - Hierarchical tree structure grouped by type
4. **Matrix View** - Heat map showing relationships between node types
5. **Dashboard View** - Statistical summary and key metrics

## 1. Graph View (Traditional)

The original network visualization mode. For large datasets, the graph automatically renders only the top 3,000 highest-risk nodes so performance stays smooth on any device.

**Features:**
- Interactive force-directed graph layout
- Node dragging and repositioning
- Zoom and pan controls
- Real-time filtering and lens switching
- Automatic cap at 3,000 highest-risk nodes for large datasets

**When to use:**
- Exploring relationships between specific entities
- Investigating security paths and attack vectors
- Any dataset size (large datasets are automatically capped)

**Limitations:**
- For datasets over 3,000 nodes, only the highest-risk nodes are shown — use Table/Tree/Matrix views to access the full dataset

## 2. Table View

A high-performance tabular view with virtual scrolling, designed to handle massive datasets efficiently.

**Features:**
- **Virtual Scrolling**: Renders only visible rows, enabling smooth navigation through 29,000+ rows
- **Column Sorting**: Click column headers to sort by any field (ascending/descending)
- **Search Filtering**: Quick filter box to search across all columns
- **Bulk Selection**: Checkbox selection for multiple rows
- **Inline Actions**:
  - **Show Details**: Expand row to view all node properties
  - **Show Relationships**: Display connected nodes and edges
  - **Export**: Download selected nodes as JSON
- **Bulk Operations**:
  - Select multiple nodes
  - Visualize subset in graph view (respects size limits)
  - Export selection to JSON file
- **Row Details**: Expandable panels showing full node properties and relationships

**Columns Displayed:**
- ID
- Type
- Display Name
- Risk Score (with color coding)
- Owner (if applicable)
- Properties (key-value pairs)

**When to use:**
- Analyzing large datasets (10,000+ nodes)
- Searching for specific nodes by name or ID
- Sorting and comparing nodes by risk score or type
- Exporting filtered data for external analysis
- Bulk operations on multiple nodes

**Performance:**
- Handles 50,000+ rows smoothly
- Virtual scrolling maintains 60 FPS performance
- Instant search and filter response

## 3. Tree View

A hierarchical tree structure that organizes nodes by type with collapsible branches.

**Features:**
- **Type Grouping**: Nodes organized by type (ServicePrincipal, Application, User, Group, etc.)
- **Collapsible Tree**: Expand/collapse branches to navigate large hierarchies
- **Lazy Loading**: Child nodes load on-demand when branches expand
- **Risk Aggregation**: Each type shows aggregated risk statistics
  - Total nodes in category
  - Average risk score
  - Maximum risk score
  - High-risk node count
- **Node Icons**: Visual indicators for node types
- **Risk Color Coding**: Visual risk severity (red = critical, yellow = medium, green = low)
- **Subgraph Visualization**: Right-click nodes to visualize their neighborhood in graph view
- **Search**: Quick filter to find specific nodes in the tree
- **Bulk Selection**: Select nodes across different branches
- **Export**: Export selected subtrees to JSON

**Tree Structure:**
```
📦 ServicePrincipals (1,245 nodes, avg risk: 65)
  ├─ 🔵 Contoso App (risk: 85)
  ├─ 🔵 Marketing Portal (risk: 45)
  └─ ...
📦 Applications (823 nodes, avg risk: 58)
  ├─ 📱 Mobile App (risk: 70)
  └─ ...
📦 Users (15,432 nodes, avg risk: 12)
📦 Groups (892 nodes, avg risk: 8)
```

**When to use:**
- Understanding dataset composition by type
- Comparing risk levels across different categories
- Drilling down into specific node types
- Identifying high-risk nodes within each category
- Analyzing organizational structure and membership hierarchies

**Performance:**
- Lazy loading enables navigation of 100,000+ node trees
- Smooth expand/collapse animations
- Efficient filtering and search

## 4. Matrix View

A heat map visualization showing relationship patterns and risk distributions between node types.

**Features:**
- **Relationship Matrix**: Rows and columns represent node types, cells show edge counts
- **Color Intensity**: Darker cells indicate more relationships
- **Risk Overlay**: Cell colors reflect average risk score of relationships
- **Interactive Cells**: Click any cell to:
  - View detailed relationship list in table view
  - See specific nodes involved in that relationship type
  - Export the subset to JSON
- **Hover Tooltips**: Show exact counts and statistics for each cell
- **Type Labels**: Clear axis labels for source and target types
- **Legend**: Color scale explanation for risk levels and relationship counts

**Matrix Example:**
```
                ServicePrincipal  Application  User   Group
ServicePrincipal    342 (red)      128         0      0
Application         0              0           0      0
User                1,245          892         0      423
Group               234            0           1,023  12
```

**Cell Information:**
- **Count**: Number of edges between the two types
- **Average Risk**: Mean risk score of involved nodes
- **Color**: Intensity indicates relationship density and risk level

**When to use:**
- Understanding relationship patterns across the dataset
- Identifying unusual or unexpected connection types
- Finding high-risk relationship categories
- Discovering data quality issues (e.g., unexpected edge types)
- Quick assessment of dataset structure

**Performance:**
- Instant calculation for datasets up to 100,000 edges
- Responsive hover and click interactions
- Efficient filtering to table view

## 5. Dashboard View

A comprehensive statistical summary providing key metrics and insights about the dataset.

**Features:**

### Summary Statistics
- **Total Nodes**: Count by type with breakdown
- **Total Edges**: Count by type with breakdown
- **Risk Distribution**: Nodes grouped by severity (Critical, High, Medium, Low, Info)
- **Risk Metrics**: Average, median, max risk scores

### Top Risky Nodes
- List of 10 highest-risk nodes
- Displays ID, name, type, and risk score
- Click to view details or visualize in graph

### Critical Paths
- Identified attack paths and privilege escalation routes
- Path length and risk assessment
- Interactive path exploration

### Type Distribution Charts
- Bar chart showing node counts by type
- Pie chart of risk distribution
- Edge type frequency analysis

### Risk Factors
- Top contributing risk factors
- Frequency and impact analysis
- Recommendations for remediation

### Time-Based Statistics (Future)
- Comparison with previous scans
- Trend analysis
- Change detection

**When to use:**
- Executive overview of security posture
- Identifying immediate priorities (top risky nodes)
- Understanding dataset composition
- Reporting and documentation
- Initial assessment of a new scan

**Performance:**
- Instant calculation of all metrics
- Responsive charts and visualizations
- Handles datasets of any size

## 6. Hybrid Approach (Subset Visualization)

A special feature that enables selective visualization of subsets from any view mode.

**Features:**
- **Size Constraints**: Enforces maximum of 500 nodes for graph rendering
- **Subset Selection**: Select nodes in Table or Tree view, then visualize
- **"Visualize Selection" Button**: Appears when nodes are selected
- **Smart Filtering**: Automatically includes connected edges for selected nodes
- **Warning Messages**: Alerts when selection exceeds size limits
- **Automatic Switching**: Seamlessly switches to Graph View for visualization

**Workflow:**
1. Use Table View or Tree View to filter/search for specific nodes
2. Select nodes using checkboxes (up to 500 nodes)
3. Click "Visualize Selection" button
4. System switches to Graph View showing only selected nodes and their relationships
5. Explore the focused subgraph with full graph view features

**When to use:**
- Investigating specific nodes or node groups in large datasets
- Focusing on high-risk nodes only
- Analyzing relationships within a specific department or type
- Creating focused visualizations for presentations

**Size Limits:**
- **Maximum**: 500 nodes per visualization
- **Recommended**: 100-200 nodes for optimal performance
- **Warning**: Displayed when approaching or exceeding limits

## Switching Between Views

Use the **View** selector in the header to switch between modes:
- All views share the same underlying dataset
- Filters and selections are preserved when possible
- Switching is instant with no data reload required
- Each view maintains its own state (sorting, expansion, etc.)

## Performance Characteristics

| View Mode  | Max Recommended Size | Rendering Time | Memory Usage | Best For |
|-----------|---------------------|----------------|--------------|----------|
| Graph     | Any size (capped at 3,000 highest-risk nodes) | 2-5s | High | Exploration, risk investigation |
| Table     | 100,000+ nodes      | < 1s          | Low          | Large datasets, searching |
| Tree      | 100,000+ nodes      | < 1s          | Medium       | Hierarchical data, type analysis |
| Matrix    | 100,000 edges       | < 1s          | Low          | Relationship patterns |
| Dashboard | Unlimited           | < 1s          | Low          | Overview, reporting |

## Tips and Best Practices

### For Any Dataset Size
1. **Start with Dashboard View**: Get an overview of the dataset composition and top risks
2. **Use Graph View**: Automatically shows the 3,000 highest-risk nodes on any device
3. **Use Table View for search**: Find specific nodes quickly with search and filters
4. **Use Tree View for type analysis**: Understand risk distribution across node types
5. **Use Matrix View for patterns**: Identify relationship anomalies
6. **Use Hybrid Approach**: Visualize only relevant subsets in Graph View

### For Investigations
1. **Dashboard**: Identify top risks and critical paths
2. **Table**: Search for specific entities or filter by criteria
3. **Tree**: Understand organizational structure
4. **Graph** (subset): Visualize specific relationships and paths
5. **Matrix**: Identify unexpected connection patterns

### Performance Optimization
- **Virtual Scrolling**: Table and Tree views use virtual scrolling—only visible items are rendered
- **Lazy Loading**: Tree branches load children on-demand
- **Debounced Search**: Search filters apply after typing pauses
- **Efficient Filtering**: All views use indexed lookups for fast filtering
- **Minimal Re-rendering**: React optimizations prevent unnecessary updates

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Graph View |
| `2` | Switch to Table View |
| `3` | Switch to Tree View |
| `4` | Switch to Matrix View |
| `5` | Switch to Dashboard View |
| `/` | Focus search box |
| `Esc` | Clear search/selection |
| `Ctrl+A` | Select all (in Table/Tree view) |
| `Ctrl+E` | Export selection |

## Export Formats

All views support exporting data in JSON format:

```json
{
  "exportedAt": "2026-01-03T23:59:00Z",
  "viewMode": "table",
  "filters": "n.risk.score>=70",
  "selectedNodes": [...],
  "includedEdges": [...]
}
```

## Future Enhancements

Planned improvements for visualization modes:

- **Time-series comparison**: Compare multiple scans over time
- **Advanced filtering UI**: Visual query builder
- **Custom views**: Save and share custom view configurations
- **Collaborative annotations**: Add notes and comments to nodes
- **Export to PowerBI**: Direct export for enterprise reporting
- **Real-time updates**: Live data refresh from Microsoft Graph
- **Mobile optimization**: Touch-friendly interfaces for tablets

## Troubleshooting

### Graph View Performance Issues
- **Problem**: Slow rendering or unresponsive UI
- **Solution**: Use Table View to filter data first, then visualize subset

### Table View Search Not Finding Nodes
- **Problem**: Search returns no results
- **Solution**: Check that search is matching against the correct columns; try ID or type filters

### Tree View Not Expanding
- **Problem**: Clicking expand icon does nothing
- **Solution**: Ensure data is loaded; check browser console for errors

### Matrix View Cells Empty
- **Problem**: Matrix shows no relationships
- **Solution**: Verify edges exist in dataset; check edge type filters

### Subset Visualization Size Limit
- **Problem**: "Selection exceeds 500 nodes" warning
- **Solution**: Refine filters to select fewer nodes; prioritize high-risk nodes

## Technical Implementation

The alternative visualization modes are implemented using:
- **React 19**: Component-based architecture with hooks and `startTransition`
- **TypeScript**: Type-safe development
- **react-window**: Virtual scrolling for Table and Tree views
- **D3.js**: Matrix visualization and charts
- **CSS Grid**: Responsive layouts
- **Web Worker** (`src/workers/dataWorker.ts`): All JSON parsing and filter/lens evaluation runs off the main thread; the UI never blocks on import or filtering

All views operate entirely client-side with no server dependencies.
