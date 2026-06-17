'use client';

import type { AppLanguage } from '../types';
import type { WeeklyBriefing as Briefing } from '../../../lib/planner/weeklyBriefing';

type Props = {
  briefing: Briefing;
  language: AppLanguage;
  isSpeaking: boolean;
  canSpeak: boolean;
  onSpeak: () => void;
  onStopSpeak: () => void;
  onAsk: () => void;
};

function ToneIcon({ tone }: { tone: Briefing['items'][number]['tone'] }) {
  if (tone === 'urgent') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z" />
      </svg>
    );
  }
  if (tone === 'good') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

export default function WeeklyBriefing({
  briefing,
  language,
  isSpeaking,
  canSpeak,
  onSpeak,
  onStopSpeak,
  onAsk
}: Props) {
  const isMs = language === 'ms';

  return (
    <section className="weekly-briefing" aria-label={isMs ? 'Ringkasan mingguan' : 'Weekly briefing'}>
      <div className="weekly-briefing__head">
        <div className="weekly-briefing__intro">
          <span className="weekly-briefing__eyebrow">{isMs ? 'Fokus minggu ini' : 'This week’s focus'}</span>
          <h3 className="weekly-briefing__greeting">{briefing.greeting}</h3>
          <p className="weekly-briefing__headline">{briefing.headline}</p>
        </div>
        <div className="weekly-briefing__actions">
          {canSpeak ? (
            isSpeaking ? (
              <button type="button" className="weekly-briefing__btn is-speaking" onClick={onStopSpeak}>
                <span className="weekly-briefing__pulse" aria-hidden="true" />
                {isMs ? 'Berhenti' : 'Stop'}
              </button>
            ) : (
              <button type="button" className="weekly-briefing__btn" onClick={onSpeak}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5 6 9H2v6h4l5 4z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
                </svg>
                {isMs ? 'Dengar' : 'Listen'}
              </button>
            )
          ) : null}
          <button type="button" className="weekly-briefing__btn weekly-briefing__btn--primary" onClick={onAsk}>
            {isMs ? 'Tanya AI' : 'Ask AI'}
          </button>
        </div>
      </div>

      <ul className="weekly-briefing__list">
        {briefing.items.map((item) => (
          <li key={item.key} className={`weekly-briefing__item tone-${item.tone}`}>
            <span className="weekly-briefing__item-icon" aria-hidden="true">
              <ToneIcon tone={item.tone} />
            </span>
            <span className="weekly-briefing__item-text">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
