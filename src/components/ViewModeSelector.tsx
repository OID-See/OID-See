import { ViewMode, VIEW_MODE_LABELS, VIEW_MODE_DESCRIPTIONS } from '../types/ViewMode'

type ViewModeSelectorProps = {
  currentMode: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewModeSelector({ currentMode, onChange }: ViewModeSelectorProps) {
  const modes: ViewMode[] = ['graph', 'table', 'tree', 'matrix', 'dashboard']

  return (
    <div className="view-mode-selector">
      <label className="view-mode-selector__label">View:</label>
      <div className="view-mode-selector__buttons">
        {modes.map((mode) => (
          <button
            key={mode}
            className={`btn btn--view-mode${currentMode === mode ? ' active' : ''}`}
            onClick={() => onChange(mode)}
            title={VIEW_MODE_DESCRIPTIONS[mode]}
          >
            {VIEW_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
    </div>
  )
}
