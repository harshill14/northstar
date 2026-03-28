import Foundation
import Combine
import SwiftUI

/// Central orchestrator that coordinates the multi-agent pipeline.
///
/// The orchestrator owns every service and wires them together: camera frames
/// flow to the streaming service and safety monitor, speech recognition feeds
/// into `handleUserQuery`, and agent responses are spoken aloud via the speech
/// service.  Views observe its `@Published` properties for UI state.
@MainActor
final class AgentOrchestrator: ObservableObject {

    // MARK: - Published State

    /// Current application mode (aliased as `appMode` for callers that prefer that name).
    @Published var currentMode: AppMode = .idle

    /// Convenience alias so callers using the name `appMode` still compile.
    var appMode: AppMode {
        get { currentMode }
        set { currentMode = newValue }
    }

    /// The latest textual response shown / spoken to the user.
    @Published var spokenResponse: String = ""

    /// Convenience alias matching the spec name `currentResponse`.
    var currentResponse: String {
        get { spokenResponse }
        set { spokenResponse = newValue }
    }

    @Published var detectedObjects: [DetectedObject] = []
    @Published var safetyAlerts: [SafetyAlert] = []
    @Published var agentMessages: [AgentMessage] = []
    @Published var userState: UserState = .calm
    @Published var isSessionActive: Bool = false
    @Published var caregiverName: String = "Dr. Sarah Chen"
    @Published var escalationReason: String = ""

    // MARK: - Services

    let cameraService = CameraService()
    let speechService = SpeechService()
    let memoryStore = MemoryStore()
    let safetyMonitor = SafetyMonitor()
    let streamingService = StreamingService()
    let visualAnchorStore = VisualAnchorStore()

    // MARK: - Private

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Init

    init() {
        wireServices()
        preloadDemoObjects()
    }

    // MARK: - Service Wiring

    /// Connects callbacks and publishers so the services communicate through
    /// the orchestrator.
    private func wireServices() {
        // Camera frames -> streaming service + safety monitor
        cameraService.onFrameCaptured = { [weak self] frameData in
            guard let self else { return }
            Task { @MainActor in
                self.streamingService.sendFrame(frameData)
                self.safetyMonitor.analyzeFrame(frameData)
            }
        }

        // Speech recognition -> handle user queries
        speechService.onSpeechRecognized = { [weak self] text in
            guard let self else { return }
            Task { @MainActor in
                self.handleUserQuery(text)
            }
        }

        // Streaming service agent responses -> aggregate into messages list
        streamingService.onAgentResponse = { [weak self] message in
            guard let self else { return }
            Task { @MainActor in
                self.agentMessages.append(message)
                self.memoryStore.addMessage(message)
            }
        }

        // Safety monitor alerts -> mirror into orchestrator's published array
        safetyMonitor.$activeAlerts
            .receive(on: RunLoop.main)
            .sink { [weak self] alerts in
                self?.safetyAlerts = alerts
            }
            .store(in: &cancellables)
    }

    // MARK: - Session Lifecycle

    /// Starts the full assistance session: camera, streaming connection,
    /// safety monitoring, and transitions to the monitoring mode.
    func startSession() {
        guard !isSessionActive else { return }
        isSessionActive = true
        currentMode = .monitoring
        spokenResponse = ""

        cameraService.start()
        streamingService.connect()

        speechService.requestPermissions { [weak self] granted in
            if granted {
                // Permissions are ready; listening will start on demand.
            }
            _ = self  // retain cycle guard
        }
    }

    /// Stops every running service and returns to idle.
    func stopSession() {
        speechService.stopListening()
        cameraService.stop()
        streamingService.disconnect()
        safetyMonitor.reset()

        currentMode = .idle
        isSessionActive = false
        spokenResponse = ""
    }

    // MARK: - Listening Helpers (used by views)

