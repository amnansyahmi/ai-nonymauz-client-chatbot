'use client';

import type { ProactiveSuggestion as Suggestion } from '../../lib/ai/proactiveSuggestions';

type ProactiveSuggestionProps = {
  suggestions: Suggestion[];
  language?: 'ms' | 'en';
  onPick: (suggestion: Suggestion) => void;
  onDismiss: (suggestion: Suggestion) => void;
};

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function ProactiveSuggestionCard({
  suggestions,
  language = 'ms',
  onPick,
  onDismiss
}: ProactiveSuggestionProps) {
  if (suggestions.length === 0) return null;
  const isMs = language === 'ms';

  return (
    <div className="proactive-suggestions" aria-label={isMs ? 'Cadangan MajlisMate' : 'MajlisMate suggestions'}>
      <div className="proactive-suggestions__head">
        <span className="proactive-suggestions__icon" aria-hidden="true">
          <SparkleIcon />
        </span>
        <span>{isMs ? 'Boleh saya bantu?' : 'Want a hand?'}</span>
      </div>
      <div className="proactive-suggestions__list">
        {suggestions.map((suggestion) => (
          <article key={suggestion.key} className="proactive-suggestions__card">
            <p>{isMs ? suggestion.promptMs : suggestion.promptEn}</p>
            <div className="proactive-suggestions__actions">
              <button
                type="button"
                className="primary-action proactive-suggestions__cta"
                onClick={() => onPick(suggestion)}
                data-event={`proactive_pick_${suggestion.key}`}
              >
                {isMs ? suggestion.ctaLabelMs : suggestion.ctaLabelEn}
              </button>
              <button
                type="button"
                className="utility-action proactive-suggestions__dismiss"
                onClick={() => onDismiss(suggestion)}
                aria-label={isMs ? 'Langkau' : 'Dismiss'}
                data-event={`proactive_dismiss_${suggestion.key}`}
              >
                ×
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
