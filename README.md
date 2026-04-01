# GDB-UI Prototype

A minimal proof-of-concept demonstrating per-user session isolation 
and real-time GDB output streaming over WebSocket — the two core 
architectural challenges in building a multi-user web-based debugger.

![Screenshot](https://github.com/user-attachments/assets/dac143d9-04df-4a1d-8b94-8e7bcb3750d5)

## What this demonstrates

### Per-user session isolation

Each browser tab that connects receives a unique UUID. The server 
creates a `Session` object that owns an independent `GdbController` 
instance and writes compiled binaries to an isolated directory under 
`/tmp/gdbui_sessions/<session_id>/`. Two tabs can compile different 
programs, set different breakpoints, and step through execution 
simultaneously — they never interfere with each other.

### Real-time GDB output via WebSocket

When the frontend connects, it joins a Socket.IO room identified by 
its session UUID. A per-session background thread polls GDB's async 
output buffer every 50ms and emits anything new to that room only. 
Breakpoint hits, execution events, and program stdout appear in the 
output panel the moment GDB produces them — no polling, no page refresh.

## Architecture
<img width="1049" height="814" alt="Screenshot from 2026-04-01 23-50-09" src="https://github.com/user-attachments/assets/65a1a0d6-e07f-44d5-b4e4-e8b4456d5668" />

## Running locally

**Prerequisites:** Python 3.10+, Node 18+, GDB, GCC

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Server starts at `http://localhost:5000`

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

## Using the prototype

1. Open the app in two separate browser tabs — each tab gets a 
   unique session ID shown in the header badge
2. In Tab 1, click **Compile** to build the default factorial program
3. Enter `main` in the breakpoint field and click **Set Breakpoint**
4. Click **Run** — execution pauses at the breakpoint and the 
   stopped event streams live into the output panel
5. Use **Step Over** a few times — each step produces a new stopped 
   event showing the updated line number, streamed in real time
6. Click **Continue** — program resumes and stdout streams live
7. Switch to Tab 2 — compile and run a different program while 
   Tab 1 is still active — the two sessions are completely independent

## Demo video
Watch the demo [here](https://drive.google.com/file/d/1JATzse4yUVXkWC9Bq9MI14BI8LD0RC2d/view?usp=sharing), or view it below.

https://github.com/user-attachments/assets/c81d8120-0448-4b05-b3a1-fe06e1fe0a1f
