
import { useMemo, useState } from 'react'
import { GraphCanvas, Selection } from './components/GraphCanvas'
import { toVisData, VisData } from './adapters/toVisData'
import sample from './samples/sample-oidsee-graph.json?raw'
import { DetailsPanel } from './components/DetailsPanel'
import { FilterBar } from './components/FilterBar'
import { parseQuery, evalClause } from './filters/query'

function applyQuery(data: VisData, query: string) {
  const parsed = parseQuery(query)
  const clauses = parsed.clauses

  const nodeClauses = clauses.filter((c) => c.target === 'node' || c.target === 'both')
  const edgeClauses = clauses.filter((c) => c.target === 'edge' || c.target === 'both')

  const nodePass = new Set<string>()
  for (const n of data.nodes) {
    const raw = n.__oidsee ?? n
    const ok = nodeClauses.every((c) => evalClause(raw, c))
    if (ok) nodePass.add(n.id)
  }

  const edgesOut: any[] = []
  for (const e of data.edges) {
    const raw = e.__oidsee ?? e
    const ok = edgeClauses.every((c) => evalClause(raw, c))
    if (!ok) continue
    edgesOut.push(e)
    // always keep endpoints for matched edges (keeps relationships readable)
    nodePass.add(e.from)
    nodePass.add(e.to)
  }

  const nodesOut = data.nodes.filter((n) => nodePass.has(n.id))
  const nodeSet = new Set(nodesOut.map((n) => n.id))
  const edgesFinal = edgesOut.filter((e) => nodeSet.has(e.from) && nodeSet.has(e.to))

  return { nodes: nodesOut, edges: edgesFinal, parsed }
}

export default function App() {
  const [raw, setRaw] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<VisData | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [query, setQuery] = useState<string>('')

  const placeholder = useMemo(() => {
    return `Paste an OID-See export (oidsee-graph v1.x) here…\n\nTip: Click “Load sample” to see the expected shape.`
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
    if (!query.trim()) return { nodes: data.nodes, edges: data.edges, parsed: parseQuery('') }
    return applyQuery(data, query)
  }, [data, query])

  const counts = useMemo(() => {
    if (!data || !filtered) return undefined
    return {
      nodes: filtered.nodes.length,
      edges: filtered.edges.length,
      totalNodes: data.nodes.length,
      totalEdges: data.edges.length,
    }
  }, [data, filtered])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">◁</div>
          <div className="brand__text">
            <div className="brand__name">OID-See</div>
            <div className="brand__tag">Render OIDC/OAuth graphs from JSON — in your browser</div>
          </div>
        </div>

        <div className="topbar__actions">
          <button
            className="btn btn--ghost"
            onClick={() => {
              setRaw(sample)
              render(sample)
            }}
          >
            Load sample
          </button>
          <button className="btn" onClick={() => render(raw)}>
            Render
          </button>

          <label className="btn btn--ghost file">
            <input
              type="file"
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

      <main className="main">
        <section className="panel" onDragOver={(e) => e.preventDefault()} onDrop={onDrop} title="Drop a .json file here">
          <div className="panel__title">Input</div>
          <textarea
            className="json-input"
            value={raw}
            placeholder={placeholder}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
          />
          <div className="hint">Drop a JSON file anywhere in this panel, or paste JSON above. Nothing is uploaded to a server.</div>

          {error && (
            <div className="error">
              <div className="error__title">Couldn’t render</div>
              <div className="error__msg">{error}</div>
            </div>
          )}
        </section>

        <section className="panel panel--graph">
          <div className="panel__title">Graph</div>
          <FilterBar query={query} onChange={setQuery} counts={counts} />
          {filtered ? (
            <GraphCanvas nodes={filtered.nodes} edges={filtered.edges} onSelection={setSelection} />
          ) : (
            <div className="empty">
              <div className="empty__title">No graph yet</div>
              <div className="empty__msg">Paste or upload an OID-See export JSON and click Render.</div>
            </div>
          )}
        </section>

        <section className="panel panel--details">
          <div className="panel__title">Details</div>
          <DetailsPanel selection={selection} />
        </section>
      </main>

      <footer className="footer">
        <span>OID-See processes files locally. No data leaves your browser.</span>
      </footer>
    </div>
  )
}
