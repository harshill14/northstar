import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';

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

export default function App() {
  const [mode, setMode] = useState('idle');
  const [response, setResponse] = useState('');

  const handleHelp = () => {
    setMode('listening');
    setResponse("I'm listening. Tap a question below.");
  };

  const handleQuery = (query) => {
    setMode('responding');
    setResponse(getResponse(query));
    setTimeout(() => setMode('idle'), 8000);
  };

  const handleStop = () => {
    setMode('idle');
    setResponse('');
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

      {/* Mode indicator */}
      <View style={styles.topBar}>
        <View style={[styles.modePill, { borderColor: buttonColor }]}>
          <View style={[styles.dot, { backgroundColor: buttonColor }]} />
          <Text style={styles.modeText}>{modeLabel}</Text>
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
        {/* Demo query buttons */}
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

        {/* Big help button */}
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

        {/* Stop button */}
        {mode !== 'idle' && (
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Text style={styles.stopText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  topBar: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
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
});
