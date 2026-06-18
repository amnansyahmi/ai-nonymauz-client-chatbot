'use client';

import { useEffect, useState } from 'react';
import { buildHighlightPrompt, clearSelection, getSelectionInfo, type HighlightInfo } from '../../lib/ai/highlightToAsk';
import { trackEvent } from '../../lib/analytics';

type HighlightToAskProps = {
  containerRef: React.RefObject<HTMLElement | null>;
  language?: 'ms' | 'en';
  onAsk: (prompt: string) => void;
  disabled?: boolean;
};

/**
 * Floating "Tanya pasal ni" button that appears above selected text
 * inside the chat. Click to pre-fill the composer with a question
 * about the highlighted passage.
 */
export default function HighlightToAsk({ containerRef, language = 'ms', onAsk, disabled }: HighlightToAskProps) {
  const [info, setInfo] = useState<HighlightInfo | null>(null);
  const isMs = language === 'ms';

  useEffect(() => {
    if (disabled) return;
    const container = containerRef.current;
    if (!container) return;

    function onSelectionChange() {
      const next = getSelectionInfo(container);
      setInfo(next);
    }

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [containerRef, disabled]);

  if (!info || disabled) return null;

  // Position above the highlighted text, clamped inside the viewport.
  const top = Math.max(info.containerRect.top, info.rect.top - 40);
  const left = Math.max(8, Math.min(window.innerWidth - 200, info.rect.left));

  function handleAsk() {
    const prompt = buildHighlightPrompt(info!.text, language);
    onAsk(prompt);
    clearSelection();
    setInfo(null);
    trackEvent('highlight_to_ask', { length: info!.text.length });
  }

  return (
    <button
      type="button"
      className="highlight-to-ask"
      style={{ top: `${top}px`, left: `${left}px` }}
      onClick={handleAsk}
      onMouseDown={(event) => event.preventDefault()}
      data-event="highlight_to_ask_click"
      aria-label={isMs ? 'Tanya pasal ni' : 'Ask about this'}
    >
      💬 {isMs ? 'Tanya pasal ni' : 'Ask about this'}
    </button>
  );
}
