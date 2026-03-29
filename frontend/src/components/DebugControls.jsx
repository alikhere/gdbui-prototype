export default function DebugControls({
  sessionId,
  compiled,
  compiling,
  compileError,
  breakpoint,
  onBreakpointChange,
  onCompile,
  onSendCommand,
}) {
  return (
    <>
      {compileError && (
        <pre className="compile-error">{compileError}</pre>
      )}
      <div className="controls">
        <button
          className="btn-compile"
          onClick={onCompile}
          disabled={compiling || !sessionId}
        >
          {compiling ? 'Compiling…' : 'Compile'}
        </button>
        <div className="breakpoint-row">
          <input
            value={breakpoint}
            onChange={e => onBreakpointChange(e.target.value)}
            placeholder="function or file:line"
            disabled={!compiled}
          />
          <button
            onClick={() => onSendCommand(`-break-insert ${breakpoint}`)}
            disabled={!compiled}
          >
            Set Breakpoint
          </button>
        </div>
        <div className="exec-row">
          <button onClick={() => onSendCommand('-exec-run')} disabled={!compiled}>Run</button>
          <button onClick={() => onSendCommand('-exec-continue')} disabled={!compiled}>Continue</button>
          <button onClick={() => onSendCommand('-exec-next')} disabled={!compiled}>Step Over</button>
          <button onClick={() => onSendCommand('-exec-step')} disabled={!compiled}>Step Into</button>
          <button onClick={() => onSendCommand('-exec-finish')} disabled={!compiled}>Finish</button>
        </div>
      </div>
    </>
  )
}
