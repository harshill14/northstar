import {create} from 'zustand';

export type SessionState =
  | 'idle'
  | 'connecting'
  | 'active'
  | 'listening'
  | 'agentSpeaking'
  | 'escalated'
  | 'error';

export type AgentMode = 'assistance' | 'reminiscence' | 'safety';

export interface DetectedObject {
  name: string;
  seenAt: number; // unix ms
}

export interface AgentMessage {
  id: string;
  text: string;
  priority?: 'normal' | 'safety' | 'escalation';
  timestamp: number;
}

interface SessionStore {
  // State
  sessionState: SessionState;
  agentMode: AgentMode;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  framesSent: number;
  isRecording: boolean;
  isEscalated: boolean;
  errorMessage: string;

  // Content
  agentMessages: AgentMessage[];
  currentMessage: AgentMessage | null;
  transcribedText: string;
  detectedObjects: DetectedObject[];
  serverURL: string;

  // Actions
  setSessionState: (s: SessionState) => void;
  setConnectionStatus: (s: SessionStore['connectionStatus']) => void;
  setRecording: (v: boolean) => void;
  setEscalated: (v: boolean) => void;
  setTranscribedText: (t: string) => void;
  incrementFramesSent: () => void;
  pushAgentMessage: (msg: Omit<AgentMessage, 'id' | 'timestamp'>) => void;
  clearCurrentMessage: () => void;
  recordObjectSighting: (name: string) => void;
  setServerURL: (url: string) => void;
  setError: (msg: string) => void;
  reset: () => void;
}

const initialState = {
  sessionState: 'idle' as SessionState,
  agentMode: 'assistance' as AgentMode,
  connectionStatus: 'disconnected' as SessionStore['connectionStatus'],
  framesSent: 0,
  isRecording: false,
  isEscalated: false,
  errorMessage: '',
  agentMessages: [],
  currentMessage: null,
  transcribedText: '',
  detectedObjects: [],
  serverURL: 'ws://192.168.1.100:8765',
};

export const useSessionStore = create<SessionStore>(set => ({
  ...initialState,

  setSessionState: s => set({sessionState: s}),
  setConnectionStatus: s => set({connectionStatus: s}),
  setRecording: v => set({isRecording: v}),
  setEscalated: v => set({isEscalated: v, sessionState: v ? 'escalated' : 'active'}),
  setTranscribedText: t => set({transcribedText: t}),
  incrementFramesSent: () => set(s => ({framesSent: s.framesSent + 1})),
  setServerURL: url => set({serverURL: url}),
  setError: msg => set({errorMessage: msg, sessionState: 'error'}),

  pushAgentMessage: msg => {
    const full: AgentMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };
    set(s => ({
      agentMessages: [full, ...s.agentMessages].slice(0, 50),
      currentMessage: full,
      sessionState: 'agentSpeaking',
    }));
    // Auto-clear after 6 seconds
    setTimeout(() => {
      set(s => {
        if (s.currentMessage?.id === full.id) {
          return {currentMessage: null, sessionState: 'active'};
        }
        return {};
      });
    }, 6000);
  },

  clearCurrentMessage: () => set({currentMessage: null}),

  recordObjectSighting: name => {
    set(s => {
      const existing = s.detectedObjects.findIndex(
        o => o.name.toLowerCase() === name.toLowerCase(),
      );
      const updated = [...s.detectedObjects];
      if (existing >= 0) {
        updated[existing] = {name, seenAt: Date.now()};
      } else {
        updated.push({name, seenAt: Date.now()});
      }
      return {detectedObjects: updated};
    });
  },

  reset: () => set(initialState),
}));
