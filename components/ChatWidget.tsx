'use client';

import { FormEvent, RefObject } from 'react';
import type { Message } from './planner/types';
import Composer from './ui/Composer';

type ChatWidgetProps = {
  messages: Message[];
  input: string;
  loading?: boolean;
  placeholder: string;
  submitLabel?: string;
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

      <Composer
        input={input}
        placeholder={placeholder}
        inputAriaLabel={inputAriaLabel}
        submitLabel={submitLabel}
        dictateLabel={dictateLabel}
        voiceLabel={voiceLabel}
        language={language}
        disabled={loading}
        commandSuggestions={commandSuggestions}
        onCommandSuggestion={onCommandSuggestion}
        onInputChange={onInputChange}
        onSubmit={onSubmit}
      />
    </>
  );
}
