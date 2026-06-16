import type { VoiceCapabilities } from './capabilities';
import type { SpeechWindow } from './types';

export type SttCallbacks = {
  onStart?: () => void;
  onInterim?: (transcript: string) => void;
  onFinal?: (transcript: string) => void;
  onError?: (reason: string) => void;
  onEnd?: () => void;
};

export type SttController = {
  start(): void;
  stop(): void;
  abort(): void;
  isActive(): boolean;
};

const SILENT_ERRORS = new Set(['no-speech', 'aborted', 'no-match']);

export function createSttController(capabilities: VoiceCapabilities, callbacks: SttCallbacks): SttController | null {
  if (typeof window === 'undefined') return null;
  if (!capabilities.hasSpeechRecognition) return null;

  const win = window as SpeechWindow;
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (!Ctor) return null;

  let recognition: InstanceType<typeof Ctor> | null = null;
  let active = false;
  let intentionalStop = false;

  function start() {
    if (active) return;
    if (!Ctor) return;
    intentionalStop = false;
    recognition = new Ctor();
    recognition.continuous = !capabilities.isIOS && !capabilities.isFirefox;
    recognition.interimResults = true;
    recognition.lang = capabilities.speechRecognitionLang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      active = true;
      callbacks.onStart?.();
    };

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += transcript;
        } else {
          interim += transcript;
        }
      }
      if (interim) callbacks.onInterim?.(interim.trim());
      const trimmedFinal = finalText.trim();
      if (trimmedFinal) callbacks.onFinal?.(trimmedFinal);
    };

    recognition.onerror = (event) => {
      const reason = event.error || 'unknown';
      if (SILENT_ERRORS.has(reason)) {
        return;
      }
      callbacks.onError?.(reason);
    };

    recognition.onend = () => {
      active = false;
      callbacks.onEnd?.();
    };

    try {
      recognition.start();
    } catch (error) {
      active = false;
      callbacks.onError?.(error instanceof Error ? error.message : 'start-failed');
    }
  }

  function stop() {
    intentionalStop = true;
    if (recognition && active) {
      try {
        recognition.stop();
      } catch {}
    }
  }

  function abort() {
    intentionalStop = true;
    if (recognition) {
      try {
        recognition.abort();
      } catch {}
    }
    active = false;
  }

  return {
    start,
    stop,
    abort,
    isActive: () => active && !intentionalStop
  };
}
