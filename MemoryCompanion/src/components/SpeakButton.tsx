import React, {useCallback} from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  View,
  Platform,
  Vibration,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {Colors, FontSizes, Spacing} from '../theme';
import {PulseRing} from './PulseRing';

interface SpeakButtonProps {
  isListening: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  disabled?: boolean;
}

const BUTTON_SIZE = 130;

export const SpeakButton: React.FC<SpeakButtonProps> = ({
  isListening,
  onPressIn,
  onPressOut,
  disabled,
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(0.94, {damping: 12});
    if (Platform.OS !== 'web') Vibration.vibrate(10);
    onPressIn();
  }, [disabled, onPressIn, scale]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;
    scale.value = withSpring(1, {damping: 12});
    onPressOut();
  }, [disabled, onPressOut, scale]);

  const bgColor = isListening ? Colors.recording : Colors.primary;
  const glowColor = isListening ? Colors.recordingGlow : Colors.primaryGlow;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  return (
    <View style={styles.wrapper}>
      {/* Pulse rings */}
      <PulseRing
        color={isListening ? Colors.recording : Colors.primaryLight}
        size={BUTTON_SIZE}
        active={isListening}
        rings={3}
      />

      {/* Button */}
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}>
        <Animated.View
          style={[
            styles.button,
            {
              backgroundColor: bgColor,
              shadowColor: bgColor,
            },
            animStyle,
          ]}>
          <Text style={styles.icon}>{isListening ? '🎙️' : '🎤'}</Text>
          <Text style={styles.label}>
            {isListening ? 'Listening...' : 'HOLD TO\nSPEAK'}
          </Text>
        </Animated.View>
      </Pressable>

      {/* Subtitle */}
      <Text style={styles.hint}>
        {isListening ? 'Release when done' : 'Ask me anything'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
    gap: 6,
  },
  icon: {
    fontSize: 38,
  },
  label: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: FontSizes.sm * 1.3,
  },
  hint: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontStyle: 'italic',
  },
});
