import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { cpp } from '@codemirror/lang-cpp'
import { oneDark } from '@codemirror/theme-one-dark'

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-scroller': { overflow: 'auto', fontFamily: "'Courier New', Courier, monospace" },
  '.cm-content': { padding: '10px 0' },
  '.cm-gutters': { background: '#0d0d1a', borderRight: '1px solid #1e1e3a' },
  '.cm-lineNumbers .cm-gutterElement': { color: '#3a3a5a', minWidth: '32px' },
  '&.cm-focused .cm-cursor': { borderLeftColor: '#5b9bd5' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: '#1a3a6b'
  },
})

export default function Editor({ value, onChange }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)

  useEffect(() => {
    const view = new EditorView({
      doc: value,
      extensions: [
        basicSetup,
        cpp(),
        oneDark,
        theme,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
      ],
      parent: containerRef.current,
    })
    viewRef.current = view
    return () => view.destroy()
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  return <div ref={containerRef} className="code-editor" />
}
