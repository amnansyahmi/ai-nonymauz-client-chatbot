'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppLanguage } from '../types';
import { classifySupport, detectCapabilities, type VoiceCapabilities, type VoiceSupportLevel } from '@/lib/voice/capabilities';
import { createSttController, type SttController } from '@/lib/voice/stt';
import {
  createStreamingTts,
  createTtsController,
  splitIntoSentences,
  type StreamingTtsHandle,
  type TtsController
} from '@/lib/voice/tts';
import { createVad, type VadController } from '@/lib/voice/vad';
import { detectLanguage, isConfident, type LanguageDetection } from '@/lib/voice/languages';
import {
  findSavedVoice,
  loadVoicePreferences,
  saveVoicePreferences,
  type VoicePreferences
} from '@/lib/voice/storage';
import { listVoicesForLanguage, pickBestVoice, type ScoredVoice } from '@/lib/voice/voices';
import { humanize, isQuestionSentence, sentenceProsody } from '@/lib/voice/prosody';
import { parseChatActions, MM_ACTIONS_OPEN, type PlannerAction } from '@/lib/planner/chatActions';

const THINKING_ACKS: Record<AppLanguage, readonly string[]> = {
  en: [
    'Got it, one sec.',
    'Sure, let me check.',
    'Hmm, one moment.',
    "Okay, let me look into that.",
    'Alright, one sec.',
  ],
  ms: [
    'Okay, sekejap ya.',
    'Baik, jap saya tengok.',
    'Hmm, sekejap.',
    'Ok, saya semak dulu ya.',
    'Ha, jap eh.',
    'Ok, tunggu jap.',
    'Satu saat ya.',
  ],
};

// Played once if the backend takes longer than ~7 seconds to start streaming,
// so the user does not experience dead silence after the initial ack fades out.
const STILL_THINKING_ACKS: Record<AppLanguage, readonly string[]> = {
  en: [
    'Still looking into that…',
    'Bear with me a moment…',
    'Almost there…',
  ],
  ms: [
    'Tengah cari maklumat ni, sabar ya…',
    'Jap lagi, tengah fikir…',
    'Sekejap lagi ya…',
  ],
};

export type VoiceExchange = {
  id: string;
  user: string;
  assistant: string;
};

export type VoicePhase = 'idle' | 'requesting-mic' | 'listening' | 'thinking' | 'speaking' | 'error';

export type VoiceMode = 'continuous' | 'push-to-talk';

