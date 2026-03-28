import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useOrchestrator } from '../services/AgentOrchestrator';

export default function CaregiverAlertView() {
  const { state, cancelEscalation } = useOrchestrator();
  const [isConnected, setIsConnected] = useState(false);
  const [dots, setDots] = useState('');
  const borderAnim = useRef(new Animated.Value(0.6)).current;

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Pulse border
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(borderAnim, { toValue: 0.6, duration: 500, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Simulate connection after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setIsConnected(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.card, { borderColor: '#E6662A', borderWidth: 3, opacity: borderAnim }]}>
        <View style={[styles.card, { borderWidth: 0 }]}>
          {/* Icon */}
          <Ionicons
            name={isConnected ? 'call' : 'call-outline'}
            size={56}
            color="#fff"
            style={styles.icon}
          />

          {/* Title */}
          <Text style={styles.title}>
            {isConnected
              ? `Connected to ${state.caregiverName}`
              : `Connecting to Caregiver${dots}`}
          </Text>

          {/* Reason */}
          {state.escalationReason !== '' && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Concern Detected</Text>
              <Text style={styles.reasonText}>{state.escalationReason}</Text>
            </View>
          )}

          {/* Status */}
          {isConnected ? (
            <Ionicons name="checkmark-circle" size={40} color="#5ACC73" />
          ) : (
            <ActivityIndicator size="large" color="#fff" />
          )}

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              cancelEscalation();
            }}
            accessibilityLabel="Cancel caregiver alert"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: '#262630',
    borderRadius: 28,
    padding: 32,
    maxWidth: 360,
    width: '85%',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  reasonContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  reasonLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  reasonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
  cancelButton: {
    marginTop: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
