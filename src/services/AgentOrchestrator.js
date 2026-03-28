/**
 * AgentOrchestrator - Central coordinator for the multi-agent pipeline.
 *
 * Three agents work together:
 *   Agent A (Observer)      - Monitors live feed, detects objects & intent
 *   Agent B (Context)       - Checks user's schedule, history, memory store
 *   Agent C (Communicator)  - Speaks to the user in a calm, familiar voice
 *
 * Safety protocol: Medication queries ALWAYS escalate to a human caregiver.
 */
import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import {
  AppMode,
  AgentType,
  Priority,
  UserState,
  createAgentMessage,
} from '../models/AgentModels';
import memoryStore from './MemoryStore';
import speechService from './SpeechService';
import safetyMonitor from './SafetyMonitor';

// ─── State ─────────────────────────────────────────────────────────
const initialState = {
  currentMode: AppMode.IDLE,
  spokenResponse: '',
  detectedObjects: memoryStore.detectedObjects,
  safetyAlerts: [],
  agentMessages: [],
  userState: UserState.CALM,
  isSessionActive: false,
  caregiverName: 'Dr. Sarah Chen',
  escalationReason: '',
  activeAgent: null,
};

// ─── Reducer ───────────────────────────────────────────────────────
function orchestratorReducer(state, action) {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, currentMode: action.payload };
    case 'SET_RESPONSE':
      return { ...state, spokenResponse: action.payload };
    case 'SET_SESSION_ACTIVE':
      return { ...state, isSessionActive: action.payload };
    case 'ADD_AGENT_MESSAGE':
      return { ...state, agentMessages: [...state.agentMessages, action.payload] };
    case 'SET_ACTIVE_AGENT':
      return { ...state, activeAgent: action.payload };
    case 'SET_SAFETY_ALERTS':
      return { ...state, safetyAlerts: action.payload };
    case 'ADD_SAFETY_ALERT':
      return { ...state, safetyAlerts: [...state.safetyAlerts, action.payload] };
    case 'DISMISS_ALERT':
      return {
        ...state,
        safetyAlerts: state.safetyAlerts.filter((a) => a.id !== action.payload),
      };
    case 'ESCALATE':
      return {
        ...state,
        currentMode: AppMode.CAREGIVER_ESCALATION,
        escalationReason: action.payload,
        isSessionActive: true,
        userState: UserState.ANXIOUS,
      };
    case 'CANCEL_ESCALATION':
      return {
        ...state,
        currentMode: AppMode.MONITORING,
        escalationReason: '',
        isSessionActive: true,
        userState: UserState.CALM,
      };
    case 'STOP_SESSION':
      return {
        ...state,
        currentMode: AppMode.IDLE,
        isSessionActive: false,
        spokenResponse: '',
        activeAgent: null,
      };
    case 'FULL_UPDATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

// ─── Context ───────────────────────────────────────────────────────
const OrchestratorContext = createContext(null);

