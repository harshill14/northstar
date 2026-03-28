import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import streaming from './streaming';

// Demo responses - simulating the multi-agent pipeline
const RESPONSES = {
  glasses: 'I saw your glasses on the kitchen counter about 10 minutes ago. Let me guide you there.',
  keys: 'I saw your keys on the hallway table by the front door about 30 minutes ago.',
  phone: 'I saw your phone on the living room couch cushion about 5 minutes ago.',
  who: 'That looks like Margaret, your daughter. She visited you last Tuesday.',
  medicine: '⚠️ For your safety, I\'m confirming with your caregiver before giving medication information.',
  stove: '⚠️ I\'m checking the stove. Alerting your caregiver to confirm everything is safe.',
  default: 'I\'m here to help. Ask me to find something or check if something is safe.',
};

// Queries that trigger caregiver escalation (human-in-the-loop)
const ESCALATION_QUERIES = ['medicine', 'stove'];

const DEMO_QUERIES = [
  { label: '👓 Find Glasses', query: 'glasses' },
  { label: '🔑 Find Keys', query: 'keys' },
  { label: '👤 Who Is This?', query: 'who' },
  { label: '💊 Medication', query: 'medicine' },
  { label: '🔥 Stove Safe?', query: 'stove' },
  { label: '📱 Find Phone', query: 'phone' },
];

function getResponse(query) {
  return RESPONSES[query] || RESPONSES.default;
}

