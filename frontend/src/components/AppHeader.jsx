export default function AppHeader({ backendError, sessionId }) {
  return (
    <header>
      <img src="/c2si.png" alt="C2SI" height="30" />
      <h1>GDB-UI Prototype</h1>
      {backendError ? (
        <div className="session-badge badge-error">
          <span className="session-label">BACKEND OFFLINE</span>
          <span className="session-id">start python app.py</span>
        </div>
      ) : (
        <div className="session-badge">
          <span className="session-label">SESSION</span>
          <span className="session-id">{sessionId ? sessionId.slice(0, 8) : 'connecting…'}</span>
        </div>
      )}
    </header>
  )
}
