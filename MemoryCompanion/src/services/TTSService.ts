/**
 * TTSService
 * Wraps react-native-tts to speak agent responses aloud.
 * Uses a calm, slightly slower rate appropriate for Alzheimer's patients.
 */

import Tts from 'react-native-tts';

class TTSService {
  private initialized = false;

  async init() {
    if (this.initialized) return;
    try {
      await Tts.setDefaultLanguage('en-US');
      await Tts.setDefaultRate(0.48); // slightly slower — clearer
      await Tts.setDefaultPitch(0.95); // slightly lower — calmer
      this.initialized = true;
    } catch (err) {
      console.warn('[TTS] Init error:', err);
    }
  }

  speak(text: string) {
    Tts.stop();
    Tts.speak(text);
  }

  stop() {
    Tts.stop();
  }
}

export const ttsService = new TTSService();
