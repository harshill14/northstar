import Foundation
import Combine

/// Monitors camera frames and query context for safety concerns.
/// Medication-related queries always trigger human-in-the-loop escalation.
@MainActor
final class SafetyMonitor: ObservableObject {

    // MARK: - Published Properties

    @Published var activeAlerts: [SafetyAlert] = []

    // MARK: - Private

    private var frameCount: Int = 0
    private var lastSafetyCheck: Date = Date()

    /// Number of frames between automatic safety checks.
    private let safetyCheckInterval: Int = 60

    // MARK: - Frame Analysis

    /// Analyzes a camera frame for safety hazards.
    ///
    /// In production this would run a CoreML / Vision pipeline to detect
    /// hazards such as a lit stove, open door, or a fall. For the demo we
    /// simulate a stove-on alert after a configurable number of frames.
    func analyzeFrame(_ data: Data) {
        frameCount += 1

        // Periodic safety sweep.
        if frameCount % safetyCheckInterval == 0 {
            checkSafetyConditions()
        }
    }

    // MARK: - Periodic Safety Check

    /// Runs a periodic safety audit. In production this would fuse sensor
    /// data, environmental context, and recent Vision results.
    func checkSafetyConditions() {
        lastSafetyCheck = Date()

        // Demo: after 120 frames (~2 min at 1 fps) simulate a stove alert.
        if frameCount >= 120 && !activeAlerts.contains(where: { $0.type == .stoveOn }) {
            let alert = SafetyAlert(
                type: .stoveOn,
                message: "The stove appears to have been left on. Please check the kitchen.",
                requiresEscalation: true
            )
            activeAlerts.append(alert)
        }
    }

    // MARK: - Escalation Logic

    /// Determines whether a given alert requires caregiver escalation.
    func shouldEscalate(_ alert: SafetyAlert) -> Bool {
        // Medication and fall alerts always escalate.
        switch alert.type {
        case .medicationMissed, .fallDetected:
            return true
        default:
            return alert.requiresEscalation
        }
    }

    // MARK: - Medication Query Escalation

    /// Call this whenever a user query involves medication. Medication queries
    /// **always** require human-in-the-loop confirmation.
    func flagMedicationQuery() -> SafetyAlert {
        let alert = SafetyAlert(
            type: .medicationMissed,
            message: "A medication-related question was asked. Confirming with caregiver before responding.",
            requiresEscalation: true
        )
        activeAlerts.append(alert)
        return alert
    }

    // MARK: - Alert Management

    /// Dismisses (removes) the given alert from the active list.
    func dismissAlert(_ alert: SafetyAlert) {
        activeAlerts.removeAll { $0.id == alert.id }
    }

    /// Clears every active alert.
    func clearAllAlerts() {
        activeAlerts.removeAll()
    }

    /// Resets frame counter and clears alerts.
    func reset() {
        frameCount = 0
        activeAlerts.removeAll()
        lastSafetyCheck = Date()
    }
}
