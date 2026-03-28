/**
 * SafetyMonitor - Monitors for safety concerns.
 * Medication queries ALWAYS trigger human-in-the-loop escalation.
 * Hallucinations are dangerous - never give AI-only medication answers.
 */
import { SafetyAlertType, createSafetyAlert } from '../models/AgentModels';

class SafetyMonitor {
  constructor() {
    this.activeAlerts = [];
    this.frameCount = 0;
  }

  /**
   * Analyze a camera frame for safety hazards.
   * In production: CoreML/Vision pipeline for stove, falls, etc.
   */
  analyzeFrame() {
    this.frameCount++;

    // Demo: after ~2 minutes simulate a stove alert
    if (this.frameCount >= 120 && !this.activeAlerts.find((a) => a.type === SafetyAlertType.STOVE_ON)) {
      const alert = createSafetyAlert(
        SafetyAlertType.STOVE_ON,
        'The stove appears to have been left on. Please check the kitchen.',
        true
      );
      this.activeAlerts.push(alert);
      return alert;
    }
    return null;
  }

  /**
   * Flag a medication query - ALWAYS requires human-in-the-loop.
   * This is critical: AI hallucinations about medication are life-threatening.
   */
  flagMedicationQuery() {
    const alert = createSafetyAlert(
      SafetyAlertType.MEDICATION_MISSED,
      'A medication-related question was asked. Confirming with caregiver before responding.',
      true
    );
    this.activeAlerts.push(alert);
    return alert;
  }

  /**
   * Check if an alert requires caregiver escalation.
   */
  shouldEscalate(alert) {
    if (alert.type === SafetyAlertType.MEDICATION_MISSED || alert.type === SafetyAlertType.FALL_DETECTED) {
      return true;
    }
    return alert.requiresEscalation;
  }

  /**
   * Dismiss a specific alert.
   */
  dismissAlert(alertId) {
    this.activeAlerts = this.activeAlerts.filter((a) => a.id !== alertId);
  }

  /**
   * Reset all state.
   */
  reset() {
    this.activeAlerts = [];
    this.frameCount = 0;
  }
}

export default new SafetyMonitor();
