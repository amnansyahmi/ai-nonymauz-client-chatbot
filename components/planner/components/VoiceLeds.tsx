'use client';

import type { ReactElement } from 'react';

export type VoiceLedsProps = {
  active: boolean;
  rms: number;
  count?: number;
  color?: string;
  size?: 'sm' | 'md';
};

const TONES: Array<{ stop: number; color: string }> = [
  { stop: 0.18, color: '#34d399' },
  { stop: 0.36, color: '#a3e635' },
  { stop: 0.54, color: '#facc15' },
  { stop: 0.72, color: '#fb923c' },
  { stop: 0.9, color: '#f87171' }
];

/**
 * A row of voice activity LEDs. Each dot's opacity/scale is driven by the
 * current RMS value with a small per-dot delay so the row reads as a "running
 * light" (echoing the Siri / Google Assistant mic indicator).
 */
export default function VoiceLeds({
  active,
  rms,
  count = 5,
  color,
  size = 'md'
}: VoiceLedsProps): ReactElement {
  const safeRms = Math.max(0, Math.min(1, rms));
  const dimension = size === 'sm' ? 8 : 11;
  const gap = size === 'sm' ? 4 : 6;
  const litCount = Math.round(safeRms * count * 1.4);

  return (
    <div
      className={`voice-leds ${active ? 'is-active' : 'is-idle'}`}
      role="presentation"
      aria-hidden="true"
      style={{ gap }}
    >
      {Array.from({ length: count }, (_, index) => {
        const isLit = active && index < litCount;
        const tone = color ? null : TONES[Math.min(index, TONES.length - 1)];
        const fill = color ?? tone!.color;
        return (
          <span
            key={index}
            className={`voice-led ${isLit ? 'is-lit' : ''}`}
            style={{
              width: dimension,
              height: dimension,
              background: fill,
              animationDelay: `${index * 70}ms`
            }}
          />
        );
      })}
    </div>
  );
}
