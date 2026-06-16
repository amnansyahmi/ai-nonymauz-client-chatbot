'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppLanguage } from '../types';
import { classifySupport, detectCapabilities, type VoiceCapabilities, type VoiceSupportLevel } from '../../../lib/voice/capabilities';
import { createSttController, type SttController } from '../../../lib/voice/stt';
import {
  createStreamingTts,
  createTtsController,
  splitIntoSentences,
  type StreamingTtsHandle,
  type TtsController
} from '../../../lib/voice/tts';
import { createVad, type VadController } from '../../../lib/voice/vad';
import { detectLanguage, isConfident, type LanguageDetection } from '../../../lib/voice/languages';
import {
  findSavedVoice,
  loadVoicePreferences,
  saveVoicePreferences,
  type VoicePreferences
} from '../../../lib/voice/storage';
import { listVoicesForLanguage, pickBestVoice, type ScoredVoice } from '../../../lib/voice/voices';

export type VoicePhase = 'idle' | 'requesting-mic' | 'listening' | 'thinking' | 'speaking' | 'error';

export type VoiceMode = 'continuous' | 'push-to-talk';

export type AskStream = (question: string) => Promise<{
  deltas: AsyncIterable<string>;
  cancel: () => void;
}>;

const SPEECH_IDLE_CUTOFF_MS = 3000;

export type UseLiveVoiceOptions = {
  language: AppLanguage;
  ask: AskStream;
  enabled?: boolean;
};

export type UseLiveVoiceResult = {
  phase: VoicePhase;
  mode: VoiceMode;
  support: VoiceSupportLevel;
  capabilities: VoiceCapabilities | null;
  interimTranscript: string;
  finalTranscript: string;
  spokenAnswer: string;
  streamedAnswer: string;
  currentSentence: string | null;
  currentSentenceIndex: number;
  sentenceCount: number;
  ttsSentence: number;
  detectedLanguage: LanguageDetection | null;
  errorMessage: string;
  preferences: VoicePreferences;
  availableVoices: ScoredVoice[];
  selectedVoice: ScoredVoice | null;
  rms: number;
  silenceMs: number;
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancelTts: () => void;
  updatePreferences: (patch: Partial<VoicePreferences>) => void;
  speakNow: (text: string) => void;
  speakImmediate: (text: string, lang?: string) => void;
  greet: () => void;
  setMode: (mode: VoiceMode) => void;
  pickVoiceForText: (text: string, baseLanguage: AppLanguage) => { voice: ScoredVoice | null; lang: string; detection: LanguageDetection };
  pushToTalk: () => Promise<void>;
  beginPushToTalk: () => void;
  endPushToTalk: () => void;
};

