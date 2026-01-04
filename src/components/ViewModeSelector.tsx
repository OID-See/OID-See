import { ViewMode, VIEW_MODE_LABELS, VIEW_MODE_DESCRIPTIONS } from '../types/ViewMode'

type ViewModeSelectorProps = {
  currentMode: ViewMode
  onChange: (mode: ViewMode) => void
  viewsReady?: Set<ViewMode>
}

export function ViewModeSelector({ currentMode, onChange, viewsReady = new Set() }: ViewModeSelectorProps) {
  const modes: ViewMode[] = ['dashboard', 'table', 'tree', 'matrix', 'graph']

  return (
    <div className="view-mode-selector">
      <label className="view-mode-selector__label">View:</label>
      <div className="view-mode-selector__buttons">
        {modes.map((mode) => {
          const isReady = viewsReady.has(mode) || viewsReady.size === 0
          const isDisabled = !isReady
          return (
            <button
              key={mode}
              className={`btn btn--view-mode${currentMode === mode ? ' active' : ''}${isDisabled ? ' disabled' : ''}`}
              onClick={() => isReady && onChange(mode)}
              disabled={isDisabled}
              title={isDisabled ? 'Loading...' : VIEW_MODE_DESCRIPTIONS[mode]}
            >
              {VIEW_MODE_LABELS[mode]}{isDisabled ? ' ⏳' : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
