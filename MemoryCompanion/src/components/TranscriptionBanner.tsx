import React, {useEffect} from 'react';
import {Text, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {Colors, FontSizes, Spacing, Radii} from '../theme';

interface TranscriptionBannerProps {
  text: string;
  visible: boolean;
}

export const TranscriptionBanner: React.FC<TranscriptionBannerProps> = ({
  text,
  visible,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withTiming(visible && text ? 1 : 0, {duration: 200});
    translateY.value = withTiming(visible && text ? 0 : 10, {duration: 200});
  }, [visible, text, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{translateY: translateY.value}],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Text style={styles.wave}>🎙</Text>
      <Text style={styles.text} numberOfLines={2}>
        {text || '…'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginRight: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: 'rgba(58, 158, 111, 0.88)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
    gap: Spacing.xs,
  },
  wave: {
    fontSize: 16,
  },
  text: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
    fontStyle: 'italic',
    lineHeight: FontSizes.md * 1.4,
  },
});
