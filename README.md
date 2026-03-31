# GDB-UI Prototype

A minimal proof-of-concept built for the GSoC 2026 application to [C2SI's GDB-UI project](https://github.com/c2siorg/GDB-UI). It demonstrates the two hardest architectural problems in the full project: per-user session isolation and real-time GDB output streaming over WebSocket.

<img width="1908" height="1050" alt="Screenshot from 2026-04-01 03-49-47" src="https://github.com/user-attachments/assets/dac143d9-04df-4a1d-8b94-8e7bcb3750d5" />

## What this demonstrates

### 1. Per-user session isolation

The existing GDB-UI codebase stores a single `gdb_controller` as a module-level global. Every user who connects shares the same GDB process, so one user's breakpoints, program state, and execution control bleed into every other user's session. This is the core architectural flaw that makes multi-user support impossible without a rewrite.

This prototype fixes it properly. Each browser tab calls `POST /api/session` on load and receives a UUID. The server creates a `Session` object that owns an independent `GdbController` instance and writes compiled binaries to an isolated directory under `/tmp/gdbui_sessions/<session_id>/`. Operations on session A have zero effect on session B. You can verify this by opening two tabs, compiling different programs in each, and stepping through them simultaneously — they run independently.

### 2. Real-time output via WebSocket

The existing codebase polls on button click: you press Run, a POST fires, the response comes back, the UI updates. Async GDB events (breakpoint hits, watchpoint triggers, program output mid-execution) are lost unless the user clicks again.

This prototype uses Flask-SocketIO. When the frontend connects, it joins a Socket.IO room identified by its session ID. A per-session background thread polls GDB's async output buffer every 50ms and emits anything new to that room only. The result is that breakpoint hits, library load notifications, and program stdout appear in the output panel the moment GDB produces them — no refresh, no poll button.

## Architecture

```
browser tab (React)
    │
    ├── REST: POST /api/session     → creates Session, returns UUID
    ├── REST: POST /api/compile     → compiles C code, loads binary into GDB
    ├── REST: POST /api/command     → sends any GDB MI command
    │
    └── WebSocket (Socket.IO)
            └── joins room: <session_id>
                    ↑
            backend emits 'output' events here as GDB produces them

backend (Flask + Flask-SocketIO)
    │
    ├── sessions = {}               → dict of session_id → Session
    │
    └── Session
            ├── GdbController()    → own GDB subprocess
            ├── work_dir           → /tmp/gdbui_sessions/<id>/
            ├── threading.Lock     → serialises all GDB access
            └── polling thread     → reads async GDB output, emits to room
```

## Running locally

You need Python 3.10+, Node 18+, GDB, and GCC installed.

**Backend:**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API server starts on `http://localhost:5000`.

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in two separate browser tabs. Each tab gets a distinct session ID shown in the header badge.

## Using the prototype

1. The editor comes pre-loaded with a small C program (factorial loop). You can edit it freely.
2. Click **Compile** — the server compiles with `gcc -g` and loads the binary into the session's GDB instance.
3. Enter a function name or `file:line` in the breakpoint field and click **Set Breakpoint**.
4. Click **Run** — GDB starts the program. If a breakpoint was set, execution stops there and the output panel shows the `stopped` event in real time.
5. Use **Continue**, **Step Over**, **Step Into**, and **Finish** to drive execution. All GDB output streams live into the panel without any page interaction.
6. Switch to the other tab — it has its own independent session. Compiling, setting breakpoints, and running in one tab does not affect the other.

## Demo

https://github.com/user-attachments/assets/d8730160-22ef-45c6-9829-daa0d2f41330


The video shows two browser tabs running simultaneously with independent GDB sessions,
and GDB output (breakpoint hits, execution events, program stdout) streaming live via
WebSocket with no page refresh.

## How this maps to the GSoC goals

The full GSoC project targets four objectives. This prototype directly addresses the two that require architectural decisions upfront:

**Session management for multi-user support** — The `Session` class and `sessions` dict shown here is the design that would be integrated into the main `gdbui_server/main.py`. Every existing endpoint would gain a `session_id` parameter, and the module-level globals would be replaced by lookups into this dict. Session cleanup (TTL-based, background thread) is already implemented here.

**Real-time debugging results via WebSocket** — The Flask-SocketIO integration and per-session room pattern shown here is exactly what needs to be added to the main codebase. The frontend would replace its current per-button axios calls with a single persistent socket connection, and async GDB events would drive UI updates rather than user-initiated polls.

The remaining objectives — CI/CD pipeline and first deployment — build on top of this foundation and are planned as distinct phases in the full proposal.
