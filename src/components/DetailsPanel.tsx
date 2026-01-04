import { useState, useEffect } from 'react'
import type { Selection } from './GraphCanvas'

function entries(obj: Record<string, any>) {
  return Object.entries(obj ?? {})
}

function formatValue(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'object') {
    // For objects and arrays, show as formatted JSON
    try {
      return JSON.stringify(v, null, 2)
    } catch (error) {
      // Fallback for circular references or non-serializable values
      return String(v)
    }
  }
  return String(v)
}

function Badge({ children }: { children: any }) {
  return <span className="badge">{children}</span>
}

function ClickableLink({ 
  id, 
  kind, 
  onFocus,
  children 
}: { 
  id: string
  kind: 'node' | 'edge'
  onFocus?: (selection: Selection) => void
  children?: React.ReactNode
}) {
  if (!onFocus) {
    return <span className="mono">{children ?? id}</span>
  }
  
  return (
    <button
      type="button"
      className="clickable-link mono"
      onClick={() => {
        onFocus({ kind, id, oidsee: undefined })
      }}
    >
      {children ?? id}
    </button>
  )
}

function Risk({ risk }: { risk?: any }) {
  if (!risk) return null
  const level = risk.level ?? 'unknown'
  const score = typeof risk.score === 'number' ? risk.score : undefined
  
  // Find PRIVILEGE reason for tier breakdown
  const privilegeReason = Array.isArray(risk.reasons) 
    ? risk.reasons.find((r: any) => r.code === 'PRIVILEGE')
    : null
  
  const hasTierBreakdown = privilegeReason && (
    privilegeReason.rolesReachableTier0 > 0 ||
    privilegeReason.rolesReachableTier1 > 0 ||
    privilegeReason.rolesReachableTier2 > 0
  )
  
  return (
    <div className="block">
      <div className="block__title">Risk</div>
      <div className="row">
        <Badge>{level}</Badge>
        {score !== undefined && <span className="muted">score {score}</span>}
      </div>
      
      {/* Tier breakdown if present */}
      {hasTierBreakdown && (
        <div style={{ marginTop: '.8rem', marginBottom: '.8rem' }}>
          <div style={{ fontSize: '.9rem', fontWeight: 'bold', marginBottom: '.4rem' }}>
            Reachable Role Tiers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
            {privilegeReason.rolesReachableTier0 > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.3rem .5rem', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '4px' }}>
                <span>🔴 Tier 0 (Global Control)</span>
                <span className="mono">{privilegeReason.rolesReachableTier0}</span>
              </div>
            )}
            {privilegeReason.rolesReachableTier1 > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.3rem .5rem', background: 'rgba(255, 149, 0, 0.1)', borderRadius: '4px' }}>
                <span>🟠 Tier 1 (Critical Services)</span>
                <span className="mono">{privilegeReason.rolesReachableTier1}</span>
              </div>
            )}
            {privilegeReason.rolesReachableTier2 > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.3rem .5rem', background: 'rgba(255, 204, 0, 0.1)', borderRadius: '4px' }}>
                <span>🟡 Tier 2 (Scoped/Operational)</span>
                <span className="mono">{privilegeReason.rolesReachableTier2}</span>
              </div>
            )}
          </div>
          
          {/* Show top tier 0 roles if available */}
          {privilegeReason.tierBreakdown && Array.isArray(privilegeReason.tierBreakdown) && (
            <div style={{ marginTop: '.6rem' }}>
              {privilegeReason.tierBreakdown
                .filter((t: any) => t.tier === 'tier0' && t.roles && t.roles.length > 0)
                .map((t: any) => (
                  <div key={t.tier} style={{ marginTop: '.4rem' }}>
                    <div style={{ fontSize: '.85rem', fontWeight: 'bold', marginBottom: '.2rem' }}>
                      Top Tier 0 Roles:
                    </div>
                    <ul className="list" style={{ fontSize: '.85rem' }}>
                      {t.roles.slice(0, 5).map((role: any, idx: number) => (
                        <li key={idx}>{role.displayName}</li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
      
      {Array.isArray(risk.reasons) && risk.reasons.length > 0 && (
        <ul className="list">
          {risk.reasons.slice(0, 12).map((r: any, idx: number) => (
            <li key={idx}>
              <span className="mono">{r.code}</span> — {r.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function DetailsPanel({ 
  selection,
  onFocus,
}: { 
  selection: Selection | null
  onFocus?: (selection: Selection) => void
}) {
  const [showAllProperties, setShowAllProperties] = useState(false)
  
  // Reset show-more state when selection changes
  useEffect(() => {
    setShowAllProperties(false)
  }, [selection?.id])
  
  if (!selection) {
    return (
      <div className="details-empty">
        <div className="details-empty__title">Nothing selected</div>
        <div className="details-empty__msg">Tap a node or edge to see its properties, risk, and evidence.</div>
      </div>
    )
  }

  const o = selection.oidsee ?? {}
  const isNode = selection.kind === 'node'
  const isInstanceOfEdge = !isNode && o.type === 'INSTANCE_OF'
  
  // Always show properties for selected nodes and edges
  const hasProperties = o.properties && typeof o.properties === 'object'
  const propertyEntries = hasProperties ? entries(o.properties) : []
  const INITIAL_PROPERTY_LIMIT = 5
  const hasMoreProperties = propertyEntries.length > INITIAL_PROPERTY_LIMIT

  return (
    <div className="details">
      <div className="details__header">
        <div className="details__name">{o.displayName ?? o.id ?? selection.id}</div>
        <div className="details__sub">
          <Badge>{isNode ? o.type ?? 'Node' : o.type ?? 'Edge'}</Badge>
          <span className="mono muted">{selection.id}</span>
        </div>
        {onFocus && (
          <button 
            className="btn btn--ghost" 
            onClick={() => onFocus(selection)}
            style={{ marginTop: '.5rem' }}
          >
            Focus
          </button>
        )}
      </div>

      {!isNode && (
        <div className="block">
          <div className="block__title">Relationship</div>
          <div className="row">
            <ClickableLink id={o.from} kind="node" onFocus={onFocus} /> 
            <span className="mono"> → </span>
            <ClickableLink id={o.to} kind="node" onFocus={onFocus} />
          </div>
        </div>
      )}

      {Array.isArray(o.labels) && o.labels.length > 0 && (
        <div className="block">
          <div className="block__title">Labels</div>
          <div className="row wrap">
            {o.labels.slice(0, 24).map((l: string) => (
              <Badge key={l}>{l}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Risk details displayed first (priority) */}
      <Risk risk={o.risk} />

      {/* Properties section with show-more mechanism */}
      {hasProperties && (
        <div className="block">
          <div className="block__title">
            {isInstanceOfEdge ? 'Instance Properties' : 'Properties'}
          </div>
          <table className="table">
            <tbody>
              {(showAllProperties ? propertyEntries : propertyEntries.slice(0, INITIAL_PROPERTY_LIMIT)).map(([k, v]) => (
                <tr key={k}>
                  <td className="muted">{k}</td>
                  <td className="mono" style={{ whiteSpace: 'pre-wrap' }}>{formatValue(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMoreProperties && (
            <button 
              type="button"
              className="clickable-link"
              onClick={() => setShowAllProperties(!showAllProperties)}
              style={{ marginTop: '.5rem', fontSize: '.9rem' }}
            >
              {showAllProperties ? 'Show less' : 'Click Here for more details'}
            </button>
          )}
        </div>
      )}

      {Array.isArray(o.evidence) && o.evidence.length > 0 && (
        <div className="block">
          <div className="block__title">Evidence</div>
          <ul className="list">
            {o.evidence.slice(0, 12).map((e: any, idx: number) => (
              <li key={idx} className="mono">
                {e.source}:{e.kind}{e.id ? `:${e.id}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {o.derived?.isDerived && (
        <div className="block">
          <div className="block__title">Derived</div>
          <div className="row">
            <Badge>derived</Badge>
            <span className="mono muted">{o.derived.algorithm ?? 'unknown'}</span>
          </div>
          {Array.isArray(o.derived.inputs) && o.derived.inputs.length > 0 && (
            <div className="muted" style={{ marginTop: '.4rem' }}>
              inputs: {o.derived.inputs.slice(0, 12).map((inputId: string, idx: number) => (
                <span key={inputId}>
                  {idx > 0 && <span className="mono">, </span>}
                  <ClickableLink id={inputId} kind="edge" onFocus={onFocus} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
