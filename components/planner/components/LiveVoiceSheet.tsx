'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { AppLanguage } from '../types';
import type { UseLiveVoiceResult } from '../hooks/useLiveVoice';
import LiveOrb from './LiveOrb';
import Waveform from './Waveform';
import VoiceLeds from './VoiceLeds';
import VoiceSettings from './VoiceSettings';
import type { VoiceMode } from '../../../lib/voice/storage';
import { splitIntoSentences } from '../../../lib/voice/tts';
import { usePushToTalkHotkey } from '../../../lib/hooks/usePushToTalkHotkey';
import { useVisibilityRecovery } from '../../../lib/hooks/useVisibilityRecovery';

export type LiveVoiceSheetProps = {
  language: AppLanguage;
  voice: UseLiveVoiceResult;
  isOpen: boolean;
  onClose: () => void;
};

type Phase = UseLiveVoiceResult['phase'];

const PHASE_LABEL: Record<Phase, { ms: string; en: string }> = {
  idle: { ms: 'Sedia', en: 'Ready' },
  'requesting-mic': { ms: 'Menyambung mikrofon', en: 'Connecting mic' },
  listening: { ms: 'Sedang dengar', en: 'Listening' },
  thinking: { ms: 'Sedang fikir', en: 'Thinking' },
  speaking: { ms: 'Sedang bercakap', en: 'Speaking' },
  error: { ms: 'Ralat', en: 'Error' }
};

const PHASE_INSTRUCTION: Record<Phase, { ms: string; en: string }> = {
  idle: { ms: 'Tekan mula dan cakap apa-apa soalan.', en: 'Press start and ask anything.' },
  'requesting-mic': { ms: 'Sila benarkan akses mikrofon.', en: 'Please allow microphone access.' },
  listening: { ms: 'Cakap sekarang. MajlisMate akan jawab.', en: 'Speak now. MajlisMate will answer.' },
  thinking: { ms: 'MajlisMate sedang fikir…', en: 'MajlisMate is thinking…' },
  speaking: { ms: 'MajlisMate sedang bercakap.', en: 'MajlisMate is speaking.' },
  error: { ms: 'Cuba lagi sebentar.', en: 'Please try again.' }
};

