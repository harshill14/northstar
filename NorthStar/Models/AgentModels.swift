import Foundation
import CoreGraphics

// MARK: - Agent Types

enum AgentType: String, Codable, CaseIterable {
    case observer
    case context
    case communicator
}

// MARK: - Priority

enum Priority: Int, Codable, Comparable, CaseIterable {
    case low = 0
    case medium = 1
    case high = 2
    case critical = 3

    static func < (lhs: Priority, rhs: Priority) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
}

// MARK: - Agent Message

struct AgentMessage: Identifiable, Codable {
    let id: UUID
    let agentType: AgentType
    let content: String
    let timestamp: Date
    let priority: Priority

    init(id: UUID = UUID(), agentType: AgentType, content: String, timestamp: Date = Date(), priority: Priority = .medium) {
        self.id = id
        self.agentType = agentType
        self.content = content
        self.timestamp = timestamp
        self.priority = priority
    }
}

// MARK: - Detected Object

struct DetectedObject: Identifiable, Codable {
    let id: UUID
    let label: String
    let confidence: Float
    let boundingBox: CGRect
    let lastSeen: Date
    let location: String?

    init(id: UUID = UUID(), label: String, confidence: Float, boundingBox: CGRect, lastSeen: Date = Date(), location: String? = nil) {
        self.id = id
        self.label = label
        self.confidence = confidence
        self.boundingBox = boundingBox
        self.lastSeen = lastSeen
        self.location = location
    }
}

// MARK: - Safety Alert

enum SafetyAlertType: String, Codable, CaseIterable {
    case stoveOn
    case doorOpen
    case medicationMissed
    case fallDetected
    case wandering
}

struct SafetyAlert: Identifiable, Codable {
    let id: UUID
    let type: SafetyAlertType
    let message: String
    let timestamp: Date
    let requiresEscalation: Bool

    init(id: UUID = UUID(), type: SafetyAlertType, message: String, timestamp: Date = Date(), requiresEscalation: Bool = false) {
        self.id = id
        self.type = type
        self.message = message
        self.timestamp = timestamp
        self.requiresEscalation = requiresEscalation
    }
}

// MARK: - Visual Anchor

struct VisualAnchor: Identifiable, Codable {
    let id: UUID
    let name: String
    let imageData: Data
    let category: String
    let lastKnownLocation: String
    let lastSeen: Date

    init(id: UUID = UUID(), name: String, imageData: Data, category: String, lastKnownLocation: String, lastSeen: Date = Date()) {
        self.id = id
        self.name = name
        self.imageData = imageData
        self.category = category
        self.lastKnownLocation = lastKnownLocation
        self.lastSeen = lastSeen
    }
}

// MARK: - User State

enum UserState: String, Codable, CaseIterable {
    case calm
    case confused
    case anxious
    case distressed
}

// MARK: - App Mode

enum AppMode: String, Codable, CaseIterable {
    case idle
    case listening
    case assisting
    case monitoring
    case caregiverEscalation
}

// MARK: - Streaming Frame

struct StreamingFrame: Identifiable, Codable {
    let id: UUID
    let imageData: Data
    let timestamp: Date
    let metadata: [String: String]

    init(id: UUID = UUID(), imageData: Data, timestamp: Date = Date(), metadata: [String: String] = [:]) {
        self.id = id
        self.imageData = imageData
        self.timestamp = timestamp
        self.metadata = metadata
    }
}
