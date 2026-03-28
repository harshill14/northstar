import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrchestrator } from '../services/AgentOrchestrator';

export default function StatusOverlay() {
  const { state, dismissAlert } = useOrchestrator();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in response text when it changes
  useEffect(() => {
    if (state.spokenResponse) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [state.spokenResponse]);

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Detected Objects Pills (top) */}
      {state.detectedObjects.length > 0 && (
        <View style={styles.pillsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {state.detectedObjects.slice(0, 6).map((obj) => (
              <View key={obj.id} style={styles.pill}>
                <Text style={styles.pillText}>{obj.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Agent Response Card (center) */}
      {state.spokenResponse !== '' && (
        <View style={styles.responseContainer}>
          <Animated.View style={[styles.responseCard, { opacity: fadeAnim }]}>
            <Text style={styles.responseText}>{state.spokenResponse}</Text>
          </Animated.View>
        </View>
      )}

      {/* Safety Alert Banners (above bottom controls) */}
      {state.safetyAlerts.length > 0 && (
        <View style={styles.alertsContainer}>
          {state.safetyAlerts.slice(0, 3).map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertBanner,
                {
                  backgroundColor: alert.requiresEscalation
                    ? 'rgba(210, 60, 60, 0.9)'
                    : 'rgba(220, 180, 40, 0.9)',
                },
              ]}
            >
              <Ionicons
                name={alert.requiresEscalation ? 'warning' : 'alert-circle'}
                size={22}
                color="#fff"
              />
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.message}
              </Text>
              <TouchableOpacity onPress={() => dismissAlert(alert.id)}>
                <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  // Detected object pills
  pillsContainer: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  pillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  // Response card
  responseContainer: {
    position: 'absolute',
    top: '30%',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  responseCard: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 24,
    padding: 28,
    maxWidth: 340,
  },
  responseText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 34,
  },
  // Alert banners
  alertsContainer: {
    position: 'absolute',
    bottom: 240,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  alertText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
