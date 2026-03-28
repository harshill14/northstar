/**
 * WebSocketService
 * Handles bidirectional streaming to the agent server.
 * - Sends JPEG frames as binary with VFRM header
 * - Sends speech text as JSON
 * - Receives agent messages and dispatches to store
 */

import {useSessionStore} from './store';

const FRAME_HEADER = new Uint8Array([0x56, 0x46, 0x52, 0x4d]); // "VFRM"
const RECONNECT_DELAY_MS = 3000;
const PING_INTERVAL_MS = 15000;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string = '';
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = false;
  private lastFrameSentMs = 0;
  private readonly FRAME_INTERVAL_MS = 500; // ~2fps

  connect(url: string) {
    this.url = url;
    this.shouldReconnect = true;
    this._open();
  }

  disconnect() {
    this.shouldReconnect = false;
    this._cleanup();
    useSessionStore.getState().setConnectionStatus('disconnected');
  }

  private _open() {
    useSessionStore.getState().setConnectionStatus('connecting');
    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        useSessionStore.getState().setConnectionStatus('connected');
        this._sendJSON({
          type: 'handshake',
          client: 'MemoryCompanion-ReactNative',
          version: '1.0',
          capabilities: ['video', 'speech_text'],
        });
        this._startPing();
      };

      this.ws.onmessage = e => {
        if (typeof e.data === 'string') {
          this._handleJSON(e.data);
        }
      };

      this.ws.onerror = err => {
        console.warn('[WS] Error:', err);
      };

      this.ws.onclose = () => {
        this._cleanup();
        useSessionStore.getState().setConnectionStatus('disconnected');
        if (this.shouldReconnect) {
          this.reconnectTimer = setTimeout(() => this._open(), RECONNECT_DELAY_MS);
        }
      };
    } catch (err) {
      console.warn('[WS] Failed to open:', err);
      if (this.shouldReconnect) {
        this.reconnectTimer = setTimeout(() => this._open(), RECONNECT_DELAY_MS);
      }
    }
  }

  private _cleanup() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  private _startPing() {
    this.pingTimer = setInterval(() => {
      this._sendJSON({type: 'ping', ts: Date.now()});
    }, PING_INTERVAL_MS);
  }

  private _handleJSON(text: string) {
    try {
      const data = JSON.parse(text);
      const store = useSessionStore.getState();

      switch (data.type) {
        case 'handshake_ack':
        case 'agent_message':
          if (data.message) {
            store.pushAgentMessage({
              text: data.message,
              priority: data.priority ?? 'normal',
            });
          }
          break;
        case 'ack':
          break;
      }
    } catch {
      // ignore malformed
    }
  }

  // ─── Public send methods ──────────────────────────────────────────────────

  sendFrame(base64Jpeg: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (now - this.lastFrameSentMs < this.FRAME_INTERVAL_MS) return;
    this.lastFrameSentMs = now;

    try {
      // Build binary: [VFRM 4B][timestamp 8B][jpeg data]
      const jpegBytes = Uint8Array.from(atob(base64Jpeg), c => c.charCodeAt(0));
      const tsMs = BigInt(now);
      const buf = new ArrayBuffer(4 + 8 + jpegBytes.byteLength);
      const view = new DataView(buf);
      // Write magic
      FRAME_HEADER.forEach((b, i) => view.setUint8(i, b));
      // Write timestamp (little-endian 64-bit)
      view.setBigUint64(4, tsMs, true);
      // Write jpeg
      new Uint8Array(buf, 12).set(jpegBytes);

      this.ws.send(buf);
      useSessionStore.getState().incrementFramesSent();
    } catch (err) {
      console.warn('[WS] Frame send error:', err);
    }
  }

  sendSpeechText(text: string) {
    this._sendJSON({type: 'speech_text', text, timestamp: Date.now() / 1000});
  }

  sendEvent(type: string, extra: Record<string, unknown> = {}) {
    this._sendJSON({type, timestamp: Date.now() / 1000, ...extra});
  }

  private _sendJSON(obj: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(obj));
    } catch {}
  }
}

// Singleton
export const wsService = new WebSocketService();
