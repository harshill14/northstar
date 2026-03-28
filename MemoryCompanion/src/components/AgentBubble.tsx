import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Colors, FontSizes, Spacing, Radii} from '../theme';
import type {AgentMessage} from '../services/store';

interface AgentBubbleProps {
  message: AgentMessage;
}

const priorityColors: Record<string, string> = {
  normal: Colors.primaryLight,
  safety: Colors.danger,
  escalation: Colors.caregiver,
};

export const AgentBubble: React.FC<AgentBubbleProps> = ({message}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    opacity.value = withTiming(1, {duration: 300});
    translateY.value = withSpring(0, {damping: 18, stiffness: 200});
  }, [opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateY: translateY.value}],
  }));

  const accentColor = priorityColors[message.priority ?? 'normal'];

  return (
    <Animated.View style={[styles.container, animStyle]}>
      {/* Agent avatar */}
      <View style={[styles.avatar, {backgroundColor: accentColor + '22', borderColor: accentColor + '66'}]}>
        <Text style={styles.avatarIcon}>🧠</Text>
      </View>

      {/* Bubble */}
      <View style={[styles.bubble, message.priority === 'safety' && styles.bubbleSafety]}>
        {message.priority === 'safety' && (
          <View style={styles.safetyBadge}>
            <Text style={styles.safetyBadgeText}>⚠️ Safety Alert</Text>
          </View>
        )}
        {message.priority === 'escalation' && (
          <View style={[styles.safetyBadge, styles.escalationBadge]}>
            <Text style={styles.safetyBadgeText}>📞 Caregiver Notified</Text>
          </View>
        )}
        <Text style={styles.messageText}>{message.text}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  avatarIcon: {
    fontSize: 22,
  },
  bubble: {
    flex: 1,
    backgroundColor: Colors.agentBubble,
    borderWidth: 1,
    borderColor: Colors.agentBorder,
    borderRadius: Radii.lg,
    borderTopLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.xs,
  },
  bubbleSafety: {
    borderColor: Colors.dangerLight + '80',
    backgroundColor: 'rgba(30, 10, 10, 0.9)',
  },
  safetyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.dangerGlow,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: 4,
  },
  escalationBadge: {
    backgroundColor: Colors.caregiverGlow,
  },
  safetyBadgeText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  messageText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    lineHeight: FontSizes.lg * 1.5,
    fontFamily: 'Georgia',
    fontWeight: '400',
  },
});