export type AskStream = (question: string, opts?: { voiceMode?: boolean }) => Promise<{
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
  history: VoiceExchange[];
  hasMalayVoice: boolean;
  pendingActions: PlannerAction[];
  clearPendingActions: () => void;
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
  refreshVoices: () => void;
  askText: (text: string) => void;
  clearHistory: () => void;
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
  const [history, setHistory] = useState<VoiceExchange[]>([]);
  const [pendingActions, setPendingActions] = useState<PlannerAction[]>([]);

  const capabilitiesRef = useRef<VoiceCapabilities | null>(null);
  const ttsRef = useRef<TtsController | null>(null);
  const sttRef = useRef<SttController | null>(null);
  const vadRef = useRef<VadController | null>(null);
  // Holds the latest startListening to break the circular dep with handleFinalTranscript.
  const startListeningRef = useRef<() => void>(() => {});
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
  const stillThinkingTimerRef = useRef<number | null>(null);
  const detectedLangRef = useRef<LanguageDetection | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    currentSentenceIndexRef.current = currentSentenceIndex;
  }, [currentSentenceIndex]);

  // Synthetic RMS: animate the waveform while TTS is speaking
  useEffect(() => {
    if (phase !== 'speaking') return;
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      const base = 0.35 + 0.25 * Math.sin(tick * 0.45);
      const jitter = 0.1 * Math.sin(tick * 1.3);
      setRms(Math.min(1, Math.max(0, base + jitter)));
    }, 80);
    return () => {
      window.clearInterval(id);
      setRms(0);
    };
  }, [phase]);

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
      // Malay-first system: when the UI language is Malay, always speak with the
      // Malay voice. Malay sentences borrow many English loanwords (vendor, budget,
      // appointment, deposit) which would otherwise trip per-sentence detection into
      // an English voice mid-answer. English is secondary — only honour detection
      // when the user has explicitly switched the UI to English.
      const effective: AppLanguage =
        baseLanguage === 'ms'
          ? 'ms'
          : isConfident(detection) && detection.language !== 'unknown'
            ? detection.language
            : baseLanguage;
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
    if (stillThinkingTimerRef.current) {
      window.clearTimeout(stillThinkingTimerRef.current);
      stillThinkingTimerRef.current = null;
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
      if (stillThinkingTimerRef.current) {
        window.clearTimeout(stillThinkingTimerRef.current);
        stillThinkingTimerRef.current = null;
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
    // Higher threshold + longer hold so the TTS audio leaking into the mic does
    // not self-trigger barge-in. Only clearly louder, sustained speech cuts in.
    const vad = createVad(
      { threshold: 0.09, speechHoldMs: 450, silenceHoldMs: 600 },
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
      const cleaned = humanize(text, language, selectedVoice?.voice.lang);
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
        const isLast = index === segments.length - 1;
        const prosody = sentenceProsody(
          index,
          isQuestionSentence(segments[index]),
          preferences.rate,
          preferences.pitch,
          isLast
        );
        tts.speak({
          text: segments[index],
          voice: selectedVoice?.voice ?? null,
          lang: capabilitiesRef.current?.speechSynthesisLang ?? 'en-US',
          rate: prosody.rate,
          pitch: prosody.pitch,
          onStart: () => {
            if (preferences.bargeIn) startBargeInMonitor();
          },
          onEnd: () => playAt(index + 1),
          onError: () => playAt(index + 1)
        });
      };
      playAt(0);
    },
    [selectedVoice, preferences.rate, preferences.pitch, preferences.bargeIn, startBargeInMonitor, language]
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
      const acks = THINKING_ACKS[language];
      const ackText = acks[Math.floor(Math.random() * acks.length)];
      thinkingAckRef.current = window.setTimeout(() => {
        speakImmediate(ackText);
      }, 700);

      // If the backend takes longer than ~7 s (e.g. Render cold start), speak a
      // second patient-waiting phrase so the user does not experience dead silence
      // after the initial ack fades out. Cleared as soon as the first AI sentence
      // arrives via clearThinkingAck() in onSentenceStart.
      const stillAcks = STILL_THINKING_ACKS[language];
      stillThinkingTimerRef.current = window.setTimeout(() => {
        stillThinkingTimerRef.current = null;
        speakImmediate(stillAcks[Math.floor(Math.random() * stillAcks.length)]);
      }, 7000);

      const { voice: answerVoice, lang: answerLang, detection } = pickVoiceForText(trimmed, language);
      detectedLangRef.current = detection;

      try {
        const streamHandle = await ask(trimmed, { voiceMode: true });
        currentAskStreamRef.current = streamHandle;

        setStreamedAnswer('');
        setPendingActions([]);
        const streaming = createStreamingTts({
          voice: answerVoice?.voice ?? null,
          lang: answerLang,
          rate: preferences.rate,
          pitch: preferences.pitch,
          pauseBetweenMs: 220,
          humanize: (text) => humanize(text, language, answerVoice?.voice.lang),
          prosodyForSentence: (sentence, index, isLast) =>
            sentenceProsody(index, isQuestionSentence(sentence), preferences.rate, preferences.pitch, isLast),
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
            const answer = full.trim();
            if (answer) {
              setHistory((current) => [
                ...current,
                { id: `${Date.now()}-${current.length}`, user: trimmed, assistant: answer }
              ].slice(-12));
            }
            setCurrentSentence(null);
            if (phaseRef.current === 'speaking') setPhase('idle');
            stopBargeInMonitor();
            if (mode === 'continuous' && phaseRef.current !== 'error') {
              window.setTimeout(() => {
                if (phaseRef.current === 'idle') {
                  startListeningRef.current();
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
          // Accumulate the raw answer but only ever speak / caption the text
          // BEFORE the action block, so the TTS never reads JSON aloud.
          let raw = '';
          let pushedLen = 0;
          for await (const delta of streamHandle.deltas) {
            if (!delta) continue;
            raw += delta;
            const openIndex = raw.indexOf(MM_ACTIONS_OPEN);
            const clean = openIndex === -1 ? raw : raw.slice(0, openIndex);
            setStreamedAnswer(clean);
            if (clean.length > pushedLen) {
              streaming.push(clean.slice(pushedLen));
              pushedLen = clean.length;
            }
          }
          await streaming.finish();
          const voiceActions = parseChatActions(raw);
          if (voiceActions.length > 0) setPendingActions(voiceActions);
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
        ? 'Hai! Saya MajlisMate — ada apa yang boleh saya bantu hari ni?'
        : "Hey! I'm MajlisMate — what can I help you with today?";
    tts.cancel();
    setPhase('speaking');
    tts.speak({
      text: greeting,
      voice: selectedVoice?.voice ?? null,
      lang: capabilitiesRef.current?.speechSynthesisLang ?? (language === 'ms' ? 'ms-MY' : 'en-US'),
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
  // Keep ref in sync so handleFinalTranscript can call the latest version
  // without creating a circular useCallback dependency.
  startListeningRef.current = startListening;

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

  // When mode changes, discard the cached STT controller so startListening
  // creates a fresh one whose callbacks close over the correct mode value.
  useEffect(() => {
    sttRef.current?.abort();
    sttRef.current = null;
  }, [mode]);

  const availableVoices = useMemo<ScoredVoice[]>(() => {
    if (voices.length === 0) return [];
    return listVoicesForLanguage(voices, language);
  }, [voices, language]);

  const hasMalayVoice = useMemo<boolean>(
    () => voices.some((v) => v.lang.toLowerCase().startsWith('ms')),
    [voices]
  );

  const askText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (phaseRef.current === 'thinking' || phaseRef.current === 'speaking') return;
      void handleFinalTranscript(trimmed);
    },
    [handleFinalTranscript]
  );

  const clearHistory = useCallback(() => setHistory([]), []);
  const clearPendingActions = useCallback(() => setPendingActions([]), []);

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
    history,
    hasMalayVoice,
    pendingActions,
    clearPendingActions,
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
    endPushToTalk,
    refreshVoices: () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        setVoices(window.speechSynthesis.getVoices());
      }
    },
    askText,
    clearHistory
  };
}