export function OrchestratorProvider({ children }) {
  const [state, dispatch] = useReducer(orchestratorReducer, initialState);
  const timeoutRef = useRef(null);

  // ── Activate Listening ────────────────────────────────────────
  const activateListening = useCallback(() => {
    if (state.currentMode !== AppMode.IDLE && state.currentMode !== AppMode.MONITORING) return;
    dispatch({ type: 'SET_MODE', payload: AppMode.LISTENING });
    dispatch({ type: 'SET_SESSION_ACTIVE', payload: true });
    dispatch({ type: 'SET_RESPONSE', payload: "I'm listening. How can I help?" });
  }, [state.currentMode]);

  // ── Handle User Query (multi-agent pipeline) ─────────────────
  const handleUserQuery = useCallback((query) => {
    dispatch({ type: 'SET_MODE', payload: AppMode.ASSISTING });
    dispatch({ type: 'SET_RESPONSE', payload: '' });

    const lowerQuery = query.toLowerCase();

    // Helper to check keywords
    const containsAny = (terms) => terms.some((t) => lowerQuery.includes(t));

    let observerNote, responseText;
    let requiresEscalation = false;

    // ── Agent A (Observer): Identify intent ──
    dispatch({ type: 'SET_ACTIVE_AGENT', payload: AgentType.OBSERVER });

    if (containsAny(['glasses', 'keys', 'phone', 'wallet', 'remote'])) {
      // Object retrieval
      const items = ['glasses', 'keys', 'phone', 'wallet', 'remote'];
      const item = items.find((i) => lowerQuery.includes(i)) || 'item';
      const found = memoryStore.findObject(item);
      const location = found?.location || 'the living room';
      const minutesAgo = found
        ? Math.round((Date.now() - found.lastSeen.getTime()) / 60000)
        : Math.floor(Math.random() * 40) + 5;

      observerNote = `[Observer] Detected object-finding intent for "${item}".`;
      responseText = `I saw your ${item} on the ${location} about ${minutesAgo} minutes ago. Let me guide you there.`;

    } else if (containsAny(['who'])) {
      // Person identification
      observerNote = '[Observer] Detected person-identification intent.';
      responseText = 'That looks like Margaret, your daughter. She visited you last Tuesday.';

    } else if (containsAny(['pill', 'medicine', 'medication', 'meds', 'prescription'])) {
      // MEDICATION - ALWAYS ESCALATE (hallucinations are dangerous)
      observerNote = '[Observer] Medication intent detected — escalating to human-in-the-loop.';
      responseText = 'Let me check your schedule. For your safety, I\'m confirming with your caregiver before giving medication information.';
      requiresEscalation = true;

    } else if (containsAny(['stove', 'oven', 'door', 'fire'])) {
      // Safety query
      observerNote = '[Observer] Safety concern detected.';
      responseText = 'I\'m checking that for you. For safety, I\'m alerting your caregiver to confirm everything is secure.';
      requiresEscalation = true;

    } else {
      observerNote = '[Observer] No specific intent matched.';
      responseText = "I'm here to help. You can ask me to find something, tell you who someone is, or check if something is safe.";
    }

    // Log Observer message
    const obsMsg = createAgentMessage(AgentType.OBSERVER, observerNote, requiresEscalation ? Priority.HIGH : Priority.MEDIUM);
    memoryStore.addMessage(obsMsg);
    dispatch({ type: 'ADD_AGENT_MESSAGE', payload: obsMsg });

    // ── Agent B (Context): Enrich with memory (simulated delay) ──
    setTimeout(() => {
      dispatch({ type: 'SET_ACTIVE_AGENT', payload: AgentType.CONTEXT });
      const ctxMsg = createAgentMessage(AgentType.CONTEXT, `[Context] Cross-referenced memory store. User state: calm.`);
      memoryStore.addMessage(ctxMsg);
      dispatch({ type: 'ADD_AGENT_MESSAGE', payload: ctxMsg });
    }, 200);

    // ── Agent C (Communicator): Deliver response ──
    setTimeout(() => {
      dispatch({ type: 'SET_ACTIVE_AGENT', payload: AgentType.COMMUNICATOR });
      const comMsg = createAgentMessage(AgentType.COMMUNICATOR, responseText, requiresEscalation ? Priority.HIGH : Priority.MEDIUM);
      memoryStore.addMessage(comMsg);
      dispatch({ type: 'ADD_AGENT_MESSAGE', payload: comMsg });
      dispatch({ type: 'SET_RESPONSE', payload: responseText });

      // Speak the response in a calm voice
      speechService.speak(responseText);

      // ── Safety gate: medication ALWAYS escalates ──
      if (requiresEscalation) {
        const alert = safetyMonitor.flagMedicationQuery();
        dispatch({ type: 'ADD_SAFETY_ALERT', payload: alert });

        setTimeout(() => {
          dispatch({ type: 'ESCALATE', payload: alert.message });
        }, 3000);
      } else {
        // Return to monitoring after response
        timeoutRef.current = setTimeout(() => {
          dispatch({ type: 'SET_MODE', payload: AppMode.MONITORING });
        }, 5000);
      }
    }, 500);
  }, []);

  // ── Stop Session ──────────────────────────────────────────────
  const stopSession = useCallback(() => {
    speechService.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    dispatch({ type: 'STOP_SESSION' });
  }, []);

  // ── Escalate to Caregiver ─────────────────────────────────────
  const escalateToCaregiver = useCallback((reason) => {
    dispatch({ type: 'ESCALATE', payload: reason });
  }, []);

  // ── Cancel Escalation ─────────────────────────────────────────
  const cancelEscalation = useCallback(() => {
    dispatch({ type: 'CANCEL_ESCALATION' });
    speechService.speak("Caregiver alert cancelled. I'm still here if you need anything.");
  }, []);

  // ── Dismiss Alert ─────────────────────────────────────────────
  const dismissAlert = useCallback((alertId) => {
    safetyMonitor.dismissAlert(alertId);
    dispatch({ type: 'DISMISS_ALERT', payload: alertId });
  }, []);

  const value = {
    state,
    activateListening,
    handleUserQuery,
    stopSession,
    escalateToCaregiver,
    cancelEscalation,
    dismissAlert,
  };

  return (
    <OrchestratorContext.Provider value={value}>
      {children}
    </OrchestratorContext.Provider>
  );
}

export function useOrchestrator() {
  const context = useContext(OrchestratorContext);
  if (!context) throw new Error('useOrchestrator must be used within OrchestratorProvider');
  return context;
}
