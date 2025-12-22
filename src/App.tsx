import { useEffect, useMemo, useState, useRef } from 'react'
import { GraphCanvas, Selection, GraphCanvasHandle } from './components/GraphCanvas'
import { toVisData, VisData } from './adapters/toVisData'
import sampleObj from './samples/sample-oidsee-graph.json'
import { DetailsPanel } from './components/DetailsPanel'
import { FilterBar, Lens } from './components/FilterBar'
import { parseQuery, evalClause, getPath, isNumericOp, Clause } from './filters/query'
import { JSONEditor } from './components/JSONEditor'

type SavedQuery = { name: string; query: string }

// Emoji regex for cross-browser compatibility validation
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F004}\u{1F0CF}\u{1F170}-\u{1F251}]/u

const PRESET_QUERIES: SavedQuery[] = [
  { name: '🔴 High Risk Apps', query: 'n.risk.score>=70' },
  { name: '🔐 Offline Access', query: 'e.type=HAS_OFFLINE_ACCESS' },
  { name: '⚡ Can Impersonate', query: 'e.type=CAN_IMPERSONATE' },
  { name: '📊 Too Many Scopes', query: 'e.type=HAS_TOO_MANY_SCOPES' },
  { name: '🛡️ Privileged Scopes', query: 'e.type=HAS_PRIVILEGED_SCOPES' },
  { name: '🔄 Persistence Paths', query: 'e.type=PERSISTENCE_PATH' },
  { name: '👤 Users Only', query: 'n.type=User' },
  { name: '🔑 Applications', query: 'n.type=Application' },
]

function loadSaved(): SavedQuery[] {
  try {
    const raw = localStorage.getItem('oidsee.savedQueries')
    let arr: SavedQuery[] = []
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        arr = parsed.filter((x) => x && typeof x.name === 'string' && typeof x.query === 'string')
      }
    }
    
    if (arr.length === 0) {
      arr = PRESET_QUERIES
      saveSaved(arr)
    }
    
    return arr
  } catch {
    return PRESET_QUERIES
  }
}
function saveSaved(arr: SavedQuery[]) {
  try {
    localStorage.setItem('oidsee.savedQueries', JSON.stringify(arr))
  } catch {
    // ignore
  }
}

function lensEdgeAllowed(lens: Lens, edgeType: string): boolean {
  if (lens === 'full') return true

  if (lens === 'risk') {
    const allow = new Set([
      'HAS_SCOPE',
      'HAS_ROLE',
      'CAN_IMPERSONATE',
      'EFFECTIVE_IMPERSONATION_PATH',
      'PERSISTENCE_PATH',
      'ASSIGNED_TO',
    ])
    return allow.has(edgeType)
  }

  const allow = new Set(['INSTANCE_OF', 'MEMBER_OF', 'OWNS', 'GOVERNS', 'ASSIGNED_TO'])
  return allow.has(edgeType)
}

function computeWarnings(data: VisData, clauses: Clause[]): string[] {
  const warns: string[] = []
  const nodeObjs = data.nodes.map((n) => n.__oidsee ?? n)
  const edgeObjs = data.edges.map((e) => e.__oidsee ?? e)

  for (const c of clauses) {
    const pool = c.target === 'node' ? nodeObjs : c.target === 'edge' ? edgeObjs : nodeObjs.concat(edgeObjs)

    const anyHas = pool.some((o) => getPath(o, c.path) !== undefined)
    if (!anyHas) {
      warns.push(`No matches for path "${c.path}" (${c.target}). Possible typo or field not present in this export.`)
      continue
    }

    if (isNumericOp(c.op)) {
      const samples = pool
        .map((o) => getPath(o, c.path))
        .filter((v) => v !== undefined && v !== null)
        .slice(0, 25)
      const nonNum = samples.some((v) => typeof v !== 'number' && Number.isNaN(Number(v)))
      if (nonNum) {
        warns.push(`Numeric operator used on non-numeric values at "${c.path}". This clause may filter out everything.`)
      }
    }
  }

  return warns
}

