'use client';

import { useEffect, useState } from 'react';
import { clearMemory, extractFacts, loadMemory, memoryToContext, mergeFacts, saveMemory, type MemoryFact } from '../../lib/ai/conversationMemory';
import { trackEvent } from '../../lib/analytics';
import type { Message } from '../planner/types';

type MemoryIndicatorProps = {
  messages: Message[];
  language?: 'ms' | 'en';
};

export default function MemoryIndicator({ messages, language = 'ms' }: MemoryIndicatorProps) {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const isMs = language === 'ms';

  useEffect(() => {
    const existing = loadMemory();
    const extracted = extractFacts(messages);
    const merged = mergeFacts(existing, extracted);
    if (merged.length !== existing.length || extracted.length > 0) {
      saveMemory(merged);
      trackEvent('memory_extracted', { count: extracted.length });
    }
    setFacts(merged);
    setHydrated(true);
  }, [messages]);

  if (!hydrated || facts.length === 0) return null;

  return (
    <div className="memory-indicator">
      <button
        type="button"
        className="memory-indicator__btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        data-event="memory_toggle"
      >
        🧠 {isMs ? `${facts.length} perkara` : `${facts.length} things`}{' '}
        {isMs ? 'AI ingat' : 'AI remembers'}
      </button>
      {open ? (
        <div className="memory-indicator__popover" role="dialog" aria-label={isMs ? 'Apa yang AI ingat' : 'What AI remembers'}>
          <header>
            <strong>{isMs ? 'Apa yang saya tahu tentang kamu' : 'What I know about you'}</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={isMs ? 'Tutup' : 'Close'}
              className="memory-indicator__close"
            >
              ×
            </button>
          </header>
          <p className="memory-indicator__context">{memoryToContext(facts, language)}</p>
          <ul className="memory-indicator__list">
            {facts.map((fact) => (
              <li key={fact.key}>
                <code>{fact.key}</code>
                <span>{fact.value}</span>
              </li>
            ))}
          </ul>
          <footer>
            <button
              type="button"
              className="utility-action"
              onClick={() => {
                clearMemory();
                setFacts([]);
                trackEvent('memory_cleared');
              }}
              data-event="memory_clear"
            >
              {isMs ? 'Lupakan semua' : 'Forget everything'}
            </button>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
