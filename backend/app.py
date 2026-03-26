import uuid
import threading
import time
import os
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room
from pygdbmi.gdbcontroller import GdbController

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24).hex()
CORS(app)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

SESSIONS_DIR = '/tmp/gdbui_sessions'
SESSION_TTL = 3600
sessions = {}
sessions_lock = threading.Lock()

os.makedirs(SESSIONS_DIR, exist_ok=True)


class Session:
    def __init__(self):
        self.id = str(uuid.uuid4())
        self.gdb = GdbController()
        self.work_dir = os.path.join(SESSIONS_DIR, self.id)
        os.makedirs(self.work_dir)
        self.program_path = None
        self.last_active = time.time()
        self.lock = threading.Lock()
        self.active = True
        threading.Thread(target=self._poll, daemon=True).start()

    def _poll(self):
        while self.active:
            if self.lock.acquire(timeout=0.1):
                try:
                    responses = self.gdb.get_gdb_response(timeout_sec=0, raise_error_on_timeout=False)
                    if responses:
                        socketio.emit('output', {'data': responses}, room=self.id)
                except Exception:
                    pass
                finally:
                    self.lock.release()
            time.sleep(0.05)

    def execute(self, command):
        with self.lock:
            self.last_active = time.time()
            try:
                responses = self.gdb.write(command, timeout_sec=10, raise_error_on_timeout=False)
                if responses:
                    socketio.emit('output', {'data': responses}, room=self.id)
                return responses
            except Exception as e:
                return [{'type': 'log', 'message': str(e), 'payload': None}]

    def destroy(self):
        self.active = False
        with self.lock:
            try:
                self.gdb.exit()
            except Exception:
                pass


def cleanup_loop():
    while True:
        time.sleep(300)
        now = time.time()
        with sessions_lock:
            expired = [sid for sid, s in sessions.items() if now - s.last_active > SESSION_TTL]
        for sid in expired:
            with sessions_lock:
                session = sessions.pop(sid, None)
            if session:
                session.destroy()


threading.Thread(target=cleanup_loop, daemon=True).start()


@app.route('/api/session', methods=['POST'])
def create_session():
    session = Session()
    with sessions_lock:
        sessions[session.id] = session
    return jsonify({'session_id': session.id})


@app.route('/api/session', methods=['DELETE'])
def delete_session():
    data = request.get_json()
    session_id = data.get('session_id')
    with sessions_lock:
        session = sessions.pop(session_id, None)
    if session:
        session.destroy()
    return jsonify({'success': True})


@app.route('/api/compile', methods=['POST'])
def compile_code():
    data = request.get_json()
    session_id = data.get('session_id')
    code = data.get('code')
    language = data.get('language', 'c')

    with sessions_lock:
        session = sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    ext = 'cpp' if language == 'cpp' else 'c'
    compiler = 'g++' if language == 'cpp' else 'gcc'
    source_path = os.path.join(session.work_dir, f'program.{ext}')
    binary_path = os.path.join(session.work_dir, 'program')

    with open(source_path, 'w') as f:
        f.write(code)

    result = subprocess.run(
        [compiler, '-g', '-o', binary_path, source_path],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        return jsonify({'error': result.stderr}), 400

    session.program_path = binary_path
    session.execute(f'-file-exec-and-symbols {binary_path}')
    return jsonify({'success': True})


@app.route('/api/command', methods=['POST'])
def send_command():
    data = request.get_json()
    session_id = data.get('session_id')
    command = data.get('command')

    with sessions_lock:
        session = sessions.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    responses = session.execute(command)
    return jsonify({'output': responses})


@socketio.on('join')
def handle_join(data):
    join_room(data.get('session_id'))


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
