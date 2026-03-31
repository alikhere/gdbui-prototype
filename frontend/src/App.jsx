import { useState, useEffect, useRef } from 'react'
import socket from './socket'
import Editor from './components/Editor'
import AppHeader from './components/AppHeader'
import LanguageToggle from './components/LanguageToggle'
import DebugControls from './components/DebugControls'
import OutputPanel from './components/OutputPanel'
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
      <AppHeader backendError={backendError} sessionId={sessionId} />

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
            <LanguageToggle language={language} onSwitch={switchLanguage} />
          </div>

          <Editor value={code} onChange={val => { setCode(val); setCompiled(false) }} />

          <DebugControls
            sessionId={sessionId}
            compiled={compiled}
            compiling={compiling}
            compileError={compileError}
            breakpoint={breakpoint}
            onBreakpointChange={setBreakpoint}
            onCompile={handleCompile}
            onSendCommand={sendCommand}
          />
        </section>

        <OutputPanel
          output={output}
          onClear={() => setOutput([])}
          outputRef={outputRef}
        />
      </main>
    </div>
  )
}
