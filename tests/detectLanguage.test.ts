import { describe, expect, it } from 'vitest';
import { detectLanguage, isConfident } from '../lib/voice/languages';

describe('detectLanguage', () => {
  it('returns unknown with zero confidence for empty input', () => {
    const result = detectLanguage('');
    expect(result.language).toBe('unknown');
    expect(result.confidence).toBe(0);
    expect(result.tokenCount).toBe(0);
  });

  it('detects Malay in a Malay-heavy transcript', () => {
    const result = detectLanguage('Saya nak tanya pasal majlis kahwin saya dan bajet saya');
    expect(result.language).toBe('ms');
    expect(result.confidence).toBeGreaterThan(0.4);
    expect(result.malayScore).toBeGreaterThan(0);
  });

  it('detects English in an English-heavy transcript', () => {
    const result = detectLanguage('Can you help me with my wedding checklist and budget please');
    expect(result.language).toBe('en');
    expect(result.confidence).toBeGreaterThan(0.4);
    expect(result.englishScore).toBeGreaterThan(0);
  });

  it('returns unknown when both sides are tied or no clear signal', () => {
    expect(detectLanguage('majlis wedding').language).toBe('unknown');
  });

  it('handles short utterances conservatively', () => {
    const msResult = detectLanguage('saya');
    expect(msResult.language).toBe('ms');
    const enResult = detectLanguage('please');
    expect(enResult.language).toBe('en');
  });

  it('strips punctuation and casing before scoring', () => {
    expect(detectLanguage('SAYA NAK TANYA!').language).toBe('ms');
    expect(detectLanguage('CAN YOU HELP ME?').language).toBe('en');
  });

  it('returns lower confidence when dominance is split across many tokens', () => {
    // 1 Malay + 4 English of 5 tokens: dominance 3/4, coverage 5/5
    // confidence = 0.75 * 0.6 + 1.0 * 0.4 = 0.85
    const strongEnglish = detectLanguage('wedding budget checklist vendors please');
    expect(strongEnglish.language).toBe('en');

    // 1 Malay + 1 English of 5 tokens: dominant wins but confidence is low
    // dominance = 0, tie → returns unknown
    const mixedTie = detectLanguage('saya please foo bar baz');
    expect(mixedTie.language).toBe('unknown');
  });

  it('returns confidence 0 when nothing is recognized', () => {
    const result = detectLanguage('qqqq xxxx zzzz');
    expect(result.language).toBe('unknown');
    expect(result.confidence).toBe(0);
  });
});

describe('isConfident', () => {
  it('returns false for unknown detection', () => {
    expect(isConfident(detectLanguage('qqqq xxxx'))).toBe(false);
  });

  it('returns true when detection language and confidence exceed threshold', () => {
    expect(isConfident(detectLanguage('saya nak tolong saya dengan majlis saya'))).toBe(true);
  });

  it('respects a custom threshold', () => {
    const result = detectLanguage('saya nak tolong dengan majlis');
    expect(isConfident(result, 0.99)).toBe(false);
  });
});
