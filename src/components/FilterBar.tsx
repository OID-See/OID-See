
import { useMemo, useState, useRef, useEffect } from 'react'
import { parseQuery, Clause } from '../filters/query'

export type Lens = 'full' | 'risk' | 'structure'
type SavedQuery = { name: string; query: string }

const AUTOCOMPLETE_SUGGESTIONS = {
  targets: ['n.', 'e.'],
  operators: ['=', '!=', '~', '!~', '>=', '<=', '>', '<', '?'],
  commonPaths: {
    node: ['type', 'displayName', 'risk.score', 'risk.level', 'properties.appId', 'properties.scopes', 'id'],
    edge: ['type', 'properties.scopes', 'properties.strength', 'label', 'derived.isDerived'],
  },
  commonValues: ['User', 'Application', 'Group', 'Role', 'offline_access', 'true', 'false'],
}

function getAutocompleteOptions(input: string): string[] {
  if (!input) return ['n.', 'e.']
  
  const lastWord = input.split(/[\s]/g).pop() || ''
  if (!lastWord) return ['n.', 'e.']

  const options: string[] = []
  
  // If starts with prefix but no target yet
  if (lastWord.match(/^[ne]\.$/) && lastWord.length === 2) {
    const isNode = lastWord[0] === 'n'
    const paths = isNode ? AUTOCOMPLETE_SUGGESTIONS.commonPaths.node : AUTOCOMPLETE_SUGGESTIONS.commonPaths.edge
    return paths.map(p => input.slice(0, -0) + p)
  }

  // Suggest operators
  if (lastWord.match(/^[ne]\.[a-z.]+$/i)) {
    return AUTOCOMPLETE_SUGGESTIONS.operators.map(op => input + op)
  }

  // Suggest values
  if (lastWord.match(/[=~]/)) {
    return AUTOCOMPLETE_SUGGESTIONS.commonValues.filter(v => v.toLowerCase().includes(lastWord.toLowerCase()))
      .map(v => input + '"' + v + '"')
  }

  return []
}

function FilterInput({ value, onChange, hasErrors }: { value: string; onChange: (v: string) => void; hasErrors: boolean }) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const opts = getAutocompleteOptions(value)
    setSuggestions(opts.slice(0, 8))
    setSelectedIndex(-1)
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault()
      onChange(suggestions[selectedIndex])
      setSuggestions([])
    } else if (e.key === 'Escape') {
      setSuggestions([])
    }
  }

  const applySuggestion = (suggestion: string) => {
    onChange(suggestion)
    setSuggestions([])
    inputRef.current?.focus()
  }

  return (
    <div style={{ position: 'relative', flex: 1, width: '100%' }}>
      <input
        ref={inputRef}
        className={'filterbar__input' + (hasErrors ? ' filterbar__input--bad' : '')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          const opts = getAutocompleteOptions(value)
          setSuggestions(opts.slice(0, 8))
        }}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        placeholder="Filter… e.g. e.properties.scopes~offline_access n.risk.score>=70"
        spellCheck={false}
      />
      {suggestions.length > 0 && (
        <div className="filterbar__autocomplete">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={'filterbar__suggestion' + (i === selectedIndex ? ' filterbar__suggestion--selected' : '')}
              onClick={() => applySuggestion(s)}
            >
              <span className="mono">{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
  saved,
  onSave,
  onDelete,
  onLoad,
}: {
  query: string
  onChange: (q: string) => void
  counts?: { nodes: number; edges: number; totalNodes: number; totalEdges: number }
  warnings?: string[]
  lens: Lens
  onLens: (l: Lens) => void
  pathAware: boolean
  onPathAware: (v: boolean) => void
  saved: SavedQuery[]
  onSave: () => void
  onDelete: () => void
  onLoad: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const parsed = useMemo(() => parseQuery(query), [query])
  const hasErrors = parsed.errors.length > 0
  const warn = warnings ?? []
  const hasWarn = warn.length > 0

  return (
    <div className="filterbar">
      <div className="filterbar__row">
        <FilterInput value={query} onChange={onChange} hasErrors={hasErrors} />
        <button className="btn btn--ghost" onClick={() => onChange('')} title="Clear filter">
          Clear
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

        <div className="saved">
          <select className="saved__sel" onChange={(e) => onLoad(e.target.value)} value="">
            <option value="" disabled>
              Saved…
            </option>
            {saved.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <button className="btn btn--ghost" onClick={onSave} title="Save current query">
            Save
          </button>
          <button className="btn btn--ghost" onClick={onDelete} title="Delete a saved query">
            Delete
          </button>
        </div>
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
