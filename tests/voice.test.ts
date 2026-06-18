import { describe, expect, it } from 'vitest';
import { pickBestVoice, scoreVoices } from '../lib/voice/voices';

const englishVoices = [
  { voiceURI: 'a', name: 'Google US English', lang: 'en-US', localService: true, default: false },
  { voiceURI: 'b', name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', localService: false, default: false },
  { voiceURI: 'c', name: 'Samantha', lang: 'en-US', localService: true, default: true },
  { voiceURI: 'd', name: 'Karen', lang: 'en-GB', localService: true, default: false },
  { voiceURI: 'e', name: 'Random French Voice', lang: 'fr-FR', localService: true, default: false }
];

const malayVoices = [
  { voiceURI: 'a', name: 'Google Bahasa Melayu', lang: 'ms-MY', localService: true, default: false },
  { voiceURI: 'b', name: 'Microsoft Rizwan Online (Natural) - Malay (Malaysia)', lang: 'ms-MY', localService: false, default: false },
  { voiceURI: 'c', name: 'Microsoft Yating Online (Natural) - Chinese (Simplified, PRC)', lang: 'zh-CN', localService: false, default: false }
];

describe('pickBestVoice', () => {
  it('prefers local + high-quality English voices', () => {
    const best = pickBestVoice(englishVoices, 'en');
    // Samantha (c) wins over Google (a) due to higher high-quality weight; both are local English.
    expect(best?.voice.voiceURI).toMatch(/[ac]/);
    expect(best?.voice.lang).toBe('en-US');
  });

  it('prefers a Google/MS voice in the target language for Malay', () => {
    const best = pickBestVoice(malayVoices, 'ms');
    expect(best?.voice.lang).toBe('ms-MY');
    expect(['a', 'b']).toContain(best?.voice.voiceURI);
  });

  it('falls back to a non-target language if no match exists', () => {
    const best = pickBestVoice([{ voiceURI: 'z', name: 'Foo', lang: 'de-DE', localService: true, default: false }], 'en');
    expect(best?.voice.voiceURI).toBe('z');
  });

  it('returns null for an empty voice list', () => {
    expect(pickBestVoice([], 'en')).toBeNull();
  });
});

describe('scoreVoices', () => {
  it('sorts voices by descending score', () => {
    const scored = scoreVoices(englishVoices, 'en');
    for (let i = 1; i < scored.length; i += 1) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });
});
