import { ViewMode, VIEW_MODE_LABELS, VIEW_MODE_DESCRIPTIONS } from '../types/ViewMode'

type ViewModeSelectorProps = {
  currentMode: ViewMode
  onChange: (mode: ViewMode) => void
  viewsReady?: Set<ViewMode>
}

export function ViewModeSelector({ currentMode, onChange, viewsReady = new Set() }: ViewModeSelectorProps) {
  const modes: ViewMode[] = ['dashboard', 'table', 'tree', 'matrix', 'graph']
  
  // When viewsReady is empty, we're in initial state (no data loaded yet)
  // In this case, all buttons should be enabled to allow initial selection
  const hasData = viewsReady.size > 0

  return (
    <div className="view-mode-selector">
      <label className="view-mode-selector__label">View:</label>
      <div className="view-mode-selector__buttons">
        {modes.map((mode) => {
          // Button is ready if: no data loaded yet, or this specific view is ready
          const isReady = !hasData || viewsReady.has(mode)
          // Graph view uses lazy loading - allow clicking even when not ready
          // Clicking will trigger the lazy processing
          const isDisabled = hasData && !isReady && mode !== 'graph'
          // Show loading indicator for graph view when data exists but not ready
          const isLoading = hasData && mode === 'graph' && !viewsReady.has('graph')
          return (
            <button
              key={mode}
              className={`btn btn--view-mode${currentMode === mode ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
              onClick={() => onChange(mode)}
              disabled={isDisabled}
              title={isDisabled ? 'Loading...' : isLoading ? 'Click to load graph view...' : VIEW_MODE_DESCRIPTIONS[mode]}
            >
              {VIEW_MODE_LABELS[mode]}{isLoading ? ' ⏳' : isDisabled ? ' ⏳' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
