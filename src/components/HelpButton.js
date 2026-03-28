import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppMode } from '../models/AgentModels';

const BUTTON_SIZE = 140;

const modeStyles = {
  [AppMode.IDLE]:       { color: '#5A8ED6', icon: 'hand-left',       label: 'Help Me' },
  [AppMode.MONITORING]: { color: '#5A8ED6', icon: 'hand-left',       label: 'Help Me' },
  [AppMode.LISTENING]:  { color: '#5ABF72', icon: 'mic',             label: 'Listening...' },
  [AppMode.ASSISTING]:  { color: '#E6A641', icon: 'ellipsis-horizontal', label: 'Thinking...' },
  [AppMode.CAREGIVER_ESCALATION]: { color: '#D95A5A', icon: 'call', label: 'Alert Sent' },
};

export default function HelpButton({ currentMode, onPress }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const config = modeStyles[currentMode] || modeStyles[AppMode.IDLE];
  const shouldPulse = currentMode === AppMode.IDLE || currentMode === AppMode.MONITORING;

  useEffect(() => {
    if (shouldPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(pulseAnim, { toValue: 1.0, duration: 300, useNativeDriver: true }).start();
    }
  }, [shouldPulse]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: config.color }]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityLabel={`Help Me button. ${config.label}`}
        accessibilityHint="Double tap to ask for help"
      >
        <View style={styles.content}>
          {currentMode === AppMode.ASSISTING ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Ionicons name={config.icon} size={36} color="#fff" />
          )}
          <Text style={styles.label}>{config.label}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
  },
});
