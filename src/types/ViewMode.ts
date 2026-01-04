// View modes for alternative visualizations
export type ViewMode = 'graph' | 'table' | 'tree' | 'matrix' | 'dashboard'

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  graph: 'Graph View',
  table: 'Table View',
  tree: 'Tree View',
  matrix: 'Matrix View',
  dashboard: 'Dashboard View',
}

export const VIEW_MODE_DESCRIPTIONS: Record<ViewMode, string> = {
  graph: 'Interactive network graph visualization',
  table: 'Tabular view with sorting and filtering',
  tree: 'Hierarchical tree view grouped by type',
  matrix: 'Heat map showing relationship distributions',
  dashboard: 'Summary statistics and top risks',
}
