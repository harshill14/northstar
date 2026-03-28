import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, FontSizes, Spacing, Radii, Screen} from '../theme';
import {DEMO_SCENARIOS, DemoScenario} from '../services/demoScenarios';
import {useSessionStore} from '../services/store';
import {ttsService} from '../services/TTSService';

interface DemoPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const DemoPanel: React.FC<DemoPanelProps> = ({visible, onClose}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(Screen.height);
  const backdropOpacity = useSharedValue(0);
  const store = useSessionStore();

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, {duration: 250});
      translateY.value = withSpring(0, {damping: 20, stiffness: 200});
    } else {
      backdropOpacity.value = withTiming(0, {duration: 200});
      translateY.value = withSpring(Screen.height, {damping: 20});
    }
  }, [visible, backdropOpacity, translateY]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const fireScenario = (scenario: DemoScenario) => {
    // Record objects in store
    scenario.objects.forEach(o => store.recordObjectSighting(o));

    // Push agent message
    store.pushAgentMessage({
      text: scenario.agentResponse,
      priority: scenario.priority,
    });

    // Speak it aloud
    ttsService.speak(scenario.agentResponse);

    // Escalation side effect
    if (scenario.priority === 'escalation') {
      store.setEscalated(true);
    }

    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, {paddingBottom: insets.bottom + 16}, sheetStyle]}>
        {/* Handle */}
        <View style={styles.handle} />

        <Text style={styles.title}>Demo Scenarios</Text>
        <Text style={styles.subtitle}>
          Tap any to simulate an agent response
        </Text>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}>
          {DEMO_SCENARIOS.map(scenario => (
            <Pressable
              key={scenario.id}
              style={({pressed}) => [
                styles.scenarioRow,
                pressed && styles.scenarioRowPressed,
                scenario.priority === 'safety' && styles.safetyRow,
                scenario.priority === 'escalation' && styles.escalationRow,
              ]}
              onPress={() => fireScenario(scenario)}>
              <Text style={styles.scenarioEmoji}>{scenario.emoji}</Text>
              <View style={styles.scenarioInfo}>
                <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                <Text style={styles.scenarioPreview} numberOfLines={1}>
                  {scenario.agentResponse}
                </Text>
              </View>
              {scenario.priority !== 'normal' && (
                <View
                  style={[
                    styles.priorityBadge,
                    scenario.priority === 'safety'
                      ? styles.safetyBadge
                      : styles.escalationBadge,
                  ]}>
                  <Text style={styles.priorityBadgeText}>
                    {scenario.priority === 'safety' ? '⚠️' : '📞'}
                  </Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>Close</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: Screen.height * 0.72,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontFamily: 'Georgia-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  listContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scenarioRowPressed: {
    backgroundColor: Colors.border,
  },
  safetyRow: {
    borderColor: Colors.dangerLight + '60',
    backgroundColor: 'rgba(50, 20, 20, 0.8)',
  },
  escalationRow: {
    borderColor: Colors.caregiverLight + '60',
    backgroundColor: 'rgba(50, 30, 10, 0.8)',
  },
  scenarioEmoji: {
    fontSize: 28,
    width: 36,
    textAlign: 'center',
  },
  scenarioInfo: {
    flex: 1,
    gap: 2,
  },
  scenarioTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  scenarioPreview: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    lineHeight: FontSizes.xs * 1.4,
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyBadge: {
    backgroundColor: Colors.dangerGlow,
  },
  escalationBadge: {
    backgroundColor: Colors.caregiverGlow,
  },
  priorityBadgeText: {
    fontSize: 14,
  },
  chevron: {
    color: Colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
  },
  closeBtn: {
    paddingVertical: Spacing.sm + 4,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
});
