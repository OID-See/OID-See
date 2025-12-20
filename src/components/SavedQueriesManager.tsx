
import { useMemo, useState } from 'react'
import { Modal } from './Modal'

export type SavedQuery = { name: string; query: string }

export function SavedQueriesManager({
  open,
  onClose,
  saved,
  setSaved,
  currentQuery,
  onLoad,
}: {
  open: boolean
  onClose: () => void
  saved: SavedQuery[]
  setSaved: (next: SavedQuery[]) => void
  currentQuery: string
  onLoad: (q: string) => void
}) {
  const [name, setName] = useState('')
  const sorted = useMemo(() => [...saved].sort((a, b) => a.name.localeCompare(b.name)), [saved])

  function persist(next: SavedQuery[]) {
    setSaved(next)
    try {
      localStorage.setItem('oidsee.savedQueries', JSON.stringify(next))
    } catch {}
  }

  function save() {
    const n = name.trim()
    if (!n) return
    const next = saved.filter((s) => s.name !== n).concat([{ name: n, query: currentQuery }])
    persist(next)
    setName('')
  }

  function del(n: string) {
    const next = saved.filter((s) => s.name !== n)
    persist(next)
  }

  if (!open) return null

  return (
    <Modal title="Saved queries" onClose={onClose}>
      <div className="sq">
        <div className="sq__row">
          <input
            className="sq__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. offline_access)"
            spellCheck={false}
          />
          <button type="button" className="btn" onClick={save}>
            Save current
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="sq__empty">No saved queries yet.</div>
        ) : (
          <div className="sq__list">
            {sorted.map((s) => (
              <div key={s.name} className="sq__item">
                <div className="sq__name">{s.name}</div>
                <div className="sq__query mono">{s.query || <span className="muted">(empty)</span>}</div>
                <div className="sq__actions">
                  <button type="button" className="btn btn--ghost" onClick={() => onLoad(s.query)}>
                    Load
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={() => del(s.name)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="sq__footer">
          <div className="muted">Stored locally in your browser (localStorage).</div>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
