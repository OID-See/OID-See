
import { useMemo, useState } from 'react'
import { parseQuery } from '../filters/query'

export function FilterBar({
  query,
  onChange,
  counts,
}: {
  query: string
  onChange: (q: string) => void
  counts?: { nodes: number; edges: number; totalNodes: number; totalEdges: number }
}) {
  const [open, setOpen] = useState(false)

  const parsed = useMemo(() => parseQuery(query), [query])
  const hasErrors = parsed.errors.length > 0

  return (
    <div className="filterbar">
      <div className="filterbar__row">
        <input
          className={"filterbar__input" + (hasErrors ? " filterbar__input--bad" : "")}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Filter… e.g. e.properties.scopes~offline_access n.type=User'
          spellCheck={false}
        />
        <button className="btn btn--ghost" onClick={() => onChange('')} title="Clear filter">
          Clear
        </button>
        <button className="btn btn--ghost" onClick={() => setOpen((v) => !v)} title="Help">
          ?
        </button>
      </div>

      {counts && (
        <div className="filterbar__meta">
          showing <span className="mono">{counts.nodes}</span>/<span className="mono">{counts.totalNodes}</span> nodes ·{' '}
          <span className="mono">{counts.edges}</span>/<span className="mono">{counts.totalEdges}</span> edges
        </div>
      )}

      {hasErrors && (
        <div className="filterbar__errors">
          {parsed.errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}

      {open && (
        <div className="filterbar__help">
          <div className="help__title">Property query</div>
          <div className="help__text">
            Clauses are space-separated. Prefix with <span className="mono">n.</span> (node) or <span className="mono">e.</span> (edge).
          </div>
          <ul className="help__list">
            <li>
              Equals: <span className="mono">n.type=User</span> · Not equals: <span className="mono">e.type!=INSTANCE_OF</span>
            </li>
            <li>
              Contains: <span className="mono">e.properties.scopes~offline_access</span> · Not contains: <span className="mono">n.displayName!~test</span>
            </li>
            <li>
              Numeric: <span className="mono">n.risk.score&gt;=70</span>
            </li>
            <li>
              Exists: <span className="mono">n.properties.appId?</span> (or just <span className="mono">n.properties.appId</span>)
            </li>
            <li>
              Quotes: <span className="mono">n.displayName~"Contoso Portal"</span>
            </li>
          </ul>
          <div className="help__text muted">
            Paths are evaluated against the original objects from your JSON export (node/edge), e.g. <span className="mono">properties.scopes</span>.
          </div>
        </div>
      )}
    </div>
  )
}
