/**
 * Memory Companion — Root App
 *
 * Simple state-machine router. No navigation library needed —
 * the app is a single linear flow: Welcome → Connecting → Session.
 *
 * All heavy lifting is in the Zustand store + services.
 */

import React, {useEffect, useCallback} from 'react';
import {StyleSheet, StatusBar, Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {WelcomeScreen} from './src/screens/WelcomeScreen';
import {ConnectingScreen} from './src/screens/ConnectingScreen';
import {SessionScreen} from './src/screens/SessionScreen';
import {useSessionStore} from './src/services/store';
import {wsService} from './src/services/WebSocketService';
import {ttsService} from './src/services/TTSService';
import {speechService} from './src/services/SpeechService';
import {Colors} from './src/theme';

export default function App() {
  const {sessionState, setSessionState, serverURL, reset} = useSessionStore();

  // Init TTS once on mount
  useEffect(() => {
    ttsService.init();
    return () => {
      speechService.destroy();
      wsService.disconnect();
    };
  }, []);

  const handleStart = useCallback(() => {
    setSessionState('connecting');

    // Connect WebSocket
    wsService.connect(serverURL);

    // Simulate connection ramp-up (real connection fires via WS callbacks)
    // If WS connects quickly, onopen sets status = connected immediately.
    // We wait up to 2s before transitioning to session screen.
    setTimeout(() => {
      setSessionState('active');
    }, 2000);
  }, [serverURL, setSessionState]);

  const handleStop = useCallback(() => {
    wsService.disconnect();
    speechService.stop();
    ttsService.stop();
    reset();
    // sessionState resets to 'idle' via reset()
  }, [reset]);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={Colors.bg}
          translucent={Platform.OS === 'android'}
        />

        {sessionState === 'idle' && (
          <WelcomeScreen onStart={handleStart} />
        )}

        {sessionState === 'connecting' && (
          <ConnectingScreen />
        )}

        {(sessionState === 'active' ||
          sessionState === 'listening' ||
          sessionState === 'agentSpeaking' ||
          sessionState === 'escalated') && (
          <SessionScreen onStop={handleStop} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
