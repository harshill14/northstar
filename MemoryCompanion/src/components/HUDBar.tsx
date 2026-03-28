import React from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, FontSizes, Spacing, Radii} from '../theme';
import {useSessionStore} from '../services/store';

interface HUDBarProps {
  onStop: () => void;
}

export const HUDBar: React.FC<HUDBarProps> = ({onStop}) => {
  const insets = useSafeAreaInsets();
  const {connectionStatus, framesSent} = useSessionStore();

  const dotColor =
    connectionStatus === 'connected'
      ? Colors.success
      : connectionStatus === 'connecting'
      ? Colors.accent
      : Colors.danger;

  return (
    <View style={[styles.container, {paddingTop: insets.top + 8}]}>
      {/* Connection status */}
      <View style={styles.pill}>
        <View style={[styles.dot, {backgroundColor: dotColor}]} />
        <Text style={styles.pillText}>
          {connectionStatus === 'connected'
            ? 'Live'
            : connectionStatus === 'connecting'
            ? 'Connecting…'
            : 'Offline'}
        </Text>
      </View>

      {/* Frames */}
      <View style={styles.pill}>
        <Text style={styles.pillText}>📡 {framesSent}</Text>
      </View>

      {/* Stop button */}
      <Pressable onPress={onStop} style={styles.stopBtn}>
        <Text style={styles.stopText}>■ END</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  pillText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    fontFamily: 'Courier New',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stopBtn: {
    backgroundColor: 'rgba(201,64,64,0.85)',
    paddingHorizontal: Spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  stopText: {
    color: Colors.white,
    fontSize: FontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