// ─── Caregiver Escalation Overlay ────────────────────────────────
function CaregiverOverlay({ reason, onCancel }) {
  const [connected, setConnected] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    const connectTimer = setTimeout(() => setConnected(true), 3000);
    return () => { clearInterval(dotTimer); clearTimeout(connectTimer); };
  }, []);

  return (
    <View style={styles.overlay}>
      <View style={styles.overlayCard}>
        <Text style={styles.overlayIcon}>{connected ? '📞' : '📲'}</Text>

        <Text style={styles.overlayTitle}>
          {connected ? 'Connected to Dr. Sarah Chen' : `Connecting to Caregiver${dots}`}
        </Text>

        {reason !== '' && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Concern Detected</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        <Text style={styles.overlayStatus}>
          {connected ? '✅ Caregiver is reviewing' : '⏳ Please wait...'}
        </Text>

        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main App ────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState('idle');
  const [response, setResponse] = useState('');
  const [escalation, setEscalation] = useState(null); // null or { reason: string }
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [streamConnected, setStreamConnected] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const cameraRef = useRef(null);

  // Request camera permission on mount
  useEffect(() => {
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, [cameraPermission]);

  // Connect streaming service on mount
  useEffect(() => {
    streaming.onStatusChange = (connected) => setStreamConnected(connected);
    streaming.onResponse = ({ text, audio }) => {
      // When server sends a response, display and speak it
      setResponse(text);
      setMode('responding');
      // TODO: if audio (base64 mp3) is provided, play it directly
      // For now, use local TTS as fallback
      speak(text);
      setTimeout(() => setMode('idle'), 8000);
    };
    streaming.onAlert = ({ message, escalate }) => {
      setResponse(message);
      speak(message);
      if (escalate) {
        setEscalation({ reason: message });
      }
    };
    streaming.connect();

    return () => streaming.disconnect();
  }, []);

  // Start/stop frame streaming when camera is available
  useEffect(() => {
    if (cameraPermission?.granted && streamConnected && Platform.OS !== 'web') {
      streaming.startFrameStreaming(cameraRef);
      // Track frames for UI
      const counter = setInterval(() => {
        setFrameCount(prev => prev + 1);
      }, 1000);
      return () => {
        streaming.stopFrameStreaming();
        clearInterval(counter);
      };
    }
  }, [cameraPermission?.granted, streamConnected]);

  // Speak text in a calm, slow voice for Alzheimer's patients
  const speak = (text) => {
    Speech.stop();
    // Strip emoji before speaking
    const clean = text.replace(/[^\x20-\x7E.,!?'";\s]/g, '').trim();
    if (clean) {
      Speech.speak(clean, {
        language: 'en-US',
        rate: 0.75,   // Slower for clarity
        pitch: 0.95,  // Slightly lower for calmness
      });
    }
  };

  const handleHelp = () => {
    setMode('listening');
    setResponse("I'm listening. Tap a question below.");
    speak("I'm listening. How can I help?");
  };

  const handleQuery = async (query) => {
    setMode('responding');

    // If connected to real server, send query to /speech endpoint
    if (!streaming.isSimulated) {
      setResponse('Thinking...');
      const result = await streaming.sendQuery(query);
      // Response is handled by streaming.onResponse callback
      if (!result) {
        // Server failed, fall back to local response
        const text = getResponse(query);
        setResponse(text);
        speak(text);
      }
    } else {
      // Local simulation mode
      const text = getResponse(query);
      setResponse(text);
      speak(text);
    }

    // Medication & safety queries ALWAYS escalate to caregiver
    if (ESCALATION_QUERIES.includes(query)) {
      setTimeout(() => {
        setEscalation({ reason: getResponse(query) });
      }, 2000);
    } else {
      setTimeout(() => setMode('idle'), 8000);
    }
  };

  const handleStop = () => {
    Speech.stop();
    setMode('idle');
    setResponse('');
    setEscalation(null);
  };

  const handleCancelEscalation = () => {
    setEscalation(null);
    setMode('idle');
    const msg = 'Caregiver alert cancelled. I\'m still here if you need anything.';
    setResponse(msg);
    speak(msg);
    setTimeout(() => { setResponse(''); setMode('idle'); }, 4000);
  };

  const handleManualEscalation = () => {
    setEscalation({ reason: 'Manual caregiver request' });
  };

  const buttonColor =
    mode === 'idle' ? '#5A8ED6' :
    mode === 'listening' ? '#5ABF72' : '#E6A641';

  const buttonLabel =
    mode === 'idle' ? 'Help Me' :
    mode === 'listening' ? 'Listening...' : 'Thinking...';

  const modeLabel =
    mode === 'idle' ? 'Ready' :
    mode === 'listening' ? 'Listening' : 'Assisting';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Live Camera Background */}
      {Platform.OS !== 'web' && cameraPermission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="back"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a1a2e' }]} />
      )}

      {/* Semi-transparent overlay for readability */}
      <View style={styles.cameraOverlay} />

      {/* Top bar: mode indicator + caregiver button */}
      <View style={styles.topBar}>
        <View style={[styles.modePill, { borderColor: buttonColor }]}>
          <View style={[styles.dot, { backgroundColor: buttonColor }]} />
          <Text style={styles.modeText}>{modeLabel}</Text>
        </View>

        <View style={styles.topRight}>
          {/* Streaming status */}
          <View style={styles.streamPill}>
            <View style={[styles.dot, { backgroundColor: streamConnected ? '#5ABF72' : '#D95A5A' }]} />
            <Text style={styles.streamText}>
              {streamConnected ? (streaming.isSimulated ? 'Local' : 'Live') : 'Off'}
            </Text>
          </View>

          <TouchableOpacity style={styles.caregiverBtn} onPress={handleManualEscalation}>
            <Text style={styles.caregiverBtnText}>👩‍⚕️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Response card */}
      {response !== '' && (
        <View style={styles.responseContainer}>
          <View style={styles.responseCard}>
            <Text style={styles.responseText}>{response}</Text>
          </View>
        </View>
      )}

      {/* Bottom area */}
      <View style={styles.bottom}>
        {mode === 'listening' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.queryScroll}>
            {DEMO_QUERIES.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.queryBtn}
                onPress={() => handleQuery(item.query)}
              >
                <Text style={styles.queryText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <TouchableOpacity
          style={[styles.helpButton, { backgroundColor: buttonColor }]}
          onPress={mode === 'idle' ? handleHelp : undefined}
          activeOpacity={mode === 'idle' ? 0.7 : 1}
        >
          <Text style={styles.helpIcon}>
            {mode === 'idle' ? '🤚' : mode === 'listening' ? '🎙️' : '💭'}
          </Text>
          <Text style={styles.helpLabel}>{buttonLabel}</Text>
        </TouchableOpacity>

        {mode !== 'idle' && (
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Text style={styles.stopText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Caregiver Escalation Overlay */}
      {escalation && (
        <CaregiverOverlay
          reason={escalation.reason}
          onCancel={handleCancelEscalation}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  modeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streamText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  caregiverBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 20,
  },
  caregiverBtnText: {
    fontSize: 22,
  },
  responseContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  responseCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    padding: 28,
  },
  responseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 34,
  },
  bottom: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  queryScroll: {
    marginBottom: 20,
    maxHeight: 44,
    paddingHorizontal: 12,
  },
  queryBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  queryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  helpButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  helpIcon: {
    fontSize: 36,
  },
  helpLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  stopBtn: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  stopText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },

  // ─── Caregiver Overlay ───
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayCard: {
    backgroundColor: '#262630',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E6662A',
    padding: 32,
    width: '85%',
    maxWidth: 360,
    alignItems: 'center',
  },
  overlayIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  reasonBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  reasonLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  reasonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  overlayStatus: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 24,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
