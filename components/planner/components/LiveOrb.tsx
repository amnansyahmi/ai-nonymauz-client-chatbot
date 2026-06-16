'use client';

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

export type LiveOrbProps = {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'requesting-mic';
  rms?: number;
  ttsSentence?: number;
  size?: number;
};

const STATE_LABEL: Record<LiveOrbProps['state'], string> = {
  idle: 'Ready',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  error: 'Try again',
  'requesting-mic': 'Connecting'
};

export default function LiveOrb({
  state,
  rms = 0,
  ttsSentence = 0,
  size = 200
}: LiveOrbProps): ReactElement {
  const safeRms = Math.max(0, Math.min(1, rms));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (state !== 'speaking') return;
    const interval = window.setInterval(() => setTick((current) => current + 1), 90);
    return () => window.clearInterval(interval);
  }, [state]);

  // Re-key the speaking animation on every new sentence so the orb visibly "pops" between sentences
  const animationKey = state === 'speaking' ? `speaking-${ttsSentence}` : state;

  let coreScale: number;
  if (state === 'listening') {
    coreScale = 0.85 + safeRms * 0.4;
  } else if (state === 'speaking') {
    // Simulated speech envelope: a slow 0.85→1.08→0.9 oscillation that gives the orb
    // a "breathing" feel even though the Web Speech API doesn't expose output amplitude
    const phase = Math.sin(tick / 4) * 0.12 + Math.sin(tick / 9) * 0.06;
    coreScale = 0.95 + phase;
  } else {
    coreScale = 1;
  }

  const ringOpacity = state === 'listening' ? 0.15 + safeRms * 0.55 : 0.18;
  const showPulse = state === 'thinking' || state === 'speaking';

  const showMic = state === 'idle' || state === 'error';

  return (
    <div
      key={animationKey}
      className={`live-orb live-orb--${state}`}
      style={{ width: size, height: size }}
      aria-label={STATE_LABEL[state]}
      role="img"
    >
      <span className="live-orb__ring live-orb__ring--outer" style={{ opacity: ringOpacity }} />
      <span className="live-orb__ring live-orb__ring--mid" style={{ opacity: ringOpacity * 0.7 }} />
      <span className="live-orb__core" style={{ transform: `scale(${coreScale})` }} />
      {showPulse ? <span className="live-orb__pulse" /> : null}
      {showMic ? (
        <svg
          className="live-orb__mic-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      ) : null}
    </div>
  );
}


