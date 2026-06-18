import { describe, expect, it } from 'vitest';
import { detectLanguage } from '../lib/voice/languages';

/**
 * Mirror of the litCount formula used inside the VoiceLeds component so we
 * can test the mapping from RMS to number-of-lit-dots without a JSX runtime.
 */
function computeLitCount(rms: number, count: number): number {
  const safeRms = Math.max(0, Math.min(1, rms));
  return Math.round(safeRms * count * 1.4);
}

describe('VoiceLeds litCount formula', () => {
  it('lights up more dots as RMS increases', () => {
    expect(computeLitCount(0, 5)).toBe(0);
    expect(computeLitCount(0.25, 5)).toBe(2);
    expect(computeLitCount(0.5, 5)).toBe(4);
    expect(computeLitCount(0.9, 5)).toBe(6);
  });

  it('respects the count prop', () => {
    expect(computeLitCount(0.5, 3)).toBe(2);
    expect(computeLitCount(0.5, 7)).toBe(5);
  });

  it('clamps RMS to [0, 1]', () => {
    expect(computeLitCount(-0.5, 5)).toBe(0);
    expect(computeLitCount(1.5, 5)).toBe(7);
  });
});

describe('detectLanguage integration with litCount', () => {
  it('detects ms and the LED count stays consistent for a Malay utterance', () => {
    const detected = detectLanguage('Saya nak tanya pasal majlis kahwin saya');
    expect(detected.language).toBe('ms');
    expect(computeLitCount(0.4, 5)).toBe(3);
  });
});
