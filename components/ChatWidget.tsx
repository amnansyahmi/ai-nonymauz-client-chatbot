'use client';

import { FormEvent, RefObject } from 'react';
import type { Message } from './planner/types';

type ChatWidgetProps = {
  messages: Message[];
  input: string;
  loading?: boolean;
  placeholder: string;
  submitLabel?: string;
  loadingLabel?: string;
  emptyTypingLabel?: string;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
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
  messagesEndRef,
  onInputChange,
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
                  <strong>Sources:</strong>
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
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={placeholder}
          aria-label="Question"
        />
        <button type="submit" disabled={loading || input.trim().length < 2}>
          {loading ? loadingLabel : submitLabel}
        </button>
      </form>
    </>
  );
}
