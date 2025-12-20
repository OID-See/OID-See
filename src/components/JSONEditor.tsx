import { useState, useCallback } from 'react'
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

export function JSONEditor({ value, onChange, placeholder }: JSONEditorProps) {
  const highlightCode = useCallback((code: string) => {
    try {
      return highlight.highlight(code, { language: 'json', ignoreIllegals: true }).value
    } catch {
      return code
    }
  }, [])

  return (
    <div className="json-editor">
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
      />
    </div>
  )
}
