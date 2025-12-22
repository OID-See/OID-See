import { useState, useCallback, useMemo } from 'react'
import Editor from 'react-simple-code-editor'
import highlight from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import 'highlight.js/styles/atom-one-dark.css'

highlight.registerLanguage('json', json)

interface JSONEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type JSONValue = string | number | boolean | null | JSONObject | JSONArray
interface JSONObject {
  [key: string]: JSONValue
}
type JSONArray = JSONValue[]

export function JSONEditor({ value, onChange, placeholder }: JSONEditorProps) {
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit')
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())

  const highlightCode = useCallback((code: string) => {
    try {
      return highlight.highlight(code, { language: 'json', ignoreIllegals: true }).value
    } catch {
      return code
    }
  }, [])

  const parsedJSON = useMemo(() => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }, [value])

  const togglePath = (path: string) => {
    setCollapsedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const collapseAll = () => {
    if (!parsedJSON) return
    const allPaths = new Set<string>()
    
    const findAllPaths = (obj: any, path: string = '') => {
      if (obj && typeof obj === 'object') {
        allPaths.add(path || 'root')
        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => {
            findAllPaths(item, `${path}[${idx}]`)
          })
        } else {
          Object.keys(obj).forEach(key => {
            findAllPaths(obj[key], path ? `${path}.${key}` : key)
          })
        }
      }
    }
    
    findAllPaths(parsedJSON)
    setCollapsedPaths(allPaths)
  }

  const expandAll = () => {
    setCollapsedPaths(new Set())
  }

  const renderJSONValue = (val: JSONValue, path: string = '', indent: number = 0): JSX.Element => {
    const indentStr = '  '.repeat(indent)
    const isCollapsed = collapsedPaths.has(path)

    if (val === null) {
      return <span className="json-null">null</span>
    }

    if (typeof val === 'boolean') {
      return <span className="json-boolean">{String(val)}</span>
    }

    if (typeof val === 'number') {
      return <span className="json-number">{val}</span>
    }

    if (typeof val === 'string') {
      return <span className="json-string">"{val}"</span>
    }

    if (Array.isArray(val)) {
      if (val.length === 0) {
        return <span className="json-punctuation">[]</span>
      }

      return (
        <span className="json-array">
          <span 
            className="json-fold-indicator" 
            onClick={() => togglePath(path)}
          >
            {isCollapsed ? '▶' : '▼'}
          </span>
          <span className="json-punctuation">[</span>
          {isCollapsed ? (
            <span className="json-collapsed">...</span>
          ) : (
            <>
              {val.map((item, idx) => (
                <div key={idx} className="json-line" style={{ paddingLeft: `${(indent + 1) * 1.2}em` }}>
                  {renderJSONValue(item, `${path}[${idx}]`, indent + 1)}
                  {idx < val.length - 1 && <span className="json-punctuation">,</span>}
                </div>
              ))}
              <div style={{ paddingLeft: `${indent * 1.2}em` }}>
                <span className="json-punctuation">]</span>
              </div>
            </>
          )}
        </span>
      )
    }

    if (typeof val === 'object') {
      const keys = Object.keys(val)
      if (keys.length === 0) {
        return <span className="json-punctuation">{'{}'}</span>
      }

      return (
        <span className="json-object">
          <span 
            className="json-fold-indicator" 
            onClick={() => togglePath(path)}
          >
            {isCollapsed ? '▶' : '▼'}
          </span>
          <span className="json-punctuation">{'{'}</span>
          {isCollapsed ? (
            <span className="json-collapsed">...</span>
          ) : (
            <>
              {keys.map((key, idx) => (
                <div key={key} className="json-line" style={{ paddingLeft: `${(indent + 1) * 1.2}em` }}>
                  <span className="json-key">"{key}"</span>
                  <span className="json-punctuation">: </span>
                  {renderJSONValue((val as JSONObject)[key], path ? `${path}.${key}` : key, indent + 1)}
                  {idx < keys.length - 1 && <span className="json-punctuation">,</span>}
                </div>
              ))}
              <div style={{ paddingLeft: `${indent * 1.2}em` }}>
                <span className="json-punctuation">{'}'}</span>
              </div>
            </>
          )}
        </span>
      )
    }

    return <span>{String(val)}</span>
  }

  return (
    <div className="json-editor">
      <div className="json-editor__toolbar">
        <div className="json-editor__mode-toggle">
          <button 
            className={`btn btn--ghost btn--sm ${viewMode === 'edit' ? 'btn--active' : ''}`}
            onClick={() => setViewMode('edit')}
          >
            Edit
          </button>
          <button 
            className={`btn btn--ghost btn--sm ${viewMode === 'view' ? 'btn--active' : ''}`}
            onClick={() => setViewMode('view')}
            disabled={!parsedJSON}
          >
            View
          </button>
        </div>
        {viewMode === 'view' && parsedJSON && (
          <div className="json-editor__fold-controls">
            <button 
              className="btn btn--ghost btn--sm"
              onClick={collapseAll}
              title="Collapse all sections"
            >
              ⊟ Collapse All
            </button>
            <button 
              className="btn btn--ghost btn--sm"
              onClick={expandAll}
              title="Expand all sections"
            >
              ⊞ Expand All
            </button>
          </div>
        )}
      </div>
      <div className="json-editor__content">
        {viewMode === 'edit' ? (
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={highlightCode}
            padding={16}
            className="json-editor__input"
            textareaClassName="json-editor__textarea"
            preClassName="json-editor__pre"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '12.5px',
              lineHeight: '1.35rem',
            }}
            placeholder={placeholder}
          />
        ) : parsedJSON ? (
          <div className="json-viewer">
            {renderJSONValue(parsedJSON, 'root', 0)}
          </div>
        ) : (
          <div className="json-viewer-error">
            Invalid JSON. Switch to Edit mode to fix.
          </div>
        )}
      </div>
    </div>
  )
}
