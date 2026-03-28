/**
 * SpeechService
 * Wraps react-native-voice for on-device STT.
 * Sends partial results live; fires final callback on silence/end.
 */

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';
import {useSessionStore} from './store';
import {wsService} from './WebSocketService';

class SpeechService {
  private isListening = false;
  private finalCallback: ((text: string) => void) | null = null;

  constructor() {
    Voice.onSpeechResults = this._onResults.bind(this);
    Voice.onSpeechError = this._onError.bind(this);
    Voice.onSpeechEnd = this._onEnd.bind(this);
    Voice.onSpeechPartialResults = this._onPartial.bind(this);
  }

  async start(onFinal?: (text: string) => void) {
    if (this.isListening) return;
    this.finalCallback = onFinal ?? null;
    useSessionStore.getState().setTranscribedText('');

    try {
      await Voice.start('en-US');
      this.isListening = true;
    } catch (err) {
      console.warn('[Speech] Start error:', err);
    }
  }

  async stop() {
    if (!this.isListening) return;
    try {
      await Voice.stop();
    } catch {}
    this.isListening = false;
  }

  async destroy() {
    try {
      await Voice.destroy();
    } catch {}
    this.isListening = false;
  }

  private _onPartial(e: SpeechResultsEvent) {
    const text = e.value?.[0] ?? '';
    useSessionStore.getState().setTranscribedText(text);
  }

  private _onResults(e: SpeechResultsEvent) {
    const text = e.value?.[0] ?? '';
    if (!text) return;
    useSessionStore.getState().setTranscribedText(text);
    wsService.sendSpeechText(text);
    wsService.sendEvent('speech_text_final');
    this.finalCallback?.(text);
  }

  private _onEnd() {
    this.isListening = false;
    useSessionStore.getState().setRecording(false);
  }

  private _onError(e: SpeechErrorEvent) {
    console.warn('[Speech] Error:', e.error);
    this.isListening = false;
    useSessionStore.getState().setRecording(false);
  }
}

export const speechService = new SpeechService();
