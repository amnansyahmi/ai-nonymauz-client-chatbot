'use client';

import { useEffect, useState } from 'react';
import { ThumbsDownIcon, ThumbsUpIcon } from './icons';

const STORAGE_KEY = 'mm-message-feedback';

export type MessageFeedbackValue = 'up' | 'down';

export type StoredFeedback = {
  id: string;
  rating: MessageFeedbackValue;
  content: string;
  timestamp: string;
};

function readAll(): StoredFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredFeedback[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: StoredFeedback[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore quota / private-mode errors
  }
}

type MessageFeedbackProps = {
  messageId: string;
  content: string;
  onFeedback?: (entry: StoredFeedback) => void;
};

export default function MessageFeedback({ messageId, content, onFeedback }: MessageFeedbackProps) {
  const [rating, setRating] = useState<MessageFeedbackValue | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const entries = readAll();
    const existing = entries.find((entry) => entry.id === messageId);
    if (existing) setRating(existing.rating);
    setHydrated(true);
  }, [messageId]);

  const handleRate = (next: MessageFeedbackValue) => {
    setRating(next);
    const entry: StoredFeedback = {
      id: messageId,
      rating: next,
      content: content.slice(0, 200),
      timestamp: new Date().toISOString()
    };
    const all = readAll().filter((existing) => existing.id !== messageId);
    writeAll([entry, ...all].slice(0, 200));
    onFeedback?.(entry);
  };

  return (
    <div className="message-feedback" role="group" aria-label="Rate this response">
      <button
        type="button"
        className={`message-feedback__btn ${rating === 'up' ? 'is-active' : ''}`}
        onClick={() => handleRate('up')}
        aria-pressed={rating === 'up'}
        aria-label="Helpful response"
        title="Helpful"
        data-event="feedback_thumbs_up"
        disabled={!hydrated}
      >
        <ThumbsUpIcon size={14} />
      </button>
      <button
        type="button"
        className={`message-feedback__btn ${rating === 'down' ? 'is-active' : ''}`}
        onClick={() => handleRate('down')}
        aria-pressed={rating === 'down'}
        aria-label="Not helpful"
        title="Not helpful"
        data-event="feedback_thumbs_down"
        disabled={!hydrated}
      >
        <ThumbsDownIcon size={14} />
      </button>
    </div>
  );
}
