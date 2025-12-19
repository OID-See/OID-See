
import { useMemo, useState } from 'react'
import { GraphCanvas, Selection } from './components/GraphCanvas'
import { toVisData, VisData } from './adapters/toVisData'
import sample from './samples/sample-oidsee-graph.json?raw'
import { DetailsPanel } from './components/DetailsPanel'

export default function App() {
  const [raw, setRaw] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<VisData | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)

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
          <button className="btn btn--ghost" onClick={() => { setRaw(sample); render(sample) }}>
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
        <section
          className="panel"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          title="Drop a .json file here"
        >
          <div className="panel__title">Input</div>
          <textarea
            className="json-input"
            value={raw}
            placeholder={placeholder}
            onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
          />
          <div className="hint">
            Drop a JSON file anywhere in this panel, or paste JSON above. Nothing is uploaded to a server.
          </div>

          {error && (
            <div className="error">
              <div className="error__title">Couldn’t render</div>
              <div className="error__msg">{error}</div>
            </div>
          )}
        </section>

        <section className="panel panel--graph">
          <div className="panel__title">Graph</div>
          {data ? (
            <GraphCanvas nodes={data.nodes} edges={data.edges} onSelection={setSelection} />
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
