import { ViewMode, VIEW_MODE_LABELS, VIEW_MODE_DESCRIPTIONS } from '../types/ViewMode'

type ViewModeSelectorProps = {
  currentMode: ViewMode
  onChange: (mode: ViewMode) => void
  viewsReady?: Set<ViewMode>
}

export function ViewModeSelector({ currentMode, onChange, viewsReady = new Set() }: ViewModeSelectorProps) {
  const modes: ViewMode[] = ['dashboard', 'table', 'tree', 'matrix', 'graph']

  // When viewsReady is empty, we're in initial state (no data loaded yet)
  const hasData = viewsReady.size > 0

  return (
    <div className="view-mode-selector">
      <label className="view-mode-selector__label">View:</label>
      <div className="view-mode-selector__buttons">
        {modes.map((mode) => {
          const isReady = !hasData || viewsReady.has(mode)
          const isDisabled = !isReady
          const title = isDisabled
            ? 'Loading…'
            : VIEW_MODE_DESCRIPTIONS[mode]
          return (
            <button
              key={mode}
              className={`btn btn--view-mode${currentMode === mode ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
              onClick={() => !isDisabled && onChange(mode)}
              disabled={isDisabled}
              title={title}
            >
              {VIEW_MODE_LABELS[mode]}{isDisabled ? ' ⏳' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
