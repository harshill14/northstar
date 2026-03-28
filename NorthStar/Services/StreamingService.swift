import Foundation
import Combine

// ---------------------------------------------------------------------------
// MARK: - Architecture Notes
// ---------------------------------------------------------------------------
// In production this service would open a persistent WebSocket (or WebRTC
// data-channel) to a backend inference cluster:
//
//   1. Camera frames are sent as binary WebSocket messages (~60 KB JPEG each
//      at 1-2 fps).
//   2. The server runs multi-agent inference (observer, context, communicator)
//      and streams back AgentMessage objects as JSON text frames.
//   3. Latency target: < 300 ms round-trip for text responses, < 500 ms for
//      frames that require Vision model inference.
//
// For the demo we simulate realistic latency and return canned responses so
// the app can be reviewed without a live backend.
// ---------------------------------------------------------------------------

/// Simulates a bidirectional streaming connection to the NorthStar backend.
@MainActor
final class StreamingService: ObservableObject {

    // MARK: - Published Properties

    @Published var isConnected: Bool = false
    @Published var latency: TimeInterval = 0

    // MARK: - Callback

    /// Invoked on the main actor when the server (or simulation) delivers a
    /// response message.
    var onAgentResponse: ((AgentMessage) -> Void)?

    // MARK: - Private

    // In production: private var webSocketTask: URLSessionWebSocketTask?
    private var connectionStartTime: Date?
    private var simulationTimers: [Timer] = []

    // MARK: - Connection Lifecycle

    /// Opens the streaming connection.
    /// For the demo this simply flips a flag after a short simulated handshake.
    func connect() {
        guard !isConnected else { return }
        connectionStartTime = Date()

        // Simulate a WebSocket handshake delay.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            guard let self else { return }
            self.isConnected = true
            self.latency = 0.15
        }
    }

    /// Tears down the streaming connection.
    func disconnect() {
        simulationTimers.forEach { $0.invalidate() }
        simulationTimers.removeAll()
        isConnected = false
        latency = 0
    }

    // MARK: - Sending Frames

    /// Sends a JPEG camera frame to the server for analysis.
    ///
    /// In production this would write the binary payload to the WebSocket.
    /// Here we acknowledge receipt with a simulated latency measurement.
    func sendFrame(_ data: Data) {
        guard isConnected else { return }

        let sendTime = Date()

        // Simulate server processing time (200-500 ms).
        let processingDelay = Double.random(in: 0.2...0.5)
        DispatchQueue.main.asyncAfter(deadline: .now() + processingDelay) { [weak self] in
            guard let self, self.isConnected else { return }
            self.latency = Date().timeIntervalSince(sendTime)
        }
    }

    // MARK: - Simulated Responses

    /// Enqueues a simulated agent response with a realistic delay.
    /// Used by the orchestrator to emulate the backend inference pipeline.
    func simulateAgentResponse(
        agentType: AgentType,
        content: String,
        priority: Priority = .medium,
        delay: TimeInterval? = nil
    ) {
        let responseDelay = delay ?? Double.random(in: 0.2...0.5)

        DispatchQueue.main.asyncAfter(deadline: .now() + responseDelay) { [weak self] in
            guard let self, self.isConnected else { return }
            let message = AgentMessage(
                agentType: agentType,
                content: content,
                priority: priority
            )
            self.onAgentResponse?(message)
        }
    }
}
