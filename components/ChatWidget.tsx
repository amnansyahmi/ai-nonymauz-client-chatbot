'use client';

import { FormEvent, RefObject, useRef, useState } from 'react';
import type { Message } from './planner/types';

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

type ChatWidgetProps = {
  messages: Message[];
  input: string;
  loading?: boolean;
  placeholder: string;
  submitLabel?: string;
  loadingLabel?: string;
  emptyTypingLabel?: string;
  sourcesLabel?: string;
  inputAriaLabel?: string;
  language?: 'ms' | 'en';
  dictateLabel?: string;
  voiceLabel?: string;
  commandSuggestions?: string[];
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onCommandSuggestion?: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export default function ChatWidget({
  messages,
  input,
  loading = false,
  placeholder,
  submitLabel = 'Send',
  loadingLabel = 'Sending...',
  emptyTypingLabel = 'AI is typing...',
  sourcesLabel = 'Sources:',
  inputAriaLabel = 'Question',
  language = 'ms',
  dictateLabel = 'Dictate',
  voiceLabel = 'Voice',
  commandSuggestions = [],
  messagesEndRef,
  onInputChange,
  onCommandSuggestion,
  onSubmit
}: ChatWidgetProps) {
  const [isDictating, setIsDictating] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState('');
  const recognitionRef = useRef<InstanceType<SpeechRecognitionConstructor> | null>(null);

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
    setVoiceNotice(language === 'en' ? 'Voice chat is coming soon. Use dictation for now.' : 'Voice chat akan datang. Buat masa ini guna dictation dulu.');
  }

  return (
    <>
      <div className="messages">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`message ${message.role}`}>
            <div className="bubble">
              {message.content ? (
                message.content.split('\n').map((line, lineIndex) => <p key={lineIndex}>{line || '\u00a0'}</p>)
              ) : (
                <p className="typing">{emptyTypingLabel}</p>
              )}
              {message.sources && message.sources.length > 0 ? (
                <div className="sources">
                  <strong>{sourcesLabel}</strong>
                  {message.sources.map((source) => (
                    <span key={source.id}>{source.title}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
        {messagesEndRef ? <div ref={messagesEndRef} /> : null}
      </div>

      <form className="chat-form" onSubmit={onSubmit}>
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
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
        />
        <button
          type="button"
          className={`composer-icon-button composer-dictate-button ${isDictating ? 'active' : ''}`}
          aria-label={dictateLabel}
          aria-pressed={isDictating}
          onClick={toggleDictation}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
          </svg>
        </button>
        <button
          type={input.trim().length >= 2 ? 'submit' : 'button'}
          className={`composer-voice-button ${input.trim().length >= 2 ? 'has-input' : ''}`}
          aria-label={input.trim().length >= 2 ? submitLabel : voiceLabel}
          onClick={input.trim().length >= 2 ? undefined : handleVoiceMode}
        >
          {input.trim().length >= 2 ? (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 12 20 4l-4 16-4.5-6.5L4 12Z" />
              <path d="m11.5 13.5 4.5-5.5" />
            </svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 10v4M10 6v12M14 8v8M18 11v2" />
            </svg>
          )}
        </button>
        {voiceNotice ? <p className="composer-notice">{voiceNotice}</p> : null}
      </form>
    </>
  );
}
