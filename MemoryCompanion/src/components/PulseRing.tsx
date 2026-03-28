import React, {useEffect} from 'react';
import {View, StyleSheet} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface PulseRingProps {
  color: string;
  size: number;
  active: boolean;
  rings?: number;
}

export const PulseRing: React.FC<PulseRingProps> = ({
  color,
  size,
  active,
  rings = 3,
}) => {
  const animations = Array.from({length: rings}, (_, i) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const progress = useSharedValue(0);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (active) {
        progress.value = withDelay(
          i * 400,
          withRepeat(
            withTiming(1, {duration: 1400, easing: Easing.out(Easing.quad)}),
            -1,
            false,
          ),
        );
      } else {
        progress.value = withTiming(0, {duration: 300});
      }
    }, [active, i, progress]);

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const style = useAnimatedStyle(() => ({
      opacity: interpolate(progress.value, [0, 0.5, 1], [0.7, 0.3, 0]),
      transform: [
        {
          scale: interpolate(progress.value, [0, 1], [1, 1.6]),
        },
      ],
    }));

    return style;
  });

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      {animations.map((animStyle, i) => (
        <Animated.View
          key={i}
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: color,
              borderWidth: 2,
            },
            animStyle,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
});
