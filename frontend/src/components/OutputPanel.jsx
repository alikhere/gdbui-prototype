function formatEntry(entry) {
  if (['console', 'target'].includes(entry.type) && typeof entry.payload === 'string') {
    return entry.payload
  }
  if (entry.type === 'log' && typeof entry.payload === 'string') {
    return entry.payload
  }
  const msg = entry.message ? ` ${entry.message}` : ''
  const payload = entry.payload
    ? ' ' + (typeof entry.payload === 'string' ? entry.payload : JSON.stringify(entry.payload))
    : ''
  return `[${entry.type}]${msg}${payload}`
}

export default function OutputPanel({ output, onClear, outputRef }) {
  return (
    <section className="right-panel">
      <div className="output-header">
        <span className="panel-label">GDB Output</span>
        <button className="btn-clear" onClick={onClear}>Clear</button>
      </div>
      <div className="output" ref={outputRef}>
        {output.length === 0 ? (
          <span className="output-empty">Compile a program to start debugging…</span>
        ) : (
          output.map((entry, i) => (
            <div key={i} className={`output-line type-${entry.type}`}>
              {formatEntry(entry)}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