export function useLiveVoice({ language, ask, enabled = true }: UseLiveVoiceOptions): UseLiveVoiceResult {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [spokenAnswer, setSpokenAnswer] = useState('');
  const [streamedAnswer, setStreamedAnswer] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferences, setPreferences] = useState<VoicePreferences>(() => loadVoicePreferences());
  const [rms, setRms] = useState(0);
  const [silenceMs, setSilenceMs] = useState(0);
  const [currentSentence, setCurrentSentence] = useState<string | null>(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentenceCount, setSentenceCount] = useState(0);
  const [ttsSentence, setTtsSentence] = useState(0);

  const capabilitiesRef = useRef<VoiceCapabilities | null>(null);
  const ttsRef = useRef<TtsController | null>(null);
  const sttRef = useRef<SttController | null>(null);
  const vadRef = useRef<VadController | null>(null);
  const streamingTtsRef = useRef<StreamingTtsHandle | null>(null);
  const bargeInActiveRef = useRef(false);
  const phaseRef = useRef<VoicePhase>('idle');
  const finalAccumulatorRef = useRef<string>('');
  const currentAskStreamRef = useRef<{ cancel: () => void } | null>(null);
  const currentSentenceIndexRef = useRef(0);
  const lastSoundAtRef = useRef<number>(0);
  const lastRmsUiUpdateAtRef = useRef<number>(0);
  const listeningStartedAtRef = useRef<number>(0);
  const autoStopTimerRef = useRef<number | null>(null);
  const transcriptIdleTimerRef = useRef<number | null>(null);
  const thinkingAckRef = useRef<number | null>(null);
  const detectedLangRef = useRef<LanguageDetection | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    currentSentenceIndexRef.current = currentSentenceIndex;
  }, [currentSentenceIndex]);

  const capabilities = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const detected = detectCapabilities(language);
    capabilitiesRef.current = detected;
    return detected;
  }, [language]);

  const support: VoiceSupportLevel = useMemo(
    () => (capabilities ? classifySupport(capabilities) : 'unavailable'),
    [capabilities]
  );

  const mode: VoiceMode = preferences.mode;

  const selectedVoice = useMemo<ScoredVoice | null>(() => {
    if (voices.length === 0) return null;
    const scored = listVoicesForLanguage(voices, language);
    const saved = findSavedVoice(scored, preferences.voiceURI);
    if (language === 'ms' && saved && !saved.voice.lang.toLowerCase().startsWith('ms')) {
      return pickBestVoice(voices, language);
    }
    return saved ?? pickBestVoice(voices, language);
  }, [voices, language, preferences.voiceURI]);

  const pickVoiceForText = useCallback(
    (text: string, baseLanguage: AppLanguage): { voice: ScoredVoice | null; lang: string; detection: LanguageDetection } => {
      if (voices.length === 0) {
        const fallback = baseLanguage === 'en' ? 'en-US' : 'ms-MY';
        return { voice: null, lang: fallback, detection: { language: 'unknown', confidence: 0, malayScore: 0, englishScore: 0, tokenCount: 0 } };
      }
      const detection = detectLanguage(text);
      // Only switch voice when the detection is confident; otherwise stick with the
      // user's UI language voice so we don't accidentally flip on a single word.
      const effective: AppLanguage =
        isConfident(detection) && detection.language !== 'unknown' ? detection.language : baseLanguage;
      const scored = listVoicesForLanguage(voices, effective);
      const saved = preferences.voiceURI ? findSavedVoice(scored, preferences.voiceURI) : null;
      if (effective === 'ms' && saved && !saved.voice.lang.toLowerCase().startsWith('ms')) {
        const voice = pickBestVoice(voices, effective);
        return {
          voice,
          lang: voice?.voice.lang ?? 'ms-MY',
          detection
        };
      }
      const voice = saved ?? pickBestVoice(voices, effective);
      return {
        voice,
        lang: voice?.voice.lang ?? (effective === 'en' ? 'en-US' : 'ms-MY'),
        detection
      };
    },
    [voices, preferences.voiceURI]
  );

  const clearThinkingAck = useCallback(() => {
    if (thinkingAckRef.current) {
      window.clearTimeout(thinkingAckRef.current);
      thinkingAckRef.current = null;
    }
  }, []);

  const clearTranscriptIdleTimer = useCallback(() => {
    if (transcriptIdleTimerRef.current) {
      window.clearTimeout(transcriptIdleTimerRef.current);
      transcriptIdleTimerRef.current = null;
    }
  }, []);

  const speakImmediate = useCallback(
    (text: string, lang?: string) => {
      const tts = ttsRef.current;
      if (!tts || !text.trim()) return;
      const voice = selectedVoice?.voice ?? null;
      const effectiveLang = lang ?? capabilitiesRef.current?.speechSynthesisLang ?? 'en-US';
      tts.speak({
        text,
        voice,
        lang: effectiveLang,
        rate: preferences.rate,
        pitch: preferences.pitch
      });
    },
    [selectedVoice, preferences.rate, preferences.pitch]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;
    const controller = createTtsController();
    ttsRef.current = controller;
    let cancelled = false;

    controller
      .voicesReady()
      .then((available) => {
        if (!cancelled) setVoices(available);
      })
      .catch(() => {
        if (!cancelled) setVoices(window.speechSynthesis.getVoices());
      });

    const onVoicesChanged = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoicesChanged);

    return () => {
      cancelled = true;
      window.speechSynthesis.removeEventListener?.('voiceschanged', onVoicesChanged);
      controller.cancel();
      ttsRef.current = null;
    };
  }, []);

  useEffect(() => {
    return () => {
      sttRef.current?.abort();
      vadRef.current?.stop();
      ttsRef.current?.cancel();
      streamingTtsRef.current?.cancel();
      if (autoStopTimerRef.current) {
        window.clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (thinkingAckRef.current) {
        window.clearTimeout(thinkingAckRef.current);
        thinkingAckRef.current = null;
      }
      if (transcriptIdleTimerRef.current) {
        window.clearTimeout(transcriptIdleTimerRef.current);
        transcriptIdleTimerRef.current = null;
      }
    };
  }, []);

  const stopBargeInMonitor = useCallback(() => {
    if (!bargeInActiveRef.current) return;
    bargeInActiveRef.current = false;
    vadRef.current?.stop();
    vadRef.current = null;
  }, []);

  const startBargeInMonitor = useCallback(() => {
    if (bargeInActiveRef.current) return;
    if (!preferences.bargeIn) return;
    if (!capabilitiesRef.current?.hasGetUserMedia || !capabilitiesRef.current?.hasAudioContext) return;
    const vad = createVad(
      { threshold: 0.035, speechHoldMs: 250, silenceHoldMs: 600 },
      {
        onSpeechStart: () => {
          if (phaseRef.current === 'speaking') {
            streamingTtsRef.current?.cancel();
            ttsRef.current?.cancel();
            setPhase('idle');
            stopBargeInMonitor();
          }
        },
        onError: () => stopBargeInMonitor()
      }
    );
    bargeInActiveRef.current = true;
    vadRef.current = vad;
    vad.start();
  }, [preferences.bargeIn, stopBargeInMonitor]);

  const cancelTts = useCallback(() => {
    streamingTtsRef.current?.cancel();
    ttsRef.current?.cancel();
    stopBargeInMonitor();
    if (phaseRef.current === 'speaking') setPhase('idle');
  }, [stopBargeInMonitor]);

  const stop = useCallback(() => {
    currentAskStreamRef.current?.cancel();
    currentAskStreamRef.current = null;
    sttRef.current?.abort();
    streamingTtsRef.current?.cancel();
    ttsRef.current?.cancel();
    stopBargeInMonitor();
    clearThinkingAck();
    clearTranscriptIdleTimer();
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    finalAccumulatorRef.current = '';
    setInterimTranscript('');
    setFinalTranscript('');
    setRms(0);
    setSilenceMs(0);
    setCurrentSentence(null);
    setCurrentSentenceIndex(0);
    setSentenceCount(0);
    setTtsSentence(0);
    if (phaseRef.current !== 'idle') setPhase('idle');
  }, [stopBargeInMonitor, clearThinkingAck, clearTranscriptIdleTimer]);

  const speakNow = useCallback(
    (text: string) => {
      const tts = ttsRef.current;
      if (!tts) return;
      const cleaned = text
        .replace(/\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/[#*_`>-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) return;
      const segments = splitIntoSentences(cleaned);
      if (segments.length === 0) return;

      setSpokenAnswer(cleaned);
      setPhase('speaking');

      const playAt = (index: number) => {
        if (index >= segments.length) {
          if (phaseRef.current === 'speaking') setPhase('idle');
          return;
        }
        tts.speak({
          text: segments[index],
          voice: selectedVoice?.voice ?? null,
          lang: capabilitiesRef.current?.speechSynthesisLang ?? 'en-US',
          rate: preferences.rate,
          pitch: preferences.pitch,
          onStart: () => {
            if (preferences.bargeIn) startBargeInMonitor();
          },
          onEnd: () => playAt(index + 1),
          onError: () => playAt(index + 1)
        });
      };
      playAt(0);
    },
    [selectedVoice, preferences.rate, preferences.pitch, preferences.bargeIn, startBargeInMonitor]
  );

  const handleFinalTranscript = useCallback(
    async (text: string) => {
      if (!text) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      clearTranscriptIdleTimer();
      sttRef.current?.stop();
      finalAccumulatorRef.current = '';
      setFinalTranscript(trimmed);
      setInterimTranscript('');
      setCurrentSentence(null);
      setCurrentSentenceIndex(0);
      setSentenceCount(0);
      setTtsSentence(0);
      setPhase('thinking');

      // Schedule a "thinking acknowledgment" so the user gets instant feedback
      // that we heard them. Cancelled the moment the AI starts speaking.
      clearThinkingAck();
      const ackText =
        language === 'ms'
          ? 'OK, saya semak sebentar.'
          : 'OK, let me check that.';
      thinkingAckRef.current = window.setTimeout(() => {
        speakImmediate(ackText);
      }, 700);

      const { voice: answerVoice, lang: answerLang, detection } = pickVoiceForText(trimmed, language);
      detectedLangRef.current = detection;

      try {
        const streamHandle = await ask(trimmed);
        currentAskStreamRef.current = streamHandle;

        setStreamedAnswer('');
        const streaming = createStreamingTts({
          voice: answerVoice?.voice ?? null,
          lang: answerLang,
          rate: preferences.rate,
          pitch: preferences.pitch,
          onSentenceStart: (sentence, index) => {
            // First sentence is about to speak — cancel the acknowledgment if it's still pending
            if (index === 0) clearThinkingAck();
            setCurrentSentence(sentence);
            setCurrentSentenceIndex(index);
            setTtsSentence(index);
            setSentenceCount((count) => Math.max(count, index + 1));
            if (phaseRef.current !== 'speaking') setPhase('speaking');
            if (preferences.bargeIn) startBargeInMonitor();
          },
          onSentenceEnd: (sentence, index) => {
            if (currentSentenceIndexRef.current === index) {
              setCurrentSentence(null);
            }
          },
          onComplete: (full) => {
            clearThinkingAck();
            setSpokenAnswer(full);
            setCurrentSentence(null);
            if (phaseRef.current === 'speaking') setPhase('idle');
            stopBargeInMonitor();
            if (mode === 'continuous' && phaseRef.current !== 'error') {
              window.setTimeout(() => {
                if (phaseRef.current === 'idle') {
                  startListening();
                }
              }, 250);
            }
          },
          onError: () => {
            clearThinkingAck();
            setCurrentSentence(null);
            if (phaseRef.current === 'speaking') setPhase('error');
          }
        });
        streamingTtsRef.current = streaming;

        try {
          for await (const delta of streamHandle.deltas) {
            if (delta) {
              setStreamedAnswer((current) => current + delta);
              streaming.push(delta);
            }
          }
          await streaming.finish();
        } catch (err) {
          streaming.cancel();
          if (phaseRef.current === 'speaking' || phaseRef.current === 'thinking') {
            setPhase('error');
            setErrorMessage(err instanceof Error ? err.message : 'stream-failed');
          }
        } finally {
          if (currentAskStreamRef.current === streamHandle) {
            currentAskStreamRef.current = null;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'ask-failed';
        setErrorMessage(message);
        setPhase('error');
        stopBargeInMonitor();
      }
    },
    [
      ask,
      mode,
      selectedVoice,
      preferences.rate,
      preferences.pitch,
      preferences.bargeIn,
      startBargeInMonitor,
      stopBargeInMonitor,
      clearThinkingAck,
      speakImmediate,
      pickVoiceForText,
      language
    ]
  );

  const scheduleTranscriptIdleSubmit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || mode === 'push-to-talk') return;
      clearTranscriptIdleTimer();
      transcriptIdleTimerRef.current = window.setTimeout(() => {
        if (phaseRef.current === 'listening') {
          handleFinalTranscript(trimmed);
        }
      }, SPEECH_IDLE_CUTOFF_MS);
    },
    [clearTranscriptIdleTimer, handleFinalTranscript, mode]
  );

  const greet = useCallback(() => {
    const tts = ttsRef.current;
    if (!tts) return;
    const greeting =
      language === 'ms'
        ? 'Hai! Saya MajlisMate. Tekan mula dan cakap apa-apa soalan.'
        : "Hi! I'm MajlisMate. Tap start and ask me anything.";
    tts.cancel();
    setPhase('speaking');
    tts.speak({
      text: greeting,
      voice: selectedVoice?.voice ?? null,
      lang: capabilitiesRef.current?.speechSynthesisLang ?? 'en-US',
      rate: preferences.rate,
      pitch: preferences.pitch,
      onEnd: () => {
        if (phaseRef.current === 'speaking') setPhase('idle');
      },
      onError: () => {
        if (phaseRef.current === 'speaking') setPhase('idle');
      }
    });
  }, [selectedVoice, preferences.rate, preferences.pitch, language]);

  const startVadMonitor = useCallback(() => {
    const caps = capabilitiesRef.current;
    if (!caps?.hasGetUserMedia || !caps?.hasAudioContext) return;
    if (vadRef.current?.isActive()) return;
    const vad = createVad(
      { threshold: 0.012, speechHoldMs: 180, silenceHoldMs: SPEECH_IDLE_CUTOFF_MS, emitRms: true },
      {
        onRms: (value) => {
          const now = Date.now();
          if (now - lastRmsUiUpdateAtRef.current < 100) return;
          lastRmsUiUpdateAtRef.current = now;
          setRms((prev) => prev * 0.5 + Math.min(value * 4, 1) * 0.5);
          setSilenceMs(value > 0.02 ? 0 : (prev) => prev + 100);
        },
        onSpeechStart: () => {
          lastSoundAtRef.current = Date.now();
        },
        onSpeechEnd: () => {
          const sinceLastSound = Date.now() - lastSoundAtRef.current;
          if (sinceLastSound >= SPEECH_IDLE_CUTOFF_MS && phaseRef.current === 'listening') {
            const transcript = finalAccumulatorRef.current.trim();
            if (transcript) {
              handleFinalTranscript(transcript);
            }
          }
        },
        onError: () => {}
      }
    );
    vadRef.current = vad;
    listeningStartedAtRef.current = Date.now();
    vad.start();
  }, [handleFinalTranscript]);

  const startListening = useCallback(() => {
    const caps = capabilitiesRef.current;
    if (!caps) return;
    const stt = sttRef.current ?? createSttController(caps, {
      onStart: () => {
        setPhase('listening');
        lastSoundAtRef.current = Date.now();
      },
      onInterim: (transcript) => {
        setInterimTranscript(transcript);
        lastSoundAtRef.current = Date.now();
        scheduleTranscriptIdleSubmit(finalAccumulatorRef.current || transcript);
      },
      onFinal: (transcript) => {
        if (transcript) {
          finalAccumulatorRef.current = finalAccumulatorRef.current
            ? `${finalAccumulatorRef.current} ${transcript}`.trim()
            : transcript;
          setFinalTranscript(finalAccumulatorRef.current);
          if (mode === 'push-to-talk') {
            handleFinalTranscript(transcript);
          } else {
            scheduleTranscriptIdleSubmit(finalAccumulatorRef.current);
          }
        }
      },
      onError: (reason) => {
        if (reason === 'no-speech') {
          if (mode === 'continuous' && phaseRef.current === 'listening') {
            startListening();
          } else {
            setPhase('idle');
          }
          return;
        }
        setErrorMessage(reason);
        setPhase('error');
      },
      onEnd: () => {
        if (mode === 'push-to-talk') return;
        if (phaseRef.current === 'listening') {
          if (finalAccumulatorRef.current.trim()) {
            handleFinalTranscript(finalAccumulatorRef.current);
          } else {
            startListening();
          }
        }
      }
    });
    if (!stt) {
      setErrorMessage('speech-recognition-unavailable');
      setPhase('error');
      return;
    }
    sttRef.current = stt;
    finalAccumulatorRef.current = '';
    setFinalTranscript('');
    setInterimTranscript('');
    setErrorMessage('');
    startVadMonitor();
    stt.start();
  }, [handleFinalTranscript, mode, startVadMonitor, scheduleTranscriptIdleSubmit]);

  const start = useCallback(async () => {
    if (!enabled) return;
    const caps = capabilitiesRef.current;
    if (!caps) return;
    if (support === 'unavailable') {
      setErrorMessage('voice-unavailable');
      setPhase('error');
      return;
    }
    if (support === 'push-to-talk-only') {
      setErrorMessage('');
      setPhase('idle');
      return;
    }
    if (!caps.hasGetUserMedia) {
      setErrorMessage('mic-permission-unavailable');
      setPhase('error');
      return;
    }
    setPhase('requesting-mic');
    setErrorMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'mic-denied');
      setPhase('error');
      return;
    }
    startListening();
  }, [enabled, support, startListening]);

  const pushToTalk = useCallback(async () => {
    if (!enabled) return;
    if (phaseRef.current === 'speaking') {
      cancelTts();
    }
    await start();
  }, [enabled, start, cancelTts]);

  // Non-async variants for keyboard / pointer-based hold-to-talk handlers.
  // They intentionally swallow the returned promise so the caller does not
  // need to deal with it; errors are surfaced via phase / errorMessage.
  const beginPushToTalk = useCallback(() => {
    if (!enabled) return;
    if (phaseRef.current === 'speaking') {
      cancelTts();
    }
    void start();
  }, [enabled, start, cancelTts]);

  const endPushToTalk = useCallback(() => {
    stop();
  }, [stop]);

  const updatePreferences = useCallback((patch: Partial<VoicePreferences>) => {
    setPreferences((current) => {
      const next = saveVoicePreferences({ ...current, ...patch });
      return next;
    });
  }, []);

  const setMode = useCallback(
    (next: VoiceMode) => {
      updatePreferences({ mode: next });
    },
    [updatePreferences]
  );

  const availableVoices = useMemo<ScoredVoice[]>(() => {
    if (voices.length === 0) return [];
    return listVoicesForLanguage(voices, language);
  }, [voices, language]);

  return {
    phase,
    mode,
    support,
    capabilities,
    interimTranscript,
    finalTranscript,
    spokenAnswer,
    streamedAnswer,
    currentSentence,
    currentSentenceIndex,
    sentenceCount,
    ttsSentence,
    detectedLanguage: detectedLangRef.current,
    errorMessage,
    preferences,
    availableVoices,
    selectedVoice,
    rms,
    silenceMs,
    isSpeaking: phase === 'speaking',
    isListening: phase === 'listening' || phase === 'requesting-mic',
    isThinking: phase === 'thinking',
    start,
    stop,
    cancelTts,
    updatePreferences,
    speakNow,
    speakImmediate,
    greet,
    setMode,
    pickVoiceForText,
    pushToTalk,
    beginPushToTalk,
    endPushToTalk
  };
}