export default function LiveVoiceSheet({
  language,
  voice,
  isOpen,
  onClose
}: LiveVoiceSheetProps) {
  const greetedOnOpenRef = useRef(false);
  const userCaption = voice.interimTranscript || voice.finalTranscript;
  const assistantCaption = voice.streamedAnswer || voice.spokenAnswer;
  const streamingSentences = useMemo(
    () => (assistantCaption ? splitIntoSentences(assistantCaption) : []),
    [assistantCaption]
  );

  // Hold a ref to the latest voice object so the auto-greet effect below
  // does not re-run on every parent render (the voice object is recreated
  // by useLiveVoice each render). Re-running would clear the setTimeout
  // before it fires and the greeting would never play.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  // Auto-greet once when the sheet opens (if the user has greetings enabled)
  useEffect(() => {
    if (!isOpen) {
      greetedOnOpenRef.current = false;
      return;
    }
    if (!voiceRef.current.preferences.greeting) return;
    if (greetedOnOpenRef.current) return;
    if (voiceRef.current.phase !== 'idle') return;
    if (voiceRef.current.streamedAnswer) return;
    greetedOnOpenRef.current = true;
    const timer = window.setTimeout(() => {
      voiceRef.current.greet();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Auto-scroll the current sentence into view inside the assistant caption
  const captionRef = useRef<HTMLDivElement | null>(null);
  const lastScrolledIndexRef = useRef<number>(-1);
  useEffect(() => {
    if (voice.currentSentenceIndex === lastScrolledIndexRef.current) return;
    lastScrolledIndexRef.current = voice.currentSentenceIndex;
    const container = captionRef.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(`[data-sentence-index="${voice.currentSentenceIndex}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [voice.currentSentenceIndex]);

  // Hold-to-talk via spacebar. Desktop only (mobile has no keyboard).
  usePushToTalkHotkey({
    enabled: isOpen && voice.mode === 'push-to-talk' && voice.support === 'full',
    onPress: () => voice.beginPushToTalk(),
    onRelease: () => voice.endPushToTalk()
  });

  // iOS Safari / mobile Chrome: when the page is backgrounded, audio is
  // paused. On return, cancel any stuck TTS and resume listening (continuous
  // mode) so the user doesn't have to tap the mic again.
  useVisibilityRecovery({
    enabled: isOpen,
    onSuspend: () => {
      voice.cancelTts();
    },
    onRecover: () => {
      if (voice.phase === 'speaking') voice.cancelTts();
      if (voice.mode === 'continuous' && voice.phase === 'idle') {
        // Re-acquire the mic in case iOS revoked it during backgrounding
        void voice.start();
      }
    }
  });

  const phase = voice.phase;
  const isTtsOnly = voice.support === 'text-only-tts';
  const isFallback = voice.support === 'push-to-talk-only';
  const isUnavailable = voice.support === 'unavailable';
  const isListening = phase === 'listening' || phase === 'requesting-mic';
  const waveform = useMemo(() => <Waveform active={isListening} rms={voice.rms} />, [isListening, voice.rms]);

  if (!isOpen) return null;

  const label = PHASE_LABEL[phase][language];
  const instruction = PHASE_INSTRUCTION[phase][language];

  return (
    <div
      className="live-voice-backdrop"
      role="presentation"
      onClick={() => {
        voice.stop();
        onClose();
      }}
    >
      <section
        className={`live-voice-sheet state-${phase} mode-${isFallback ? 'fallback' : 'browser'} support-${voice.support}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-voice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="live-voice-header">
          <div>
            <span className="live-voice-eyebrow">
              {language === 'ms' ? 'Voice assistant' : 'Voice assistant'}
            </span>
            <h3 id="live-voice-title">
              {language === 'ms' ? 'MajlisMate Live' : 'MajlisMate Live'}
            </h3>
          </div>
          <div className="live-voice-header-actions">
            <VoiceSettings
              language={language}
              preferences={voice.preferences}
              voices={voice.availableVoices}
              selectedVoiceURI={voice.preferences.voiceURI}
              mode={voice.mode}
              onChange={voice.updatePreferences}
              onModeChange={(mode: VoiceMode) => {
                voice.updatePreferences({ mode });
                if (phase === 'listening' || phase === 'speaking') {
                  voice.stop();
                }
              }}
              onClose={() => {
                /* handled by VoiceSettings internal state */
              }}
            />
            <button
              type="button"
              aria-label={language === 'ms' ? 'Tutup live voice' : 'Close live voice'}
              onClick={() => {
                voice.stop();
                onClose();
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div className="live-voice-stage" aria-live="polite">
          <VoiceLeds active={isListening || phase === 'speaking'} rms={voice.rms} count={5} />
          <button
            type="button"
            className="live-orb-btn"
            aria-label={
              phase === 'idle' || phase === 'error'
                ? (language === 'ms' ? 'Ketuk untuk mula bercakap' : 'Tap to start talking')
                : (language === 'ms' ? 'Ketuk untuk berhenti' : 'Tap to stop')
            }
            disabled={isUnavailable || isTtsOnly || phase === 'requesting-mic'}
            onClick={() => {
              if (phase === 'idle' || phase === 'error') {
                void voice.pushToTalk();
              } else {
                voice.stop();
              }
            }}
          >
            <LiveOrb state={phase} rms={voice.rms} ttsSentence={voice.ttsSentence} />
            <span className="live-orb-hint" aria-hidden="true">
              {phase === 'idle' || phase === 'error'
                ? (language === 'ms' ? 'ketuk untuk mula' : 'tap to start')
                : phase === 'requesting-mic'
                  ? (language === 'ms' ? 'menyambung...' : 'connecting...')
                  : (language === 'ms' ? 'ketuk untuk berhenti' : 'tap to stop')}
            </span>
          </button>
          <div className="live-voice-waveform">{waveform}</div>
          <strong className="live-voice-phase-label">{label}</strong>
          <p className="live-voice-instruction">
            {isTtsOnly
              ? (language === 'ms'
                  ? 'Input suara tidak disokong dalam browser ini. Tap soalan di bawah dan MajlisMate akan jawab dengan suara.'
                  : 'Voice input is not supported in this browser. Tap a question below and MajlisMate will reply by speaking.')
              : phase === 'error' && voice.errorMessage
                ? voice.errorMessage
                : instruction}
          </p>
          {isTtsOnly ? (
            <p className="live-voice-hotkey">
              {language === 'ms'
                ? 'Guna Chrome, Edge atau Safari untuk input suara penuh.'
                : 'Use Chrome, Edge or Safari for full voice input.'}
            </p>
          ) : null}
          {voice.mode === 'push-to-talk' && voice.support === 'full' ? (
            <p className="live-voice-hotkey">
              {language === 'ms'
                ? 'Tip: tahan butang atau kekunci Space untuk bercakap'
                : 'Tip: hold the button or press Space to talk'}
            </p>
          ) : null}
        </div>

        {voice.currentSentence ? (
          <div className="live-voice-current-line" aria-live="polite">
            <span className="live-voice-current-line__label">
              {language === 'ms' ? 'Sedang bercakap' : 'Speaking'}
            </span>
            <p className="live-voice-current-line__text">{voice.currentSentence}</p>
          </div>
        ) : null}

        <div className="live-voice-captions">
          <article className={userCaption ? 'has-content' : 'empty'}>
            <span>{language === 'ms' ? 'Anda' : 'You'}</span>
            <p>
              {userCaption || (language === 'ms'
                ? 'Transkrip suara akan muncul di sini.'
                : 'Your speech transcript will appear here.')}
            </p>
          </article>
          <article className={assistantCaption ? 'has-content' : 'empty'}>
            <span>MajlisMate</span>
            <p ref={captionRef}>
              {streamingSentences.length > 0 ? (
                <span className="live-voice-sentences">
                  {streamingSentences.map((sentence, index) => (
                    <span
                      key={`${index}-${sentence.slice(0, 8)}`}
                      data-sentence-index={index}
                      className={`live-voice-sentence ${index === voice.currentSentenceIndex ? 'is-current' : ''} ${index < voice.currentSentenceIndex ? 'is-past' : ''}`}
                    >
                      {sentence}
                    </span>
                  ))}
                </span>
              ) : (
                assistantCaption || (language === 'ms'
                  ? 'Jawapan suara akan muncul di sini.'
                  : 'The spoken reply will appear here.')
              )}
            </p>
          </article>
        </div>

        <div className="live-voice-actions">
          {isUnavailable ? (
            <button
              type="button"
              className="live-voice-cta"
              onClick={() => {
                voice.stop();
                onClose();
              }}
            >
              {language === 'ms' ? 'Tutup' : 'Close'}
            </button>
          ) : isTtsOnly ? (
            <button
              type="button"
              className="live-voice-secondary"
              onClick={() => {
                voice.stop();
                onClose();
              }}
            >
              {language === 'ms' ? 'Guna chat biasa' : 'Use text chat'}
            </button>
          ) : isFallback ? (
            <>
              <button
                type="button"
                className="live-voice-secondary"
                onClick={() => {
                  voice.stop();
                  onClose();
                }}
              >
                {language === 'ms' ? 'Guna chat biasa' : 'Use text chat'}
              </button>
              <button type="button" className="live-voice-cta" onClick={() => voice.pushToTalk()}>
                {language === 'ms' ? 'Cuba voice percuma' : 'Try free voice'}
              </button>
            </>
          ) : voice.mode === 'push-to-talk' && (phase === 'idle' || phase === 'error') ? (
            <button
              type="button"
              className="live-voice-cta live-voice-cta--hold"
              aria-label={language === 'ms' ? 'Tahan untuk bercakap' : 'Hold to talk'}
              onPointerDown={(event) => {
                event.preventDefault();
                void voice.pushToTalk();
              }}
              onPointerUp={() => voice.stop()}
              onPointerCancel={() => voice.stop()}
              onPointerLeave={(event) => {
                if (event.buttons > 0) voice.stop();
              }}
            >
              <span className="live-voice-cta__pulse" aria-hidden="true" />
              {language === 'ms' ? 'Tahan untuk bercakap' : 'Hold to talk'}
            </button>
          ) : phase === 'idle' || phase === 'error' ? (
            <button type="button" className="live-voice-cta" onClick={() => voice.pushToTalk()}>
              {language === 'ms' ? 'Mula bercakap' : 'Start talking'}
            </button>
          ) : (
            <button
              type="button"
              className="live-voice-cta live-voice-cta--active"
              onClick={() => voice.stop()}
            >
              {language === 'ms' ? 'Berhenti' : 'Stop'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
