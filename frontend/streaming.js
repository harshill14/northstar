/**
 * StreamingService - Connects to the multimodal_frontier_project backend.
 *
 * Backend: FastAPI server (akshajuppala/multimodal_frontier_project)
 *
 * Communication channels:
 *   1. WebSocket ws://<host>:8000/video/stream  — raw binary JPEG frames
 *   2. HTTP POST /frame   — fallback for frames when WebSocket unavailable
 *   3. HTTP POST /speech  — user queries via LangGraph agent
 *   4. GET /health        — server status
 *
 * Falls back to HTTP frame upload if WebSocket fails (e.g. through Expo tunnel).
 * Falls back to local simulation if server is unreachable.
 */

// ─── Configuration ───────────────────────────────────────────────
// Set this to your backend server URL
const SERVER_URL = 'http://172.20.10.6:8000';

const WS_PATH = '/video/stream';
const FRAME_PATH = '/frame';
const SPEECH_PATH = '/speech';
const HEALTH_PATH = '/health';
const RECONNECT_DELAY = 5000;
const FRAME_INTERVAL = 500; // 2 fps

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
    this.useHttpFrames = false;  // true = use POST /frame instead of WebSocket
    this.serverUrl = SERVER_URL;
    this.onResponse = null;
    this.onAlert = null;
    this.onStatusChange = null;
    this._frameInterval = null;
    this._reconnectTimer = null;
  }

  setServerUrl(url) {
    this.serverUrl = url;
  }

  /**
   * Connect: first check health via HTTP, then try WebSocket.
   * If WebSocket fails, use HTTP /frame endpoint for frames.
   */
  async connect() {
    if (!this.serverUrl) {
      this._fallbackToSimulation();
      return;
    }

    // First check if server is reachable via HTTP
    const health = await this.checkHealth();
    if (!health) {
      console.log('[Streaming] Server unreachable, falling back to simulation');
      this._fallbackToSimulation();
      return;
    }

    console.log('[Streaming] Server is reachable:', health);

    // Try WebSocket connection
    try {
      const wsUrl = this.serverUrl.replace(/^http/, 'ws') + WS_PATH;
      console.log('[Streaming] Trying WebSocket:', wsUrl);

      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      // Give WebSocket 3 seconds to connect, otherwise use HTTP fallback
      const wsTimeout = setTimeout(() => {
        if (!this.isConnected || this.isSimulated) {
          console.log('[Streaming] WebSocket timeout, using HTTP frame upload');
          this.useHttpFrames = true;
          this.isConnected = true;
          this.isSimulated = false;
          this.onStatusChange?.(true);
        }
      }, 3000);

      this.ws.onopen = () => {
        clearTimeout(wsTimeout);
        console.log('[Streaming] WebSocket connected');
        this.isConnected = true;
        this.isSimulated = false;
        this.useHttpFrames = false;
        this.onStatusChange?.(true);
      };

      this.ws.onmessage = (event) => {
        this._handleServerMessage(event.data);
      };

      this.ws.onerror = () => {
        clearTimeout(wsTimeout);
        console.log('[Streaming] WebSocket failed, using HTTP frame upload');
        this.useHttpFrames = true;
        this.isConnected = true;
        this.isSimulated = false;
        this.onStatusChange?.(true);
      };

      this.ws.onclose = () => {
        if (!this.useHttpFrames) {
          console.log('[Streaming] WebSocket closed');
          this.isConnected = false;
          this.onStatusChange?.(false);
          this._reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
        }
      };
    } catch (e) {
      // WebSocket not available, use HTTP
      console.log('[Streaming] WebSocket unavailable, using HTTP frame upload');
      this.useHttpFrames = true;
      this.isConnected = true;
      this.isSimulated = false;
      this.onStatusChange?.(true);
    }
  }

  _handleServerMessage(data) {
    try {
      const msg = typeof data === 'string' ? data : new TextDecoder().decode(data);

      if (msg.startsWith('SPEECH:')) {
        const firstColon = msg.indexOf(':', 7);
        if (firstColon !== -1) {
          const audio = msg.substring(7, firstColon);
          const text = msg.substring(firstColon + 1);
          this.onResponse?.({ text, audio });
          return;
        }
      }

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
    this.useHttpFrames = false;
    this.onStatusChange?.(true);
    console.log('[Streaming] Running in simulation mode');
  }

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
    this.useHttpFrames = false;
    this.onStatusChange?.(false);
  }

  /**
   * Send a camera frame. Uses WebSocket if available, HTTP POST /frame otherwise.
   */
  sendFrame(base64Data) {
    if (!this.isConnected || this.isSimulated) return;

    if (!this.useHttpFrames && this.ws?.readyState === WebSocket.OPEN) {
      // WebSocket: send raw binary
      const buffer = base64ToArrayBuffer(base64Data);
      this.ws.send(buffer);
    } else if (this.useHttpFrames) {
      // HTTP fallback: POST base64 to /frame
      fetch(this.serverUrl + FRAME_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: base64Data }),
      }).catch(() => {}); // Fire and forget
    }
  }

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
      if (data.response) {
        this.onResponse?.({ text: data.response, audio: data.audio || null });
      }
      return data;
    } catch (e) {
      console.warn('[Streaming] Query failed:', e.message);
      return null;
    }
  }

  async checkHealth() {
    if (!this.serverUrl) return null;
    try {
      const res = await fetch(this.serverUrl + HEALTH_PATH, { signal: AbortSignal.timeout(3000) });
      return await res.json();
    } catch {
      return null;
    }
  }

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
        // Camera not ready
      }
    }, FRAME_INTERVAL);
  }

  stopFrameStreaming() {
    if (this._frameInterval) {
      clearInterval(this._frameInterval);
      this._frameInterval = null;
    }
  }
}

export default new StreamingService();
