'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type ComposerProps = {
  className?: string;
  input: string;
  placeholder: string;
  inputAriaLabel: string;
  submitLabel?: string;
  dictateLabel?: string;
  voiceLabel?: string;
  language?: 'ms' | 'en';
  disabled?: boolean;
  minSubmitLength?: number;
  commandSuggestions?: string[];
  showDictate?: boolean;
  showVoiceWhenEmpty?: boolean;
  onInputChange: (value: string) => void;
  onCommandSuggestion?: (value: string) => void;
  onVoiceMode?: () => void;
  onSubmit: (event: FormEvent) => void;
};

function SendIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12 20 4l-4 16-4.5-6.5L4 12Z" />
      <path d="m11.5 13.5 4.5-5.5" />
    </svg>
  );
}

function DictateIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 10v4M10 6v12M14 8v8M18 11v2" />
    </svg>
  );
}

export default function Composer({
  className = 'chat-form',
  input,
  placeholder,
  inputAriaLabel,
  submitLabel = 'Send',
  dictateLabel = 'Dictate',
  voiceLabel = 'Voice',
  language = 'ms',
  disabled = false,
  minSubmitLength = 2,
  commandSuggestions = [],
  showDictate = true,
  showVoiceWhenEmpty = true,
  onInputChange,
  onCommandSuggestion,
  onVoiceMode,
  onSubmit
}: ComposerProps) {
  const [isDictating, setIsDictating] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const hasInput = input.trim().length >= minSubmitLength;
  const canSubmit = hasInput && !disabled;

  // Auto-resize textarea to fit content, up to max-height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        formRef.current?.requestSubmit();
      }
    }
  }

  function toggleDictation() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceNotice(language === 'en' ? 'Dictation is not supported in this browser.' : 'Dictation tidak disokong dalam browser ini.');
      return;
    }

    if (isDictating && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsDictating(false);
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'en' ? 'en-US' : 'ms-MY';
    const startingInput = input.trim();

    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      onInputChange([startingInput, transcript.trim()].filter(Boolean).join(' '));
    };
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => {
      setIsDictating(false);
      setVoiceNotice(language === 'en' ? 'Could not start dictation.' : 'Dictation tidak dapat dimulakan.');
    };

    setVoiceNotice('');
    setIsDictating(true);
    recognition.start();
  }

  function handleVoiceMode() {
    if (onVoiceMode) {
      onVoiceMode();
      return;
    }
    setVoiceNotice(language === 'en' ? 'Voice chat is coming soon. Use dictation for now.' : 'Voice chat akan datang. Buat masa ini guna dictation dulu.');
  }

  return (
    <form ref={formRef} className={className} onSubmit={onSubmit}>
      {commandSuggestions.length > 0 ? (
        <div className="composer-suggestions" aria-label="Suggested commands">
          {commandSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => (onCommandSuggestion ? onCommandSuggestion(suggestion) : onInputChange(suggestion))}
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        className="composer-input"
        value={input}
        rows={1}
        placeholder={placeholder}
        aria-label={inputAriaLabel}
        autoComplete="off"
        spellCheck
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      {showDictate ? (
        <button
          type="button"
          className={`composer-icon-button composer-dictate-button ${isDictating ? 'active' : ''}`}
          aria-label={dictateLabel}
          aria-pressed={isDictating}
          onClick={toggleDictation}
        >
          <DictateIcon />
        </button>
      ) : null}
      <button
        type={canSubmit ? 'submit' : 'button'}
        className={`composer-voice-button composer-send-button ${canSubmit ? 'has-input' : ''}`}
        disabled={disabled || (!showVoiceWhenEmpty && !hasInput)}
        aria-label={canSubmit ? submitLabel : voiceLabel}
        onClick={canSubmit ? undefined : handleVoiceMode}
      >
        {canSubmit ? <SendIcon /> : showVoiceWhenEmpty ? <VoiceIcon /> : <SendIcon />}
      </button>
      {voiceNotice ? <p className="composer-notice">{voiceNotice}</p> : null}
    </form>
  );
}
