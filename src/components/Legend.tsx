/**
 * Props for the Legend component
 * @property {boolean} visible - Controls whether the legend panel is displayed
 * @property {() => void} onClose - Callback function invoked when the legend should be closed
 */
interface LegendProps {
  visible: boolean
  onClose: () => void
}

export function Legend({ visible, onClose }: LegendProps) {
  if (!visible) return null

  return (
    <div className="legend-overlay" onClick={onClose}>
      <div className="legend-panel" onClick={(e) => e.stopPropagation()}>
        <div className="legend-header">
          <h3>Graph Legend</h3>
          <button className="legend-close" onClick={onClose} title="Close">×</button>
        </div>
        
        <div className="legend-content">
          <section className="legend-section">
            <h4>Edge Types</h4>
            <div className="legend-items">
              <div className="legend-item">
                <svg width="60" height="20" className="legend-edge-example">
                  <line x1="0" y1="10" x2="60" y2="10" stroke="rgba(155,92,255,0.70)" strokeWidth="1.5" markerEnd="url(#arrow-normal)" />
                  <defs>
                    <marker id="arrow-normal" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="rgba(155,92,255,0.70)" />
                    </marker>
                  </defs>
                </svg>
                <span className="legend-label">Standard Edge</span>
                <span className="legend-desc">Regular relationships (HAS_SCOPES, HAS_ROLE, etc.)</span>
              </div>
              
              <div className="legend-item">
                <svg width="60" height="20" className="legend-edge-example">
                  <line x1="0" y1="10" x2="60" y2="10" stroke="rgba(255,100,100,0.70)" strokeWidth="2.5" markerEnd="url(#arrow-danger)" />
                  <defs>
                    <marker id="arrow-danger" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="rgba(255,100,100,0.70)" />
                    </marker>
                  </defs>
                </svg>
                <span className="legend-label">High Risk Edge</span>
                <span className="legend-desc">HAS_TOO_MANY_SCOPES - indicates potential over-privileging</span>
              </div>
              
              <div className="legend-item">
                <svg width="60" height="20" className="legend-edge-example">
                  <line x1="0" y1="10" x2="60" y2="10" stroke="rgba(234,242,255,0.35)" strokeWidth="1.5" strokeDasharray="5,5" markerEnd="url(#arrow-instance)" />
                  <defs>
                    <marker id="arrow-instance" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="rgba(234,242,255,0.35)" />
                    </marker>
                  </defs>
                </svg>
                <span className="legend-label">Instance Relationship</span>
                <span className="legend-desc">INSTANCE_OF - ServicePrincipal to Application</span>
              </div>
              
              <div className="legend-item">
                <svg width="60" height="20" className="legend-edge-example">
                  <line x1="0" y1="10" x2="60" y2="10" stroke="rgba(66,232,224,0.90)" strokeWidth="3" strokeDasharray="5,5" markerEnd="url(#arrow-derived)" />
                  <defs>
                    <marker id="arrow-derived" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                      <path d="M0,0 L0,6 L9,3 z" fill="rgba(66,232,224,0.90)" />
                    </marker>
                  </defs>
                </svg>
                <span className="legend-label">Derived Edge (Pulsing)</span>
                <span className="legend-desc">Computed relationships (EFFECTIVE_IMPERSONATION_PATH, etc.)</span>
              </div>
            </div>
          </section>

          <section className="legend-section">
            <h4>Node Types</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-node" style={{ border: '2px solid rgba(66,232,224,0.95)', background: 'rgba(66,232,224,0.18)' }}></div>
                <span className="legend-label">Application / OAuthApp</span>
                <span className="legend-desc">Azure AD Applications and OAuth Apps</span>
              </div>
              
              <div className="legend-item">
                <div className="legend-node" style={{ border: '2px solid rgba(155,92,255,0.95)', background: 'rgba(155,92,255,0.16)' }}></div>
                <span className="legend-label">ServicePrincipal / ResourceApi</span>
                <span className="legend-desc">Service principals and API resources</span>
              </div>
              
              <div className="legend-item">
                <div className="legend-node" style={{ border: '2px solid rgba(234,242,255,0.9)', background: 'rgba(234,242,255,0.10)' }}></div>
                <span className="legend-label">User</span>
                <span className="legend-desc">User accounts</span>
              </div>
              
              <div className="legend-item">
                <div className="legend-node" style={{ border: '2px solid rgba(234,242,255,0.75)', background: 'rgba(234,242,255,0.08)' }}></div>
                <span className="legend-label">Group</span>
                <span className="legend-desc">Security and distribution groups</span>
              </div>
              
              <div className="legend-item">
                <div className="legend-node" style={{ border: '2px solid rgba(255,196,0,0.95)', background: 'rgba(255,196,0,0.12)' }}></div>
                <span className="legend-label">Role</span>
                <span className="legend-desc">Azure AD Roles</span>
              </div>
              
              <div className="legend-item">
                <div className="legend-node" style={{ border: '3px solid rgba(66,232,224,0.95)', background: 'rgba(66,232,224,0.18)' }}></div>
                <span className="legend-label">High Risk Node</span>
                <span className="legend-desc">Node with risk score ≥70 (thicker border)</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
