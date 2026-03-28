import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {Colors, FontSizes, Spacing} from '../theme';

export const ConnectingScreen: React.FC = () => {
  const rotation = useSharedValue(0);
  const dotScale1 = useSharedValue(0.5);
  const dotScale2 = useSharedValue(0.5);
  const dotScale3 = useSharedValue(0.5);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {duration: 1200, easing: Easing.linear}),
      -1,
      false,
    );
    const delay = 200;
    const animate = (sv: typeof dotScale1, d: number) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(1, {duration: 400 - d}),
          withTiming(0.5, {duration: 400 - d}),
        ),
        -1,
        false,
      );
      // Stagger via initial delay hack
      setTimeout(() => {}, d);
    };
    animate(dotScale1, 0);
    setTimeout(() => animate(dotScale2, 0), delay);
    setTimeout(() => animate(dotScale3, 0), delay * 2);
  }, [dotScale1, dotScale2, dotScale3, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  const dot1Style = useAnimatedStyle(() => ({transform: [{scale: dotScale1.value}]}));
  const dot2Style = useAnimatedStyle(() => ({transform: [{scale: dotScale2.value}]}));
  const dot3Style = useAnimatedStyle(() => ({transform: [{scale: dotScale3.value}]}));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.spinner, spinStyle]}>
        <Text style={styles.spinnerEmoji}>🧠</Text>
      </Animated.View>

      <Text style={styles.heading}>Connecting to your helper…</Text>
      <Text style={styles.subheading}>Setting up your agents</Text>

      <View style={styles.dotRow}>
        {[dot1Style, dot2Style, dot3Style].map((s, i) => (
          <Animated.View key={i} style={[styles.dot, s]} />
        ))}
      </View>

      <View style={styles.agentList}>
        {AGENTS.map(a => (
          <View key={a.name} style={styles.agentRow}>
            <Text style={styles.agentIcon}>{a.icon}</Text>
            <View>
              <Text style={styles.agentName}>{a.name}</Text>
              <Text style={styles.agentDesc}>{a.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const AGENTS = [
  {icon: '👁', name: 'Agent A — Observer', desc: 'Watching your camera feed'},
  {icon: '🗂', name: 'Agent B — Context', desc: 'Learning your home & history'},
  {icon: '💬', name: 'Agent C — Communicator', desc: 'Ready to speak with you'},
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  spinner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2,
    borderColor: Colors.primaryLight + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerEmoji: {
    fontSize: 50,
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  subheading: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginTop: -Spacing.sm,
  },
  dotRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryLight,
  },
  agentList: {
    width: '100%',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  agentIcon: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  agentName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  agentDesc: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
