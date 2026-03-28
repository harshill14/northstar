/**
 * SpeechService - Text-to-speech with calm, slow voice for Alzheimer's patients.
 * Uses expo-speech for TTS output.
 *
 * NOTE: For speech recognition (STT), we use expo-av or @react-native-voice/voice.
 * In this demo, voice input is simulated with button taps + preset queries,
 * but the architecture supports live STT.
 */
import * as Speech from 'expo-speech';

class SpeechService {
  constructor() {
    this.isSpeaking = false;
  }

  /**
   * Speak text in a calm, slow voice suitable for Alzheimer's patients.
   */
  async speak(text) {
    // Stop any current speech first
    await this.stop();

    this.isSpeaking = true;

    return new Promise((resolve) => {
      Speech.speak(text, {
        language: 'en-US',
        rate: 0.75,       // Slower than default for clarity
        pitch: 0.95,      // Slightly lower pitch for calmness
        volume: 1.0,
        onDone: () => {
          this.isSpeaking = false;
          resolve();
        },
        onError: () => {
          this.isSpeaking = false;
          resolve();
        },
      });
    });
  }

  /**
   * Stop any ongoing speech.
   */
  async stop() {
    if (this.isSpeaking) {
      Speech.stop();
      this.isSpeaking = false;
    }
  }
}

export default new SpeechService();
