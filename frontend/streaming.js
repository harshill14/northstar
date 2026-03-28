/**
 * StreamingService - Connects to the multimodal_frontier_project backend.
 *
 * Backend: FastAPI server (akshajuppala/multimodal_frontier_project)
 *
 * Two communication channels:
 *
 *   1. WebSocket  ws://<host>:8000/video/stream
 *      Client → Server:  Raw binary JPEG frames (not JSON, not base64)
 *      Server → Client:  Text messages — "SPEECH:{audio_b64}:{text}"
 *                         or proactive alerts from the observer agent
 *
 *   2. HTTP POST  http://<host>:8000/speech
 *      Request:   { "text": "where are my glasses?" }
 *      Response:  { "response": "I saw your glasses...", "audio": "<base64 mp3>" }
 *
 * The backend runs a LangGraph ReAct agent with Claude Sonnet, powered by:
 *   - Observer: analyzes camera frames via Claude Vision (5s windows at 2fps)
 *   - SharedContext: tracks last-seen objects, activities, safety concerns
 *   - 8 tools: calendar, medication, emergency call, weather, Q&A, etc.
 *
 * For demo: falls back to local simulation when no server is configured.
 */

// ─── Configuration ───────────────────────────────────────────────
// Set this to your backend server URL, e.g. 'http://192.168.1.100:8000'
const SERVER_URL = null;

const WS_PATH = '/video/stream';
const SPEECH_PATH = '/speech';
const HEALTH_PATH = '/health';
const RECONNECT_DELAY = 3000;
const FRAME_INTERVAL = 500; // 2 fps to match backend's FRAME_SAMPLE_RATE=2

// ─── Helper: base64 string → binary ArrayBuffer ─────────────────
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

class StreamingService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isSimulated = true;
    this.serverUrl = SERVER_URL;
    this.onResponse = null;      // ({ text, audio }) => void
    this.onAlert = null;         // ({ message, escalate }) => void
    this.onStatusChange = null;  // (isConnected) => void
    this._frameInterval = null;
    this._reconnectTimer = null;
  }

  /**
   * Set the server URL at runtime (e.g. from a settings screen).
   */
  setServerUrl(url) {
    this.serverUrl = url;
  }

  /**
   * Connect to the backend WebSocket for video streaming.
   * Falls back to simulation if no server URL or connection fails.
   */
  connect() {
    if (!this.serverUrl) {
      this._fallbackToSimulation();
      return;
    }

    try {
      const wsUrl = this.serverUrl.replace(/^http/, 'ws') + WS_PATH;
      console.log('[Streaming] Connecting to', wsUrl);
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        console.log('[Streaming] WebSocket connected');
        this.isConnected = true;
        this.isSimulated = false;
        this.onStatusChange?.(true);
      };

      this.ws.onmessage = (event) => {
        this._handleServerMessage(event.data);
      };

      this.ws.onerror = (e) => {
        console.log('[Streaming] WebSocket error, falling back to simulation');
        this._fallbackToSimulation();
      };

      this.ws.onclose = () => {
        console.log('[Streaming] WebSocket closed');
        this.isConnected = false;
        this.onStatusChange?.(false);
        this._reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
      };
    } catch (e) {
      this._fallbackToSimulation();
    }
  }

  /**
   * Parse messages from the backend.
   * Format: "SPEECH:{base64_audio}:{text}" for spoken responses
   * Or plain text / JSON for other messages.
   */
  _handleServerMessage(data) {
    try {
      const msg = typeof data === 'string' ? data : new TextDecoder().decode(data);

      // Backend speech response: "SPEECH:{audio_b64}:{text}"
      if (msg.startsWith('SPEECH:')) {
        const firstColon = msg.indexOf(':', 7);
        if (firstColon !== -1) {
          const audio = msg.substring(7, firstColon);
          const text = msg.substring(firstColon + 1);
          this.onResponse?.({ text, audio });
          return;
        }
      }

      // Try parsing as JSON (proactive alerts from observer)
      try {
        const json = JSON.parse(msg);
        if (json.urgency === 'high' || json.urgency === 'emergency') {
          this.onAlert?.({
            message: json.summary || json.message || 'Urgent situation detected',
            escalate: json.urgency === 'emergency',
          });
        } else if (json.text) {
          this.onResponse?.({ text: json.text, audio: json.audio });
        }
      } catch {
        // Plain text response
        if (msg.trim()) {
          this.onResponse?.({ text: msg, audio: null });
        }
      }
    } catch (e) {
      console.warn('[Streaming] Failed to parse message:', e);
    }
  }

  _fallbackToSimulation() {
    this.isSimulated = true;
    this.isConnected = true;
    this.onStatusChange?.(true);
    console.log('[Streaming] Running in simulation mode (no server)');
  }

  /**
   * Disconnect everything.
   */
  disconnect() {
    this.stopFrameStreaming();
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.onStatusChange?.(false);
  }

  /**
   * Send a camera frame as raw binary JPEG over WebSocket.
   * The backend expects raw bytes, NOT base64 or JSON.
   */
  sendFrame(base64Data) {
    if (!this.isConnected || this.isSimulated) return;
    if (this.ws?.readyState === WebSocket.OPEN) {
      const buffer = base64ToArrayBuffer(base64Data);
      this.ws.send(buffer);
    }
  }

  /**
   * Send a user text query via HTTP POST to /speech endpoint.
   * The backend processes it through the LangGraph agent pipeline.
   * Returns { response, audio } or null on failure.
   */
  async sendQuery(text) {
    if (!this.serverUrl || this.isSimulated) return null;

    try {
      const url = this.serverUrl + SPEECH_PATH;
      console.log('[Streaming] Sending query:', text);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        console.warn('[Streaming] Speech endpoint returned', res.status);
        return null;
      }

      const data = await res.json();
      // Backend returns { response: "...", audio: "base64 mp3" }
      if (data.response) {
        this.onResponse?.({ text: data.response, audio: data.audio || null });
      }
      return data;
    } catch (e) {
      console.warn('[Streaming] Query failed:', e.message);
      return null;
    }
  }

  /**
   * Check backend health.
   */
  async checkHealth() {
    if (!this.serverUrl) return null;
    try {
      const res = await fetch(this.serverUrl + HEALTH_PATH);
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Start streaming camera frames at 2 fps (matching backend FRAME_SAMPLE_RATE).
   */
  startFrameStreaming(cameraRef) {
    if (this._frameInterval) return;

    this._frameInterval = setInterval(async () => {
      if (!cameraRef?.current || !this.isConnected || this.isSimulated) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          base64: true,
          skipProcessing: true,
        });
        if (photo?.base64) {
          this.sendFrame(photo.base64);
        }
      } catch {
        // Camera not ready, skip frame
      }
    }, FRAME_INTERVAL);
  }

  /**
   * Stop streaming camera frames.
   */
  stopFrameStreaming() {
    if (this._frameInterval) {
      clearInterval(this._frameInterval);
      this._frameInterval = null;
    }
  }
}

export default new StreamingService();
