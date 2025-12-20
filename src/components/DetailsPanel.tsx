
import { Selection } from './GraphCanvas'
import { PrettyJson } from './PrettyJson'
import { TitlePill } from './TitlePill'

function kv(obj: any): [string, any][] {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj)
}

export function DetailsPanel({
  selection,
  onPin,
  onFocus,
  onIsolate,
  onClearIsolation,
  onJumpEdge,
  onJumpNode,
}: {
  selection: Selection | null
  onPin?: (id: string) => void
  onFocus?: (id: string) => void
  onIsolate?: (kind: 'node' | 'edge', id: string) => void
  onClearIsolation?: () => void
  onJumpEdge?: (edgeId: string) => void
  onJumpNode?: (nodeId: string) => void
}) {
  if (!selection) {
    return <div className="empty-details muted">Select a node or edge to see details.</div>
  }

  const o = selection.oidsee ?? {}
  const isEdge = selection.kind === 'edge'
  const isNode = selection.kind === 'node'

  const derived = isEdge ? o?.derived : undefined
  const inputs: string[] = Array.isArray(derived?.inputs) ? derived.inputs : []

  return (
    <div className="details">
      <div className="details__head">
        <div className="details__id mono">{selection.id}</div>
        <div className="details__actions">
          {isNode && (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => onFocus?.(selection.id)}>
                Focus
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => onPin?.(selection.id)}>
                Pin
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => onIsolate?.('node', selection.id)}>
                Isolate
              </button>
            </>
          )}
          {isEdge && (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => onIsolate?.('edge', selection.id)}>
                Isolate
              </button>
            </>
          )}
          <button type="button" className="btn btn--ghost" onClick={() => onClearIsolation?.()}>
            Reset view
          </button>
        </div>
      </div>

      {isNode ? (
        <>
          <TitlePill left={o.type ?? 'NODE'} right={o.displayName ?? ''} />
          {o.risk && (
            <div className="details__section">
              <div className="details__sectionTitle">Risk</div>
              <PrettyJson value={o.risk} />
            </div>
          )}
          {o.properties && (
            <div className="details__section">
              <div className="details__sectionTitle">Properties</div>
              <PrettyJson value={o.properties} />
            </div>
          )}
          <div className="details__section">
            <div className="details__sectionTitle">Raw</div>
            <PrettyJson value={o} />
          </div>
        </>
      ) : (
        <>
          <TitlePill left={o.type ?? 'EDGE'} right={o.id ?? selection.id} />
          <div className="details__section">
            <div className="details__sectionTitle">Relationship</div>
            <div className="mono">
              {o.from} → {o.to}
            </div>
          </div>

          {o.properties && (
            <div className="details__section">
              <div className="details__sectionTitle">Properties</div>
              <PrettyJson value={o.properties} />
            </div>
          )}

          {o.derived && (
            <div className="details__section">
              <div className="details__sectionTitle">Derived</div>
              <div className="pill-row">
                <span className="pill">derived</span>
                <span className="mono">{o.derived.algorithm ?? 'unknown'}</span>
              </div>
              {inputs.length > 0 ? (
                <div className="path">
                  <div className="path__title">Inputs</div>
                  <div className="path__list">
                    {inputs.map((id: string) => (
                      <div key={id} className="path__item">
                        <span className="mono">{id}</span>
                        <div className="path__actions">
                          <button type="button" className="btn btn--ghost" onClick={() => onJumpEdge?.(id)}>
                            Jump
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="muted">Tip: enable “Path-aware” filtering to keep these edges visible when filtering.</div>
                </div>
              ) : (
                <div className="muted">No inputs listed on this derived edge.</div>
              )}
            </div>
          )}

          <div className="details__section">
            <div className="details__sectionTitle">Raw</div>
            <PrettyJson value={o} />
          </div>
        </>
      )}
    </div>
  )
}
