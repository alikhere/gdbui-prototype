import { useState, useEffect, useRef } from 'react'
import socket from './socket'
import Editor from './Editor'
import './App.css'

const API = 'http://localhost:5000'

const DEFAULT_C = `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    int i;
    for (i = 1; i <= 5; i++) {
        int result = factorial(i);
        printf("factorial(%d) = %d\\n", i, result);
    }
    return 0;
}`

const DEFAULT_CPP = `#include <iostream>

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

int main() {
    for (int i = 1; i <= 5; i++) {
        std::cout << "factorial(" << i << ") = " << factorial(i) << std::endl;
    }
    return 0;
}`

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

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [backendError, setBackendError] = useState(false)
  const [language, setLanguage] = useState('c')
  const [code, setCode] = useState(DEFAULT_C)
  const [breakpoint, setBreakpoint] = useState('main')
  const [output, setOutput] = useState([])
  const [compiled, setCompiled] = useState(false)
  const [compiling, setCompiling] = useState(false)
  const [compileError, setCompileError] = useState(null)
  const sessionRef = useRef(null)
  const outputRef = useRef(null)

  useEffect(() => {
    fetch(`${API}/api/session`, { method: 'POST' })
      .then(r => r.json())
      .then(({ session_id }) => {
        sessionRef.current = session_id
        setSessionId(session_id)
        socket.connect()
        socket.on('connect', () => {
          socket.emit('join', { session_id })
        })
      })
      .catch(() => setBackendError(true))

    socket.on('output', ({ data }) => {
      setOutput(prev => [...prev, ...data])
    })

    return () => {
      socket.off('output')
      socket.off('connect')
      if (sessionRef.current) {
        fetch(`${API}/api/session`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionRef.current })
        })
      }
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [output])

  const switchLanguage = (lang) => {
    setLanguage(lang)
    setCode(lang === 'cpp' ? DEFAULT_CPP : DEFAULT_C)
    setCompiled(false)
    setCompileError(null)
    setOutput([])
  }

  const handleCompile = async () => {
    setCompiling(true)
    setCompileError(null)
    setOutput([])
    setCompiled(false)

    const res = await fetch(`${API}/api/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, code, language })
    })
    const data = await res.json()
    setCompiling(false)

    if (!res.ok) {
      setCompileError(data.error)
    } else {
      setCompiled(true)
    }
  }

  const sendCommand = (command) => {
    fetch(`${API}/api/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, command })
    })
  }

  return (
    <div className="app">
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

      {backendError && (
        <div className="backend-banner">
          Cannot reach backend at {API}. Make sure the Flask server is running:
          <code>cd backend &amp;&amp; source venv/bin/activate &amp;&amp; python app.py</code>
        </div>
      )}

      <main>
        <section className="left-panel">
          <div className="panel-top-row">
            <span className="panel-label">Source</span>
            <div className="lang-toggle">
              <button
                className={`lang-btn${language === 'c' ? ' active' : ''}`}
                onClick={() => switchLanguage('c')}
              >
                C
              </button>
              <button
                className={`lang-btn${language === 'cpp' ? ' active' : ''}`}
                onClick={() => switchLanguage('cpp')}
              >
                C++
              </button>
            </div>
          </div>

          <Editor value={code} onChange={val => { setCode(val); setCompiled(false) }} />

          {compileError && (
            <pre className="compile-error">{compileError}</pre>
          )}
          <div className="controls">
            <button
              className="btn-compile"
              onClick={handleCompile}
              disabled={compiling || !sessionId}
            >
              {compiling ? 'Compiling…' : 'Compile'}
            </button>
            <div className="breakpoint-row">
              <input
                value={breakpoint}
                onChange={e => setBreakpoint(e.target.value)}
                placeholder="function or file:line"
                disabled={!compiled}
              />
              <button
                onClick={() => sendCommand(`-break-insert ${breakpoint}`)}
                disabled={!compiled}
              >
                Set Breakpoint
              </button>
            </div>
            <div className="exec-row">
              <button onClick={() => sendCommand('-exec-run')} disabled={!compiled}>Run</button>
              <button onClick={() => sendCommand('-exec-continue')} disabled={!compiled}>Continue</button>
              <button onClick={() => sendCommand('-exec-next')} disabled={!compiled}>Step Over</button>
              <button onClick={() => sendCommand('-exec-step')} disabled={!compiled}>Step Into</button>
              <button onClick={() => sendCommand('-exec-finish')} disabled={!compiled}>Finish</button>
            </div>
          </div>
        </section>

        <section className="right-panel">
          <div className="output-header">
            <span className="panel-label">GDB Output</span>
            <button className="btn-clear" onClick={() => setOutput([])}>Clear</button>
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
      </main>
    </div>
  )
}
