
import { useMemo, useState } from 'react'
import { parseQuery, Clause } from '../filters/query'

export type Lens = 'full' | 'risk' | 'structure'

function Chip({ c }: { c: Clause }) {
  return (
    <span className="chip" title={c.raw}>
      <span className="chip__t">{c.target === 'both' ? '•' : c.target === 'node' ? 'n' : 'e'}</span>
      <span className="mono">{c.path}</span>
      <span className="chip__op">{c.op}</span>
      {c.op !== 'exists' && <span className="mono">{String(c.value)}</span>}
    </span>
  )
}

export function FilterBar({
  query,
  onChange,
  counts,
  warnings,
  lens,
  onLens,
  pathAware,
  onPathAware,
  onOpenSaved,
}: {
  query: string
  onChange: (q: string) => void
  counts?: { nodes: number; edges: number; totalNodes: number; totalEdges: number }
  warnings?: string[]
  lens: Lens
  onLens: (l: Lens) => void
  pathAware: boolean
  onPathAware: (v: boolean) => void
  onOpenSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const parsed = useMemo(() => parseQuery(query), [query])
  const hasErrors = parsed.errors.length > 0
  const warn = warnings ?? []
  const hasWarn = warn.length > 0

  return (
    <div className="filterbar">
      <div className="filterbar__row">
        <input
          className={'filterbar__input' + (hasErrors ? ' filterbar__input--bad' : '')}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Filter… e.g. e.properties.scopes~offline_access n.risk.score>=70'
          spellCheck={false}
        />
        <button className="btn btn--ghost" onClick={() => onChange('')} title="Clear filter">
          Clear
        </button>
        <button className="btn btn--ghost" onClick={onOpenSaved} title="Saved queries">
          Saved…
        </button>
        <button className="btn btn--ghost" onClick={() => setOpen((v) => !v)} title="Help">
          ?
        </button>
      </div>

      <div className="filterbar__row2">
        <div className="seg" aria-label="Lens">
          <button className={'seg__btn' + (lens === 'full' ? ' seg__btn--on' : '')} onClick={() => onLens('full')}>
            Full
          </button>
          <button className={'seg__btn' + (lens === 'risk' ? ' seg__btn--on' : '')} onClick={() => onLens('risk')}>
            Risk
          </button>
          <button
            className={'seg__btn' + (lens === 'structure' ? ' seg__btn--on' : '')}
            onClick={() => onLens('structure')}
          >
            Structure
          </button>
        </div>

        <label className="toggle" title="Include underlying inputs for derived edges (derived.inputs)">
          <input type="checkbox" checked={pathAware} onChange={(e) => onPathAware(e.target.checked)} />
          <span>Path-aware</span>
        </label>
      </div>

      {parsed.clauses.length > 0 && (
        <div className="chips">
          {parsed.clauses.map((c, i) => (
            <Chip key={i} c={c} />
          ))}
        </div>
      )}

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

      {!hasErrors && hasWarn && (
        <div className="filterbar__warn">
          {warn.slice(0, 6).map((w, i) => (
            <div key={i}>{w}</div>
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
            Lenses: <b>Risk</b> hides structural edges, <b>Structure</b> hides derived/privilege edges. Path-aware keeps the inputs for derived
            edges (via <span className="mono">derived.inputs</span>).
          </div>
        </div>
      )}
    </div>
  )
}
