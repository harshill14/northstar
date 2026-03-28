import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView,
  Platform, Animated, Dimensions,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import streaming from './streaming';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper: read a local file URI as base64
async function readFileAsBase64(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Format current time for display
function formatTime() {
  const now = new Date();
  const hours = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${mins} ${ampm}`;
}

function formatDate() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

// Demo responses for local simulation
const RESPONSES = {
  glasses: 'I saw your glasses on the kitchen counter about 10 minutes ago. Let me guide you there.',
  keys: 'I saw your keys on the hallway table by the front door about 30 minutes ago.',
  phone: 'I saw your phone on the living room couch cushion about 5 minutes ago.',
  who: 'That looks like Margaret, your daughter. She visited you last Tuesday.',
  medicine: 'For your safety, I\'m confirming with your caregiver before giving medication information.',
  stove: 'I\'m checking the stove. Alerting your caregiver to confirm everything is safe.',
  default: 'I\'m here to help. Ask me to find something or check if something is safe.',
};

const ESCALATION_QUERIES = ['medicine', 'stove'];

const DEMO_QUERIES = [
  { label: '👓 Glasses', query: 'glasses', speech: 'Where are my glasses?' },
  { label: '🔑 Keys', query: 'keys', speech: 'Where are my keys?' },
  { label: '👤 Who?', query: 'who', speech: 'Who is in front of me?' },
  { label: '💊 Meds', query: 'medicine', speech: 'Did I take my medication?' },
  { label: '📱 Phone', query: 'phone', speech: 'Where is my phone?' },
];

function getResponse(query) {
  return RESPONSES[query] || RESPONSES.default;
}

// Auto-timeout for recording (seconds)
const RECORDING_TIMEOUT = 15;

// ─── Pulsing Dot Component ───────────────────────────────────────
function PulsingDot({ color, size = 10 }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.8, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, transform: [{ scale: anim }], opacity: 0.6,
        position: 'absolute',
      }} />
      <View style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: color,
      }} />
    </View>
  );
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
            <Text style={styles.reasonLabel}>Concern</Text>
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
  const [transcription, setTranscription] = useState('');
  const [escalation, setEscalation] = useState(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [streamConnected, setStreamConnected] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(formatTime());
  const [conversationHistory, setConversationHistory] = useState([]);
  const cameraRef = useRef(null);
  const recordingTimer = useRef(null);
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Update clock every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(formatTime()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Welcome message on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      speak("Hello! I'm here to help you. Just tap the big button whenever you need me.");
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Pulse button animation
  useEffect(() => {
    if (mode === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonScale, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
          Animated.timing(buttonScale, { toValue: 1.0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      buttonScale.setValue(1.0);
    }
  }, [mode]);

  // Camera permission
  useEffect(() => {
    if (!cameraPermission?.granted) requestCameraPermission();
  }, [cameraPermission]);

  // Streaming service
  useEffect(() => {
    streaming.onStatusChange = (connected) => setStreamConnected(connected);
    streaming.onResponse = ({ text }) => {
      setResponse(text);
      setMode('responding');
      addToHistory('assistant', text);
      speak(text);
      setTimeout(() => setMode('idle'), 10000);
    };
    streaming.onAlert = ({ message, escalate }) => {
      setResponse(message);
      addToHistory('alert', message);
      speak(message);
      if (escalate) setEscalation({ reason: message });
    };
    streaming.connect();
    return () => streaming.disconnect();
  }, []);

  // Frame streaming
  useEffect(() => {
    if (cameraPermission?.granted && streamConnected && Platform.OS !== 'web') {
      streaming.startFrameStreaming(cameraRef);
      return () => streaming.stopFrameStreaming();
    }
  }, [cameraPermission?.granted, streamConnected]);

  // Recording auto-timeout
  useEffect(() => {
    if (recording) {
      setRecordingSeconds(0);
      recordingTimer.current = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= RECORDING_TIMEOUT - 1) {
            stopRecordingAndSend();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
      return () => clearInterval(recordingTimer.current);
    } else {
      setRecordingSeconds(0);
    }
  }, [recording]);

  // ─── Helpers ────────────────────────────────────────────────────
  const addToHistory = (role, text) => {
    setConversationHistory(prev => [...prev.slice(-4), { role, text, time: formatTime() }]);
  };

  const speak = (text) => {
    Speech.stop();
    const clean = text.replace(/[^\x20-\x7E.,!?'";\s]/g, '').trim();
    if (clean) {
      Speech.speak(clean, { language: 'en-US', rate: 0.75, pitch: 0.95 });
    }
  };

  // ─── Voice Recording ───────────────────────────────────────────
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        speak("I need microphone permission to listen to you.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setMode('listening');
      setTranscription('');
      setResponse("I'm listening... speak your question, then tap the button.");
    } catch (e) {
      console.log('Failed to start recording:', e);
      setMode('listening');
      setResponse("Tap a question below, or try the microphone again.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recording) return;
    clearInterval(recordingTimer.current);

    setMode('responding');
    setResponse('');
    setTranscription('Processing your question...');

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!streaming.isSimulated && uri) {
        const base64Audio = await readFileAsBase64(uri);
        const res = await fetch(streaming.serverUrl + '/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio }),
        });
        const data = await res.json();

        if (data.transcription) {
          setTranscription(data.transcription);
          addToHistory('user', data.transcription);
        }

        if (data.response) {
          setResponse(data.response);
          addToHistory('assistant', data.response);
          speak(data.response);
          setTimeout(() => setMode('idle'), 10000);
        } else {
          setResponse("I didn't quite catch that. Could you try again?");
          speak("I didn't quite catch that. Could you try again?");
          setTimeout(() => setMode('idle'), 4000);
        }
      } else {
        setTranscription('');
        setResponse("Voice needs a server connection. Try the quick buttons.");
        speak("Voice needs a server connection. Try the quick buttons.");
        setMode('listening');
      }
    } catch (e) {
      console.log('Failed to process recording:', e);
      setTranscription('');
      setResponse("Something went wrong. Let's try again.");
      speak("Something went wrong. Let's try again.");
      setRecording(null);
      setTimeout(() => setMode('idle'), 4000);
    }
  };

  const handleHelp = () => {
    if (mode === 'listening' && recording) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  };

  const handleQuery = async (query, speechText) => {
    setMode('responding');
    setTranscription(speechText || query);
    addToHistory('user', speechText || query);

    if (!streaming.isSimulated) {
      setResponse('');
      const result = await streaming.sendQuery(speechText || query);
      if (!result) {
        const text = getResponse(query);
        setResponse(text);
        addToHistory('assistant', text);
        speak(text);
      }
    } else {
      const text = getResponse(query);
      setResponse(text);
      addToHistory('assistant', text);
      speak(text);
    }

    if (ESCALATION_QUERIES.includes(query)) {
      setTimeout(() => setEscalation({ reason: getResponse(query) }), 2000);
    } else {
      setTimeout(() => setMode('idle'), 8000);
    }
  };

  const handleStop = async () => {
    Speech.stop();
    if (recording) {
      try { await recording.stopAndUnloadAsync(); } catch {}
      setRecording(null);
    }
    clearInterval(recordingTimer.current);
    setMode('idle');
    setResponse('');
    setTranscription('');
    setEscalation(null);
  };

  const handleCancelEscalation = () => {
    setEscalation(null);
    setMode('idle');
    const msg = 'Caregiver alert cancelled. I\'m still here.';
    setResponse(msg);
    speak(msg);
    setTimeout(() => { setResponse(''); setMode('idle'); }, 4000);
  };

  // ─── Computed UI values ─────────────────────────────────────────
  const isRecording = mode === 'listening' && recording;

  const buttonColor =
    mode === 'idle' ? '#5A8ED6' :
    isRecording ? '#E85A5A' :
    mode === 'listening' ? '#5ABF72' : '#E6A641';

  const buttonLabel =
    mode === 'idle' ? 'Talk to Me' :
    isRecording ? 'Send' :
    mode === 'listening' ? 'Listening...' : 'Thinking...';

  const buttonIcon =
    mode === 'idle' ? '🎙️' :
    isRecording ? '⏹️' :
    mode === 'listening' ? '🎙️' : '💭';

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Camera Background */}
      {Platform.OS !== 'web' && cameraPermission?.granted ? (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.fallbackBg]} />
      )}
      <View style={styles.cameraOverlay} />

      {/* ─── Header ─── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>NorthStar</Text>
          <Text style={styles.timeText}>{currentTime} · {formatDate()}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.streamPill}>
            <View style={[styles.dot, { backgroundColor: streamConnected ? '#5ABF72' : '#E85A5A' }]} />
            <Text style={styles.streamText}>
              {streamConnected ? (streaming.isSimulated ? 'Local' : 'Live') : 'Off'}
            </Text>
          </View>
          <TouchableOpacity style={styles.emergencyBtn} onPress={() => setEscalation({ reason: 'Manual request' })}>
            <Text style={styles.emergencyBtnText}>🆘</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Conversation Area ─── */}
      <View style={styles.conversationArea}>
        {/* Previous messages */}
        {conversationHistory.length > 0 && mode === 'idle' && !response && (
          <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
            {conversationHistory.map((msg, i) => (
              <View key={i} style={[styles.historyBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble
              ]}>
                <Text style={styles.historyRole}>
                  {msg.role === 'user' ? 'You' : msg.role === 'alert' ? '⚠️ Alert' : 'NorthStar'}
                  {' · '}{msg.time}
                </Text>
                <Text style={styles.historyText}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Transcription (what user said) */}
        {transcription !== '' && (
          <View style={styles.transcriptionCard}>
            <Text style={styles.transcriptionLabel}>You said:</Text>
            <Text style={styles.transcriptionText}>"{transcription}"</Text>
          </View>
        )}

        {/* Response card */}
        {response !== '' && (
          <View style={styles.responseCard}>
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <PulsingDot color="#E85A5A" size={8} />
                <Text style={styles.recordingTime}>{recordingSeconds}s / {RECORDING_TIMEOUT}s</Text>
              </View>
            )}
            <Text style={styles.responseText}>{response}</Text>
          </View>
        )}

        {/* Idle state — show a gentle prompt */}
        {mode === 'idle' && !response && conversationHistory.length === 0 && (
          <View style={styles.idlePrompt}>
            <Text style={styles.idleEmoji}>👋</Text>
            <Text style={styles.idleText}>Tap the button below{'\n'}whenever you need help</Text>
          </View>
        )}
      </View>

      {/* ─── Bottom Controls ─── */}
      <View style={styles.bottom}>
        {/* Quick query buttons */}
        {mode === 'listening' && !recording && (
          <View style={styles.queryRow}>
            <Text style={styles.queryHint}>Or tap a quick question:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DEMO_QUERIES.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.queryBtn}
                  onPress={() => handleQuery(item.query, item.speech)}
                >
                  <Text style={styles.queryText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Main button */}
        <Animated.View style={{ transform: [{ scale: mode === 'idle' ? buttonScale : 1 }] }}>
          <TouchableOpacity
            style={[styles.helpButton, { backgroundColor: buttonColor }]}
            onPress={(mode === 'idle' || isRecording) ? handleHelp : undefined}
            activeOpacity={(mode === 'idle' || isRecording) ? 0.7 : 1}
          >
            <Text style={styles.helpIcon}>{buttonIcon}</Text>
            <Text style={styles.helpLabel}>{buttonLabel}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stop button */}
        {mode !== 'idle' && (
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Text style={styles.stopText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Caregiver Overlay */}
      {escalation && (
        <CaregiverOverlay reason={escalation.reason} onCancel={handleCancelEscalation} />
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fallbackBg: {
    backgroundColor: '#0f1a2e',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 24,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  timeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  streamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  streamText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  emergencyBtn: {
    backgroundColor: 'rgba(255,70,70,0.2)',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,70,70,0.3)',
  },
  emergencyBtnText: {
    fontSize: 20,
  },

  // Conversation area
  conversationArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  historyScroll: {
    flex: 1,
    marginTop: 8,
  },
  historyBubble: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
    maxWidth: '90%',
  },
  userBubble: {
    backgroundColor: 'rgba(90,142,214,0.25)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
  },
  historyRole: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  transcriptionCard: {
    backgroundColor: 'rgba(90,142,214,0.2)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,142,214,0.3)',
  },
  transcriptionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 26,
  },
  responseCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  recordingTime: {
    color: '#E85A5A',
    fontSize: 13,
    fontWeight: '600',
  },
  responseText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 32,
  },
  idlePrompt: {
    alignItems: 'center',
  },
  idleEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  idleText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 20,
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '500',
  },

  // Bottom controls
  bottom: {
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    alignItems: 'center',
  },
  queryRow: {
    marginBottom: 16,
    alignItems: 'center',
  },
  queryHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  queryBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  queryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  helpButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  helpIcon: {
    fontSize: 40,
  },
  helpLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  stopBtn: {
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stopText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },

  // Caregiver Overlay
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayCard: {
    backgroundColor: '#1c1c28',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E6662A',
    padding: 32,
    width: '88%',
    maxWidth: 380,
    alignItems: 'center',
  },
  overlayIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 32,
  },
  reasonBox: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(230,102,42,0.1)',
    padding: 16,
    borderRadius: 16,
    width: '100%',
  },
  reasonLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