function applyQuery(data: VisData, query: string, lens: Lens, pathAware: boolean) {
  const parsed = parseQuery(query)
  const clauses = parsed.clauses

  const nodeClauses = clauses.filter((c) => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter((c) => c.target === 'edge' || c.target === 'both')

  // Step 1: Determine which nodes pass the node filter
  const nodePass = new Set<string>()
  if (nodeClauses.length > 0) {
    // If there are node filters, only include nodes that match
    for (const n of data.nodes) {
      const raw = n.__oidsee ?? n
      const ok = nodeClauses.every((c) => evalClause(raw, c))
      if (ok) nodePass.add(n.id)
    }
  } else {
    // If no node filters, include all nodes initially
    for (const n of data.nodes) {
      nodePass.add(n.id)
    }
  }

  const edgeById = new Map<string, any>()
  for (const e of data.edges) edgeById.set(e.id, e)

  // Step 2: Filter edges based on edge clauses, lens, and whether endpoints are in nodePass
  const edgesOut: any[] = []
  const edgesKept = new Set<string>()

  for (const e of data.edges) {
    const raw = e.__oidsee ?? e
    const edgeType = raw.type ?? e.label ?? ''
    
    // Check lens filtering
    if (!lensEdgeAllowed(lens, edgeType)) continue

    // Check edge clauses
    const ok = edgeClauses.every((c) => evalClause(raw, c))
    if (!ok) continue

    // Check if both endpoints are in the filtered node set
    if (!nodePass.has(e.from) || !nodePass.has(e.to)) continue

    if (!edgesKept.has(e.id)) {
      edgesOut.push(e)
      edgesKept.add(e.id)
    }

    // Handle path-aware mode: include input edges for derived edges
    if (pathAware && raw?.derived?.isDerived && Array.isArray(raw.derived.inputs)) {
      for (const id of raw.derived.inputs) {
        const inp = edgeById.get(id)
        if (inp && !edgesKept.has(inp.id)) {
          // Only include input edge if both its endpoints are in nodePass
          if (nodePass.has(inp.from) && nodePass.has(inp.to)) {
            edgesOut.push(inp)
            edgesKept.add(inp.id)
          }
        }
      }
    }
  }

  // Step 3: Determine final nodes and edges
  const nodesWithEdges = new Set<string>()
  for (const e of edgesOut) {
    nodesWithEdges.add(e.from)
    nodesWithEdges.add(e.to)
  }

  // If there are explicit node filters, show all nodes that match (even if isolated)
  // Otherwise, only show nodes that have edges
  const nodesOut = data.nodes.filter((n) => {
    if (!nodePass.has(n.id)) return false
    if (nodeClauses.length > 0) return true  // Show all filtered nodes
    return nodesWithEdges.has(n.id)  // Only show nodes with edges if no node filter
  })
  
  const edgesFinal = edgesOut

  return { nodes: nodesOut, edges: edgesFinal, parsed }
}

export default function App() {
  const [raw, setRaw] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<VisData | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [query, setQuery] = useState<string>('')
  const [lens, setLens] = useState<Lens>('full')
  const [pathAware, setPathAware] = useState<boolean>(true)
  const [saved, setSaved] = useState<SavedQuery[]>([])
  const [inputCollapsed, setInputCollapsed] = useState<boolean>(false)
  const [filterCollapsed, setFilterCollapsed] = useState<boolean>(false)
  const [detailsCollapsed, setDetailsCollapsed] = useState<boolean>(false)
  const graphRef = useRef<GraphCanvasHandle>(null)

  useEffect(() => {
    setSaved(loadSaved())
  }, [])

  const placeholder = useMemo(() => {
    return `Paste an OID-See export (oidsee-graph v1.x) here…\n\nTip: Click "Load sample" to see the expected shape.`
  }, [])

  async function readFile(file: File) {
    const text = await file.text()
    setRaw(text)
    render(text)
  }

  function render(input: string) {
    try {
      setError(null)
      setSelection(null)
      const parsed = JSON.parse(input)
      const vis = toVisData(parsed)
      setData(vis)
    } catch (e: any) {
      setData(null)
      setSelection(null)
      setError(e?.message ?? String(e))
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) void readFile(file)
  }

  const filtered = useMemo(() => {
    if (!data) return null
    return applyQuery(data, query.trim(), lens, pathAware)
  }, [data, query, lens, pathAware])

  const counts = useMemo(() => {
    if (!data || !filtered) return undefined
    return {
      nodes: filtered.nodes.length,
      edges: filtered.edges.length,
      totalNodes: data.nodes.length,
      totalEdges: data.edges.length,
    }
  }, [data, filtered])

  const warnings = useMemo(() => {
    if (!data) return []
    const p = parseQuery(query)
    if (p.errors.length) return []
    return computeWarnings(data, p.clauses)
  }, [data, query])

  function saveCurrentQuery() {
    const name = prompt('Save query as…')
    if (!name) return
    
    // Check for emojis
    if (EMOJI_REGEX.test(name)) {
      alert('Emojis are not supported in query names for cross-browser compatibility. Please use text only.')
      return
    }
    
    const next = saved.filter((s) => s.name !== name).concat([{ name, query }])
    setSaved(next)
    saveSaved(next)
  }

  function deleteSavedQuery() {
    if (!saved.length) return
    const name = prompt('Delete which saved query? Enter exact name:\n' + saved.map((s) => `- ${s.name}`).join('\n'))
    if (!name) return
    const next = saved.filter((s) => s.name !== name)
    setSaved(next)
    saveSaved(next)
  }

  function loadSavedQuery(name: string) {
    const found = saved.find((s) => s.name === name)
    if (found) setQuery(found.query)
  }

  function formatJSON() {
    try {
      const parsed = JSON.parse(raw)
      const pretty = JSON.stringify(parsed, null, 2)
      setRaw(pretty)
      setError(null)
    } catch (e: any) {
      setError(`Format failed: ${e?.message ?? String(e)}`)
    }
  }

  function handleFocus(sel: Selection) {
    if (sel.kind === 'node') {
      graphRef.current?.focusNode(sel.id)
    } else if (sel.kind === 'edge') {
      graphRef.current?.focusEdge(sel.id)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand__logo" src="/icons/oidsee_logo.png" alt="OID-See" />
          <div className="brand__text">
            <div className="brand__name">OID-See Viewer</div>
            <div className="brand__tag">Render OIDC/OAuth graphs from JSON</div>
          </div>
        </div>

        <div className="topbar__actions">
          <button
            className="btn file"
            onClick={() => {
              const pretty = JSON.stringify(sampleObj, null, 2)
              setRaw(pretty)
              render(pretty)
            }}
          >
            Load sample
          </button>
          <button className="btn file" onClick={() => render(raw)}>
            Render
          </button>

          <label className="btn file">
            <input
              type="file"
              hidden
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void readFile(file)
              }}
            />
            Upload JSON
          </label>
        </div>
      </header>

      <section className={`panel--filter${filterCollapsed ? ' collapsed' : ''}`}>
        <div className="panel__header-content" style={{ marginBottom: filterCollapsed ? '0' : '.5rem' }}>
          <span style={{ fontWeight: 700, color: 'rgba(234,242,255,0.82)' }}>Filters</span>
          <button 
            className="btn btn--ghost" 
            onClick={() => setFilterCollapsed(!filterCollapsed)}
            style={{ padding: '.25rem .5rem', fontSize: '.85rem' }}
          >
            {filterCollapsed ? '▼' : '▲'}
          </button>
        </div>
        {!filterCollapsed && (
          <FilterBar
            query={query}
            onChange={setQuery}
            counts={counts}
            warnings={warnings}
            lens={lens}
            onLens={setLens}
            pathAware={pathAware}
            onPathAware={setPathAware}
            saved={saved}
            onSave={saveCurrentQuery}
            onDelete={deleteSavedQuery}
            onLoad={loadSavedQuery}
          />
        )}
      </section>

      <main className="main">
        <section className={`panel${inputCollapsed ? ' collapsed-horizontal' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop} title="Drop a .json file here">
          <div className="panel__title">
            <div className="panel__header-content">
              <span>Input</span>
              <div className="panel__header-actions">
                {!inputCollapsed && (
                  <button className="btn btn--ghost" onClick={formatJSON} style={{ padding: '.35rem .55rem', fontSize: '.85rem' }}>
                    Format
                  </button>
                )}
                <button 
                  className="panel__collapse-btn" 
                  onClick={() => setInputCollapsed(!inputCollapsed)}
                  title={inputCollapsed ? 'Expand' : 'Collapse'}
                >
                  {inputCollapsed ? '▶' : '◀'}
                </button>
              </div>
            </div>
          </div>
          {!inputCollapsed && (
            <>
              <JSONEditor
                value={raw}
                onChange={setRaw}
                placeholder={placeholder}
              />
              <div className="hint">Drop a JSON file anywhere in this panel, or paste JSON above. Nothing is uploaded to a server.</div>

              {error && (
                <div className="error">
                  <div className="error__title">Couldn't render</div>
                  <div className="error__msg">{error}</div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="panel panel--graph">
          <div className="panel__title">Graph</div>
          {data && filtered ? (
            <GraphCanvas 
              ref={graphRef} 
              allNodes={data.nodes} 
              allEdges={data.edges}
              visibleNodes={filtered.nodes} 
              visibleEdges={filtered.edges} 
              onSelection={setSelection} 
            />
          ) : (
            <div className="empty">
              <div className="empty__title">No graph yet</div>
              <div className="empty__msg">Paste or upload an OID-See export JSON and click Render.</div>
            </div>
          )}
        </section>

        <section className={`panel panel--details${detailsCollapsed ? ' collapsed-horizontal' : ''}`}>
          <div className="panel__title">
            <span>Details</span>
            <button 
              className="panel__collapse-btn" 
              onClick={() => setDetailsCollapsed(!detailsCollapsed)}
              title={detailsCollapsed ? 'Expand' : 'Collapse'}
            >
              {detailsCollapsed ? '◀' : '▶'}
            </button>
          </div>
          {!detailsCollapsed && <DetailsPanel selection={selection} onFocus={handleFocus} />}
        </section>
      </main>

      <footer className="footer">
        <span>OID-See processes files locally. No data leaves your browser.</span>
      </footer>
    </div>
  )
}
