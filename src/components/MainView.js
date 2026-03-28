import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useOrchestrator } from '../services/AgentOrchestrator';
import { AppMode } from '../models/AgentModels';
import HelpButton from './HelpButton';
import StatusOverlay from './StatusOverlay';
import CaregiverAlertView from './CaregiverAlertView';
import DemoQueryPanel from './DemoQueryPanel';

const { width, height } = Dimensions.get('window');

export default function MainView() {
  const { state, activateListening, stopSession, escalateToCaregiver } = useOrchestrator();
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const modeConfig = {
    [AppMode.IDLE]: { label: 'Ready', color: '#5A8ED6' },
    [AppMode.LISTENING]: { label: 'Listening', color: '#5ABF72' },
    [AppMode.ASSISTING]: { label: 'Assisting', color: '#E6A641' },
    [AppMode.MONITORING]: { label: 'Watching', color: '#5A8ED6' },
    [AppMode.CAREGIVER_ESCALATION]: { label: 'Escalating', color: '#D95A5A' },
  };

  const currentConfig = modeConfig[state.currentMode] || modeConfig[AppMode.IDLE];

  return (
    <View style={styles.container}>
      {/* Camera Background */}
      {hasPermission ? (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          type={Camera.Constants?.Type?.back ?? 'back'}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.cameraPlaceholder]}>
          <Ionicons name="camera-outline" size={64} color="#ffffff44" />
          <Text style={styles.placeholderText}>
            {hasPermission === null ? 'Requesting camera...' : 'Camera permission needed'}
          </Text>
        </View>
      )}

      {/* Gradient overlay for readability */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      {/* Top Bar */}
      <View style={styles.topBar}>
        {/* Mode Indicator */}
        <View style={styles.modeIndicator}>
          <View style={[styles.modeDot, { backgroundColor: currentConfig.color }]} />
          <Text style={styles.modeLabel}>{currentConfig.label}</Text>
        </View>

        {/* Caregiver Button (discreet) */}
        <TouchableOpacity
          style={styles.caregiverButton}
          onPress={() => escalateToCaregiver('Manual caregiver request')}
          accessibilityLabel="Contact caregiver"
        >
          <Ionicons name="person-circle-outline" size={28} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Status Overlay (detected objects, response text, alerts) */}
      <StatusOverlay />

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Demo Query Buttons (for 3-minute demo without mic) */}
        {state.currentMode === AppMode.LISTENING && <DemoQueryPanel />}

        {/* Help Button */}
        <HelpButton
          currentMode={state.currentMode}
          onPress={() => {
            if (state.currentMode === AppMode.IDLE || state.currentMode === AppMode.MONITORING) {
              activateListening();
            }
          }}
        />

        {/* Stop Button */}
        {state.isSessionActive && state.currentMode !== AppMode.CAREGIVER_ESCALATION && (
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopSession}
            accessibilityLabel="Stop current session"
          >
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Caregiver Escalation Overlay */}
      {state.currentMode === AppMode.CAREGIVER_ESCALATION && <CaregiverAlertView />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraPlaceholder: {
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#ffffff44',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '500',
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 320,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  modeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  modeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  caregiverButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 24,
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  stopButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  stopButtonText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
