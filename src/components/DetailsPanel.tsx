
import type { Selection } from './GraphCanvas'

function entries(obj: Record<string, any>) {
  return Object.entries(obj ?? {})
}

function formatValue(v: any): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    // For arrays, show as JSON
    return JSON.stringify(v, null, 2)
  }
  if (typeof v === 'object') {
    // For objects, show as formatted JSON
    return JSON.stringify(v, null, 2)
  }
  return String(v)
}

function Badge({ children }: { children: any }) {
  return <span className="badge">{children}</span>
}

function Risk({ risk }: { risk?: any }) {
  if (!risk) return null
  const level = risk.level ?? 'unknown'
  const score = typeof risk.score === 'number' ? risk.score : undefined
  return (
    <div className="block">
      <div className="block__title">Risk</div>
      <div className="row">
        <Badge>{level}</Badge>
        {score !== undefined && <span className="muted">score {score}</span>}
      </div>
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
          <div className="row mono">
            {o.from} → {o.to}
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

      <Risk risk={o.risk} />

      {o.properties && typeof o.properties === 'object' && (
        <div className="block">
          <div className="block__title">Properties</div>
          <table className="table">
            <tbody>
              {entries(o.properties).slice(0, 50).map(([k, v]) => (
                <tr key={k}>
                  <td className="muted">{k}</td>
                  <td className="mono" style={{ whiteSpace: 'pre-wrap' }}>{formatValue(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
              inputs: <span className="mono">{o.derived.inputs.slice(0, 12).join(', ')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
