'use client';

import { useEffect, useRef, useState } from 'react';

export type WaveformProps = {
  active: boolean;
  rms: number;
  bars?: number;
  height?: number;
  color?: string;
};

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MIN_BAR = 0.1;

export default function Waveform({ active, rms, bars = 32, height = 56, color = 'currentColor' }: WaveformProps) {
  const [samples, setSamples] = useState<number[]>(() => Array.from({ length: bars }, () => MIN_BAR));
  const samplesRef = useRef<number[]>(samples);
  samplesRef.current = samples;

  useEffect(() => {
    if (!active) {
      setSamples(Array.from({ length: bars }, () => MIN_BAR));
      return;
    }
    let raf: number;
    const tick = () => {
      const next = samplesRef.current.slice();
      // Shift in the new RMS at the rightmost bar
      next.shift();
      const target = Math.max(MIN_BAR, Math.min(1, rms));
      next.push(target);
      setSamples(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, rms, bars]);

  return (
    <div
      className="waveform"
      style={{ height, color }}
      role="presentation"
      aria-hidden="true"
    >
      {samples.map((value, index) => {
        const display = Math.max(MIN_BAR, value);
        return (
          <span
            key={index}
            className="waveform__bar"
            style={{
              height: `${display * 100}%`,
              width: BAR_WIDTH,
              marginRight: BAR_GAP
            }}
          />
        );
      })}
    </div>
  );
}
