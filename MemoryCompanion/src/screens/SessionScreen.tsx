import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ScrollView,
} from 'react-native';
import {RNCamera} from 'react-native-camera';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, FontSizes, Spacing, Radii, Shadows} from '../theme';
import {useSessionStore} from '../services/store';
import {wsService} from '../services/WebSocketService';
import {speechService} from '../services/SpeechService';
import {ttsService} from '../services/TTSService';
import {AgentBubble} from '../components/AgentBubble';
import {SpeakButton} from '../components/SpeakButton';
import {HUDBar} from '../components/HUDBar';
import {TranscriptionBanner} from '../components/TranscriptionBanner';
import {DemoPanel} from '../components/DemoPanel';
import {EscalationOverlay} from '../components/EscalationOverlay';

// Frame capture interval — 500ms = ~2fps
const FRAME_CAPTURE_INTERVAL = 500;

interface SessionScreenProps {
  onStop: () => void;
}

export const SessionScreen: React.FC<SessionScreenProps> = ({onStop}) => {
  const insets = useSafeAreaInsets();
  const store = useSessionStore();
  const cameraRef = useRef<RNCamera>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  // ── Start frame capture loop ──────────────────────────────────────────────
  useEffect(() => {
    frameTimerRef.current = setInterval(async () => {
      if (!cameraRef.current) return;
      try {
        const {base64} = await cameraRef.current.takePictureAsync({
          quality: 0.4,
          base64: true,
          skipProcessing: true,
          fixOrientation: true,
        });
        if (base64) {
          wsService.sendFrame(base64);
        }
      } catch {
        // Camera busy — skip this frame
      }
    }, FRAME_CAPTURE_INTERVAL);

    return () => {
      if (frameTimerRef.current) clearInterval(frameTimerRef.current);
    };
  }, []);

  // ── Speak agent messages aloud ────────────────────────────────────────────
  useEffect(() => {
    if (store.currentMessage) {
      ttsService.speak(store.currentMessage.text);
    }
  }, [store.currentMessage]);

  // ── Hold-to-speak handlers ────────────────────────────────────────────────
  const handleSpeakStart = useCallback(async () => {
    store.setRecording(true);
    wsService.sendEvent('recording_started');
    await speechService.start();
  }, [store]);

  const handleSpeakEnd = useCallback(async () => {
    store.setRecording(false);
    wsService.sendEvent('recording_stopped');
    await speechService.stop();
  }, [store]);

  // ── Caregiver escalation ──────────────────────────────────────────────────
  const triggerEscalation = useCallback(() => {
    store.setEscalated(true);
  }, [store]);

  const isListening = store.isRecording;
  const canInteract = !store.isEscalated;

  return (
    <View style={styles.root}>
      {/* ── Camera feed ── */}
      <RNCamera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        type={RNCamera.Constants.Type.back}
        flashMode={RNCamera.Constants.FlashMode.off}
        captureAudio={false}
        androidCameraPermissionOptions={{
          title: 'Camera Permission',
          message: 'Memory Companion needs camera access to help you.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }}
      />

      {/* Dark vignette overlay for text legibility */}
      <View style={styles.vignette} pointerEvents="none" />

      {/* ── HUD top bar ── */}
      <HUDBar onStop={onStop} />

      {/* ── Scrollable message area ── */}
      <View style={styles.messageArea}>
        <ScrollView
          style={styles.messageScroll}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}>
          {/* Transcription banner */}
          <TranscriptionBanner
            text={store.transcribedText}
            visible={isListening}
          />

          {/* Agent messages */}
          {store.currentMessage && (
            <AgentBubble message={store.currentMessage} />
          )}
        </ScrollView>
      </View>

      {/* ── Bottom controls ── */}
      <View style={[styles.controls, {paddingBottom: insets.bottom + 12}]}>
        {/* Main speak button */}
        <SpeakButton
          isListening={isListening}
          onPressIn={handleSpeakStart}
          onPressOut={handleSpeakEnd}
          disabled={!canInteract}
        />

        {/* Secondary chip buttons */}
        <View style={styles.chipRow}>
          <ChipButton
            emoji="📞"
            label="Caregiver"
            color={Colors.caregiver}
            glow={Colors.caregiverGlow}
            onPress={triggerEscalation}
            disabled={!canInteract}
          />
          <ChipButton
            emoji="🎬"
            label="Demo"
            color={Colors.primaryLight}
            glow={Colors.primaryGlow}
            onPress={() => setShowDemo(true)}
            disabled={!canInteract}
          />
          <ChipButton
            emoji="■"
            label="End"
            color={Colors.danger}
            glow={Colors.dangerGlow}
            onPress={onStop}
          />
        </View>
      </View>

      {/* ── Overlays ── */}
      {store.isEscalated && <EscalationOverlay />}
      <DemoPanel visible={showDemo} onClose={() => setShowDemo(false)} />
    </View>
  );
};

// ── Chip button ───────────────────────────────────────────────────────────────

interface ChipButtonProps {
  emoji: string;
  label: string;
  color: string;
  glow: string;
  onPress: () => void;
  disabled?: boolean;
}

const ChipButton: React.FC<ChipButtonProps> = ({
  emoji,
  label,
  color,
  glow,
  onPress,
  disabled,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({pressed}) => [
      styles.chip,
      pressed && {backgroundColor: glow},
      disabled && styles.chipDisabled,
    ]}>
    <Text style={styles.chipEmoji}>{emoji}</Text>
    <Text style={[styles.chipLabel, {color}]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    // Gradient-like vignette using layered semi-transparent overlay
    // stronger at top and bottom, transparent in center
    backgroundColor: 'transparent',
    borderTopWidth: 200,
    borderBottomWidth: 200,
    borderTopColor: 'rgba(10,10,20,0.55)',
    borderBottomColor: 'rgba(10,10,20,0.65)',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  messageArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  messageScroll: {
    maxHeight: 260,
  },
  messageContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.sm,
  },
  controls: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipEmoji: {
    fontSize: 22,
  },
  chipLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
