import Foundation
import Combine

class MemoryStore: ObservableObject {

    // MARK: - Published Properties

    @Published var detectedObjects: [DetectedObject] = []
    @Published var recentHistory: [AgentMessage] = []
    @Published var visualAnchors: [VisualAnchor] = []

    // MARK: - Object Tracking

    /// Adds a detected object or updates an existing entry that shares the same label.
    /// If an object with the same label already exists, the new sighting is appended
    /// (keeping the history intact) rather than replacing it.
    func recordObject(_ object: DetectedObject) {
        detectedObjects.append(object)
    }

    /// Returns the most recently seen object matching the given label (case-insensitive).
    func findObject(named label: String) -> DetectedObject? {
        detectedObjects
            .filter { $0.label.localizedCaseInsensitiveCompare(label) == .orderedSame }
            .sorted { $0.lastSeen > $1.lastSeen }
            .first
    }

    /// Returns every recorded sighting of an object with the given label, ordered newest first.
    func objectHistory(for label: String) -> [DetectedObject] {
        detectedObjects
            .filter { $0.label.localizedCaseInsensitiveCompare(label) == .orderedSame }
            .sorted { $0.lastSeen > $1.lastSeen }
    }

    // MARK: - Visual Anchors

    func addAnchor(_ anchor: VisualAnchor) {
        visualAnchors.append(anchor)
    }

    // MARK: - History

    func addMessage(_ message: AgentMessage) {
        recentHistory.append(message)
    }

    // MARK: - Pruning

    /// Removes detected objects, messages, and anchors older than the specified interval.
    /// Defaults to 1 hour (3600 seconds).
    func pruneOldEntries(olderThan interval: TimeInterval = 3600) {
        let cutoff = Date().addingTimeInterval(-interval)
        detectedObjects.removeAll { $0.lastSeen < cutoff }
        recentHistory.removeAll { $0.timestamp < cutoff }
        visualAnchors.removeAll { $0.lastSeen < cutoff }
    }
}
