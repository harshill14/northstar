// Agent Types - the three-agent pipeline
export const AgentType = {
  OBSERVER: 'observer',     // Monitors live feed, detects objects
  CONTEXT: 'context',       // Checks schedule/history/memory
  COMMUNICATOR: 'communicator', // Speaks to user in calm voice
};

// Priority levels for messages and alerts
export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// Safety alert types
export const SafetyAlertType = {
  STOVE_ON: 'stoveOn',
  DOOR_OPEN: 'doorOpen',
  MEDICATION_MISSED: 'medicationMissed',
  FALL_DETECTED: 'fallDetected',
  WANDERING: 'wandering',
};

// User emotional state
export const UserState = {
  CALM: 'calm',
  CONFUSED: 'confused',
  ANXIOUS: 'anxious',
  DISTRESSED: 'distressed',
};

// Application mode
export const AppMode = {
  IDLE: 'idle',
  LISTENING: 'listening',
  ASSISTING: 'assisting',
  MONITORING: 'monitoring',
  CAREGIVER_ESCALATION: 'caregiverEscalation',
};

// Factory functions
let _idCounter = 0;
const generateId = () => `${Date.now()}-${++_idCounter}`;

export const createAgentMessage = (agentType, content, priority = Priority.MEDIUM) => ({
  id: generateId(),
  agentType,
  content,
  timestamp: new Date(),
  priority,
});

export const createDetectedObject = (label, confidence, location = null) => ({
  id: generateId(),
  label,
  confidence,
  lastSeen: new Date(),
  location,
});

export const createSafetyAlert = (type, message, requiresEscalation = false) => ({
  id: generateId(),
  type,
  message,
  timestamp: new Date(),
  requiresEscalation,
});

export const createVisualAnchor = (name, category, lastKnownLocation) => ({
  id: generateId(),
  name,
  category,
  lastKnownLocation,
  lastSeen: new Date(),
});