    /// Called when the user taps the "Help Me" button.
    func activateListening() {
        guard currentMode == .idle || currentMode == .monitoring else { return }
        currentMode = .listening
        isSessionActive = true
        spokenResponse = "I'm listening. How can I help?"

        // Ensure the streaming connection is live.
        if !streamingService.isConnected {
            streamingService.connect()
        }
        // Ensure camera is running.
        if !cameraService.isRunning {
            cameraService.start()
        }

        speechService.requestPermissions { [weak self] granted in
            Task { @MainActor in
                guard let self else { return }
                if granted {
                    self.speechService.startListening()
                } else {
                    // For demo: simulate a voice query if mic permission denied
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        self.handleUserQuery("Where are my glasses?")
                    }
                }
            }
        }
    }

    /// Called when the system finishes processing and produces a response.
    func beginAssisting(response: String) {
        currentMode = .assisting
        spokenResponse = response
    }

    // MARK: - Query Handling (Demo)

    /// Processes a user voice query through the simulated multi-agent pipeline.
    ///
    /// The method demonstrates the architecture by logging which agent is
    /// responding and simulating realistic lookup behaviour.
    func handleUserQuery(_ query: String) {
        // Stop listening while we process
        speechService.stopListening()
        currentMode = .assisting
        spokenResponse = ""

        let lowerQuery = query.lowercased()

        // ------------------------------------------------------------------
        // 1. Observer Agent – identifies the intent
        // ------------------------------------------------------------------
        let observerNote: String
        let responseText: String
        var requiresEscalation = false

        if containsAny(lowerQuery, terms: ["glasses", "keys", "phone", "wallet", "remote"]) {
            let item = extractItem(from: lowerQuery)
            let anchor = visualAnchorStore.anchors.first {
                $0.name.lowercased().contains(item)
            }
            let location = anchor?.lastKnownLocation ?? "the living room"
            let minutesAgo = Int.random(in: 5...45)

            observerNote = "[Observer Agent] Detected object-finding intent for \"\(item)\"."
            responseText = "I saw your \(item) on the \(location) about \(minutesAgo) minutes ago. Let me guide you there."

        } else if containsAny(lowerQuery, terms: ["who"]) {
            observerNote = "[Observer Agent] Detected person-identification intent."
            responseText = "That looks like Margaret, your daughter. She visited you last Tuesday."

        } else if containsAny(lowerQuery, terms: ["pill", "medicine", "medication"]) {
            observerNote = "[Observer Agent] Detected medication intent – escalating to human-in-the-loop."
            responseText = "Let me check your schedule. According to your records, your next dose is at 2:00 PM. Let me confirm with your caregiver."
            requiresEscalation = true

        } else {
            observerNote = "[Observer Agent] No specific intent matched; using default response."
            responseText = "I'm here to help. Can you tell me more about what you're looking for?"
        }

        // Log the Observer agent message
        let observerMessage = AgentMessage(
            agentType: .observer,
            content: observerNote,
            priority: requiresEscalation ? .high : .medium
        )
        agentMessages.append(observerMessage)
        memoryStore.addMessage(observerMessage)

        // ------------------------------------------------------------------
        // 2. Context Agent – enriches with memory (simulated delay)
        // ------------------------------------------------------------------
        let contextNote = "[Context Agent] Cross-referenced memory store. User state: \(userState.rawValue)."
        let contextMessage = AgentMessage(
            agentType: .context,
            content: contextNote
        )
        agentMessages.append(contextMessage)
        memoryStore.addMessage(contextMessage)

        // ------------------------------------------------------------------
        // 3. Communicator Agent – delivers the response
        // ------------------------------------------------------------------
        let communicatorMessage = AgentMessage(
            agentType: .communicator,
            content: responseText,
            priority: requiresEscalation ? .high : .medium
        )
        agentMessages.append(communicatorMessage)
        memoryStore.addMessage(communicatorMessage)

        // Update the visible response and speak it
        spokenResponse = responseText
        speechService.speak(responseText)

        // Simulate streaming service acknowledgement
        streamingService.simulateAgentResponse(
            agentType: .communicator,
            content: responseText,
            priority: requiresEscalation ? .high : .medium,
            delay: 0.3
        )

        // ------------------------------------------------------------------
        // 4. Safety gate – medication queries always escalate
        // ------------------------------------------------------------------
        if requiresEscalation {
            let alert = safetyMonitor.flagMedicationQuery()
            safetyAlerts = safetyMonitor.activeAlerts
            triggerCaregiverEscalation(reason: alert.message)
        } else {
            // After a short pause, return to monitoring
            DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) { [weak self] in
                guard let self, self.currentMode == .assisting else { return }
                self.currentMode = .monitoring
            }
        }
    }

    // MARK: - Caregiver Escalation

    /// Triggers a caregiver escalation flow with the given reason.
    func triggerCaregiverEscalation(reason: String) {
        escalationReason = reason
        currentMode = .caregiverEscalation
        isSessionActive = true
        userState = .anxious
    }

    /// Alias used by views that call `escalateToCaregiver(reason:)`.
    func escalateToCaregiver(reason: String) {
        triggerCaregiverEscalation(reason: reason)
    }

    /// Cancel an active caregiver escalation.
    func cancelEscalation() {
        currentMode = .monitoring
        isSessionActive = true
        escalationReason = ""
        userState = .calm
    }

    // MARK: - Alert Management

    /// Dismiss a specific safety alert from both the orchestrator and the monitor.
    func dismissAlert(_ alert: SafetyAlert) {
        safetyAlerts.removeAll { $0.id == alert.id }
        safetyMonitor.dismissAlert(alert)
    }

    // MARK: - Helpers

    /// Returns `true` if `text` contains any of the given terms.
    private func containsAny(_ text: String, terms: [String]) -> Bool {
        terms.contains { text.contains($0) }
    }

    /// Extracts the first matching item keyword from the query.
    private func extractItem(from query: String) -> String {
        let items = ["glasses", "keys", "phone", "wallet", "remote"]
        return items.first { query.contains($0) } ?? "item"
    }

    /// Pre-populate detected objects for the demo so "where is my X" works immediately.
    private func preloadDemoObjects() {
        let demoObjects: [(String, String, TimeInterval)] = [
            ("Glasses", "kitchen counter", -600),
            ("Keys", "hallway table by the front door", -1800),
            ("Phone", "living room couch cushion", -300),
            ("Wallet", "bedroom dresser", -3600),
            ("TV Remote", "living room side table", -120),
        ]

        for (label, location, timeAgo) in demoObjects {
            let obj = DetectedObject(
                label: label,
                confidence: Float.random(in: 0.85...0.98),
                boundingBox: CGRect(x: 0.3, y: 0.3, width: 0.4, height: 0.4),
                lastSeen: Date().addingTimeInterval(timeAgo),
                location: location
            )
            memoryStore.recordObject(obj)
            detectedObjects.append(obj)
        }
    }
}
