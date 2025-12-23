
import { useState } from 'react'

export interface PhysicsConfig {
  gravitationalConstant: number
  springLength: number
  springConstant: number
  avoidOverlap: number
}

interface PhysicsControlsProps {
  config: PhysicsConfig
  onChange: (config: PhysicsConfig) => void
  onReset: () => void
}

export function PhysicsControls({ config, onChange, onReset }: PhysicsControlsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleChange = (key: keyof PhysicsConfig, value: number) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="physics-controls">
      <button 
        className="btn btn--ghost btn--sm" 
        onClick={() => setIsOpen(!isOpen)}
        title="Adjust node spacing"
      >
        ⚙️ Spacing
      </button>
      
      {isOpen && (
        <div className="physics-controls__panel">
          <div className="physics-controls__header">
            <span className="physics-controls__title">Node Spacing Controls</span>
            <button 
              className="btn btn--ghost btn--sm" 
              onClick={onReset}
              title="Reset to defaults"
            >
              Reset
            </button>
          </div>
          
          <div className="physics-controls__item">
            <label className="physics-controls__label">
              <span className="physics-controls__label-text">Repulsion Force</span>
              <span className="physics-controls__label-value">{Math.abs(config.gravitationalConstant)}</span>
            </label>
            <input 
              type="range" 
              min="10000" 
              max="80000" 
              step="5000"
              value={Math.abs(config.gravitationalConstant)}
              onChange={(e) => handleChange('gravitationalConstant', -Number(e.target.value))}
              className="physics-controls__slider"
            />
            <div className="physics-controls__hint">Higher = more distance between nodes</div>
          </div>

          <div className="physics-controls__item">
            <label className="physics-controls__label">
              <span className="physics-controls__label-text">Connection Length</span>
              <span className="physics-controls__label-value">{config.springLength}</span>
            </label>
            <input 
              type="range" 
              min="100" 
              max="800" 
              step="50"
              value={config.springLength}
              onChange={(e) => handleChange('springLength', Number(e.target.value))}
              className="physics-controls__slider"
            />
            <div className="physics-controls__hint">Length of connections between nodes</div>
          </div>

          <div className="physics-controls__item">
            <label className="physics-controls__label">
              <span className="physics-controls__label-text">Connection Stiffness</span>
              <span className="physics-controls__label-value">{config.springConstant.toFixed(3)}</span>
            </label>
            <input 
              type="range" 
              min="0.005" 
              max="0.1" 
              step="0.005"
              value={config.springConstant}
              onChange={(e) => handleChange('springConstant', Number(e.target.value))}
              className="physics-controls__slider"
            />
            <div className="physics-controls__hint">Lower = more flexible connections</div>
          </div>

          <div className="physics-controls__item">
            <label className="physics-controls__label">
              <span className="physics-controls__label-text">Overlap Prevention</span>
              <span className="physics-controls__label-value">{config.avoidOverlap.toFixed(2)}</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05"
              value={config.avoidOverlap}
              onChange={(e) => handleChange('avoidOverlap', Number(e.target.value))}
              className="physics-controls__slider"
            />
            <div className="physics-controls__hint">Higher = nodes avoid overlapping more</div>
          </div>
        </div>
      )}
    </div>
  )
}
