/**
 * StreamingService - Bidirectional WebSocket connection to the agent server.
 *
 * Protocol:
 *   Client → Server:
 *     { type: "frame",  data: "<base64 jpeg>", timestamp: <ms> }
 *     { type: "query",  text: "where are my glasses?", timestamp: <ms> }
 *     { type: "ping" }
 *
 *   Server → Client:
 *     { type: "response", agent: "observer|context|communicator", text: "...", priority: "low|medium|high|critical" }
 *     { type: "alert",    alertType: "stoveOn|medicationMissed|...", message: "...", escalate: true/false }
 *     { type: "pong" }
 *
 * For the demo, if no server is available, the service runs in local simulation
 * mode — queries are answered locally with realistic delays.
 */

const WS_URL = null; // Set to your server URL, e.g. 'ws://192.168.1.100:8080'
const RECONNECT_DELAY = 3000;
const FRAME_INTERVAL = 1000; // 1 fps

class StreamingService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isSimulated = true; // true when no server available
    this.latency = 0;
    this.onResponse = null;   // callback: ({ agent, text, priority }) => void
    this.onAlert = null;      // callback: ({ alertType, message, escalate }) => void
    this.onStatusChange = null; // callback: (isConnected) => void
    this._frameInterval = null;
    this._reconnectTimer = null;
  }

  /**
   * Connect to the agent server via WebSocket.
   * Falls back to simulation mode if WS_URL is null or connection fails.
   */
  connect() {
    if (!WS_URL) {
      this.isSimulated = true;
      this.isConnected = true;
      this.onStatusChange?.(true);
      console.log('[StreamingService] Running in simulation mode (no server URL)');
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[StreamingService] Connected to', WS_URL);
        this.isConnected = true;
        this.isSimulated = false;
        this.onStatusChange?.(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'response') {
            this.onResponse?.({ agent: msg.agent, text: msg.text, priority: msg.priority });
          } else if (msg.type === 'alert') {
            this.onAlert?.({ alertType: msg.alertType, message: msg.message, escalate: msg.escalate });
          }
        } catch (e) {
          console.warn('[StreamingService] Failed to parse message:', e);
        }
      };

      this.ws.onerror = () => {
        console.log('[StreamingService] Connection error, falling back to simulation');
        this._fallbackToSimulation();
      };

      this.ws.onclose = () => {
        console.log('[StreamingService] Disconnected');
        this.isConnected = false;
        this.onStatusChange?.(false);
        // Auto-reconnect
        this._reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY);
      };
    } catch (e) {
      this._fallbackToSimulation();
    }
  }

  _fallbackToSimulation() {
    this.isSimulated = true;
    this.isConnected = true;
    this.onStatusChange?.(true);
  }

  /**
   * Disconnect from the server.
   */
  disconnect() {
    if (this._frameInterval) {
      clearInterval(this._frameInterval);
      this._frameInterval = null;
    }
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
   * Send a camera frame (base64 JPEG) to the server.
   */
  sendFrame(base64Data) {
    if (!this.isConnected) return;

    if (!this.isSimulated && this.ws?.readyState === WebSocket.OPEN) {
      const sendTime = Date.now();
      this.ws.send(JSON.stringify({
        type: 'frame',
        data: base64Data,
        timestamp: sendTime,
      }));
    }
    // In simulation mode, frames are "received" but not processed
  }

  /**
   * Send a user text query to the server.
   * In simulation mode, returns a local response.
   */
  sendQuery(text) {
    if (!this.isConnected) return;

    if (!this.isSimulated && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'query',
        text: text,
        timestamp: Date.now(),
      }));
    }
    // In simulation mode, the app handles queries locally (in App.js)
  }

  /**
   * Start streaming camera frames at ~1 fps.
   * cameraRef: a ref to expo-camera CameraView.
   */
  startFrameStreaming(cameraRef) {
    if (this._frameInterval) return;

    this._frameInterval = setInterval(async () => {
      if (!cameraRef?.current || !this.isConnected) return;
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,  // Low quality for speed
          base64: true,
          skipProcessing: true,
        });
        if (photo?.base64) {
          this.sendFrame(photo.base64);
        }
      } catch (e) {
        // Camera might not be ready, skip this frame
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
