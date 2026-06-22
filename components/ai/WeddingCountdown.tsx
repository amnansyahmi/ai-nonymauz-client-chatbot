'use client';

import { useEffect, useState } from 'react';

type CountdownProps = {
  weddingDate: string | undefined;
  language?: 'ms' | 'en';
};

type CountdownState = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  passed: boolean;
};

function computeCountdown(target: Date, now: Date): CountdownState {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, passed: false };
}

function milestoneEmoji(days: number): string {
  if (days <= 0) return '🥹';
  if (days <= 1) return '🥹';
  if (days <= 7) return '🥳';
  if (days <= 30) return '💍';
  if (days <= 100) return '🎊';
  return '🎉';
}

function formatWeddingDate(date: Date, language: 'ms' | 'en'): string {
  try {
    const locale = language === 'ms' ? 'ms-MY' : 'en-MY';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

/**
 * Big, celebratory wedding countdown. Auto-updates every second and
 * surfaces friendly milestone emojis as the date approaches. Pure
 * client-side, no API.
 */
export default function WeddingCountdown({ weddingDate, language = 'ms' }: CountdownProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!weddingDate) return null;
  const target = new Date(`${weddingDate}T08:00:00`);
  if (Number.isNaN(target.getTime())) return null;

  const state = now ? computeCountdown(target, now) : null;
  if (!state) return null;

  const isMs = language === 'ms';

  if (state.passed) {
    return (
      <div className="wedding-countdown wedding-countdown--passed">
        <span className="wedding-countdown__emoji" aria-hidden="true">💕</span>
        <div>
          <strong>{isMs ? 'Tahniah!' : 'Congratulations!'}</strong>
          <p>{isMs ? 'Majlis anda telah berlangsung. Semoga berbahagia!' : 'Your wedding has taken place. Wishing you happiness!'}</p>
        </div>
      </div>
    );
  }

  const weeks = Math.floor(state.days / 7);
  const months = Math.floor(state.days / 30);
  const emoji = milestoneEmoji(state.days);

  return (
    <div className="wedding-countdown" aria-live="polite">
      <div className="wedding-countdown__hero">
        <span className="wedding-countdown__emoji" aria-hidden="true">{emoji}</span>
        <div>
          <p className="eyebrow">{isMs ? 'Kira detik' : 'Countdown'}</p>
          <strong className="wedding-countdown__days">
            {state.days} {isMs ? 'hari' : 'days'}
          </strong>
        </div>
      </div>
      <div className="wedding-countdown__units">
        <div>
          <strong>{String(state.hours).padStart(2, '0')}</strong>
          <span>{isMs ? 'jam' : 'hours'}</span>
        </div>
        <div>
          <strong>{String(state.minutes).padStart(2, '0')}</strong>
          <span>{isMs ? 'minit' : 'minutes'}</span>
        </div>
        <div>
          <strong>{String(state.seconds).padStart(2, '0')}</strong>
          <span>{isMs ? 'saat' : 'seconds'}</span>
        </div>
      </div>
      <p className="wedding-countdown__date">
        {formatWeddingDate(target, language)}
      </p>
      <p className="wedding-countdown__hint">
        {months > 0
          ? isMs ? `${months} bulan · ${weeks} minggu lagi` : `${months} months · ${weeks} weeks to go`
          : isMs ? `${weeks} minggu lagi` : `${weeks} weeks to go`}
      </p>
    </div>
  );
}
