import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, FontSizes, Spacing, Radii, Shadows} from '../theme';
import {useSessionStore} from '../services/store';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({onStart}) => {
  const insets = useSafeAreaInsets();
  const {serverURL, setServerURL} = useSessionStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Entrance animations
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(40);
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(30);
  const btnOpacity = useSharedValue(0);
  const btnScale = useSharedValue(0.88);

  useEffect(() => {
    logoOpacity.value = withDelay(200, withTiming(1, {duration: 700}));
    logoY.value = withDelay(200, withSpring(0, {damping: 14}));
    cardOpacity.value = withDelay(500, withTiming(1, {duration: 600}));
    cardY.value = withDelay(500, withSpring(0, {damping: 14}));
    btnOpacity.value = withDelay(800, withTiming(1, {duration: 500}));
    btnScale.value = withDelay(800, withSpring(1, {damping: 12, stiffness: 180}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{translateY: logoY.value}],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{translateY: cardY.value}],
  }));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{scale: btnScale.value}],
  }));

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32},
        ]}
        keyboardShouldPersistTaps="handled">

        {/* Logo + branding */}
        <Animated.View style={[styles.logoSection, logoStyle]}>
          <View style={styles.logoRing}>
            <Text style={styles.logoEmoji}>🧠</Text>
          </View>
          <Text style={styles.appName}>Memory Companion</Text>
          <Text style={styles.tagline}>Your patient, caring AI helper</Text>
        </Animated.View>

        {/* Feature cards */}
        <Animated.View style={[styles.featureGrid, cardStyle]}>
          {FEATURES.map(f => (
            <View key={f.label} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Start button */}
        <Animated.View style={btnStyle}>
          <Pressable
            onPress={onStart}
            style={({pressed}) => [styles.startBtn, pressed && styles.startBtnPressed]}>
            <Text style={styles.startBtnText}>▶  START</Text>
          </Pressable>
        </Animated.View>

        {/* Advanced settings toggle */}
        <Pressable
          onPress={() => setShowAdvanced(v => !v)}
          style={styles.advancedToggle}>
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? '▲ Hide' : '⚙️ Server Settings'}
          </Text>
        </Pressable>

        {showAdvanced && (
          <View style={styles.advancedCard}>
            <Text style={styles.advancedLabel}>WebSocket Server URL</Text>
            <TextInput
              style={styles.urlInput}
              value={serverURL}
              onChangeText={setServerURL}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="ws://192.168.x.x:8765"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.advancedHint}>
              Find your Mac's IP in System Settings → Wi-Fi → Details
            </Text>
          </View>
        )}

        {/* Ethics notice */}
        <View style={styles.ethicsCard}>
          <Text style={styles.ethicsTitle}>🔒 Privacy & Consent</Text>
          <Text style={styles.ethicsBody}>
            By starting, you confirm that informed consent has been obtained per
            the Mental Capacity Act or equivalent local law. Camera footage is
            streamed only to your private agent server and is never stored on
            disk.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const FEATURES = [
  {icon: '🔍', label: 'Find Objects'},
  {icon: '🔥', label: 'Safety Alerts'},
  {icon: '👤', label: 'Who Is This?'},
  {icon: '📞', label: 'Caregiver Alert'},
  {icon: '🎵', label: 'Calm Mode'},
  {icon: '💊', label: 'Med Reminders'},
];

const styles = StyleSheet.create({
  flex: {flex: 1, backgroundColor: Colors.bg},
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  logoRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2,
    borderColor: Colors.primaryLight + '60',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  logoEmoji: {
    fontSize: 58,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xxl,
    fontFamily: 'Georgia-Bold',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  featureCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxxl,
    paddingVertical: Spacing.lg,
    borderRadius: Radii.xl,
    minWidth: 260,
    alignItems: 'center',
    ...Shadows.primary,
  },
  startBtnPressed: {
    backgroundColor: Colors.primaryDark,
  },
  startBtnText: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: '900',
    letterSpacing: 2,
  },
  advancedToggle: {
    paddingVertical: Spacing.xs,
  },
  advancedToggleText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  advancedCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  advancedLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  urlInput: {
    backgroundColor: Colors.surfaceLight,
    color: Colors.textPrimary,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSizes.md,
    fontFamily: 'Courier New',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  advancedHint: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontStyle: 'italic',
  },
  ethicsCard: {
    width: '100%',
    backgroundColor: 'rgba(59,77,184,0.08)',
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  ethicsTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  ethicsBody: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    lineHeight: FontSizes.xs * 1.6,
  },
});
