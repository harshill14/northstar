import Foundation
import Combine

/// Manages a persistent collection of visual reference images (anchors) that
/// represent important objects the user may ask about.
@MainActor
final class VisualAnchorStore: ObservableObject {

    // MARK: - Published Properties

    @Published var anchors: [VisualAnchor] = []

    // MARK: - Private

    private let storageURL: URL = {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return documents.appendingPathComponent("visual_anchors.json")
    }()

    // MARK: - Initialization

    init() {
        loadAnchors()
        if anchors.isEmpty {
            populateSampleAnchors()
        }
    }

    // MARK: - CRUD

    /// Adds a new visual anchor.
    func addAnchor(name: String, imageData: Data, category: String, location: String) {
        let anchor = VisualAnchor(
            name: name,
            imageData: imageData,
            category: category,
            lastKnownLocation: location
        )
        anchors.append(anchor)
        saveAnchors()
    }

    /// Simulates matching a captured frame against stored anchors.
    ///
    /// In production this would use Vision framework's `VNFeaturePrintObservation`
    /// to compute image similarity between the frame and each stored anchor,
    /// returning the best match above a confidence threshold.
    func matchAnchor(from frameData: Data) -> VisualAnchor? {
        // Demo: return the first anchor as a simulated match.
        return anchors.first
    }

    // MARK: - Persistence

    func loadAnchors() {
        guard FileManager.default.fileExists(atPath: storageURL.path) else { return }
        do {
            let data = try Data(contentsOf: storageURL)
            anchors = try JSONDecoder().decode([VisualAnchor].self, from: data)
        } catch {
            anchors = []
        }
    }

    func saveAnchors() {
        do {
            let data = try JSONEncoder().encode(anchors)
            try data.write(to: storageURL, options: .atomic)
        } catch {
            // In production: log the persistence failure.
        }
    }

    // MARK: - Sample Data

    /// Pre-populates the store with sample anchors for demo purposes.
    private func populateSampleAnchors() {
        let samples: [(String, String, String)] = [
            ("Reading Glasses", "personal", "kitchen counter"),
            ("House Keys", "personal", "hallway table"),
            ("Wallet", "personal", "bedroom dresser"),
            ("Phone", "personal", "living room couch"),
            ("Medication Bottle", "medical", "bathroom cabinet"),
            ("TV Remote", "household", "living room side table")
        ]

        for (name, category, location) in samples {
            // Use a small placeholder so the model compiles without real images.
            let placeholder = Data(name.utf8)
            let anchor = VisualAnchor(
                name: name,
                imageData: placeholder,
                category: category,
                lastKnownLocation: location,
                lastSeen: Date().addingTimeInterval(-Double.random(in: 300...7200))
            )
            anchors.append(anchor)
        }
        saveAnchors()
    }
}
