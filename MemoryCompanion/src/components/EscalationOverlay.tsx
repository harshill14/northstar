import React, {useEffect} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, FontSizes, Spacing, Radii} from '../theme';
import {useSessionStore} from '../services/store';
import {wsService} from '../services/WebSocketService';
import {ttsService} from '../services/TTSService';

export const EscalationOverlay: React.FC = () => {
  const insets = useSafeAreaInsets();
  const store = useSessionStore();
  const pulseScale = useSharedValue(1);
  const iconOpacity = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.15, {duration: 700}),
        withTiming(1, {duration: 700}),
      ),
      -1,
      false,
    );
    iconOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, {duration: 600}),
        withTiming(1, {duration: 600}),
      ),
      -1,
      false,
    );

    // Send WS event
    wsService.sendEvent('caregiver_escalation', {priority: 'high'});

    // Speak aloud
    ttsService.speak(
      "I'm connecting you with your caregiver right now. Please stay calm. Someone who cares about you will be with you very soon.",
    );
  }, [iconOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulseScale.value}],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
  }));

  const dismiss = () => {
    store.setEscalated(false);
    store.pushAgentMessage({
      text: 'Your caregiver has been notified and is on their way. I\'m still right here with you.',
      priority: 'normal',
    });
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={[styles.content, {paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40}]}>

        {/* Pulsing icon */}
        <Animated.View style={[styles.iconRing, pulseStyle]}>
          <Animated.Text style={[styles.icon, iconStyle]}>📞</Animated.Text>
        </Animated.View>

        <Text style={styles.heading}>Caregiver Notified</Text>
        <Text style={styles.body}>
          Someone who cares about you has been alerted and is coming to help.
          {'\n\n'}
          You are safe. I am still here with you.
        </Text>

        {/* Status indicators */}
        <View style={styles.statusRow}>
          <StatusItem icon="✅" label="Alert Sent" />
          <StatusItem icon="📱" label="SMS Delivered" />
          <StatusItem icon="🏠" label="Location Shared" />
        </View>

        {/* Dismiss */}
        <Pressable onPress={dismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>I'm OK — Continue</Text>
        </Pressable>
      </View>
    </View>
  );
};

const StatusItem: React.FC<{icon: string; label: string}> = ({icon, label}) => (
  <View style={styles.statusItem}>
    <Text style={styles.statusIcon}>{icon}</Text>
    <Text style={styles.statusLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(10, 6, 4, 0.93)',
    zIndex: 100,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  iconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.caregiverGlow,
    borderWidth: 2,
    borderColor: Colors.caregiverLight + '80',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 56,
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontFamily: 'Georgia-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: Colors.textSecondary,
    fontSize: FontSizes.lg,
    textAlign: 'center',
    lineHeight: FontSizes.lg * 1.6,
    fontFamily: 'Georgia',
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  statusItem: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusIcon: {
    fontSize: 22,
  },
  statusLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  dismissBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.caregiver,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.xl,
    shadowColor: Colors.caregiver,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  dismissText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
