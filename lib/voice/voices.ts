import type { AppLanguage } from '../../components/planner/types';

export type VoiceQuality = 'high' | 'medium' | 'low';

export type ScoredVoice = {
  voice: SpeechSynthesisVoice;
  score: number;
  reason: string;
};

const HIGH_QUALITY_VOICE_HINTS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  { pattern: /^Google\s+/i, weight: 30, label: 'Google' },
  { pattern: /^Microsoft\s+/i, weight: 26, label: 'Microsoft' },
  { pattern: /^Samantha$/i, weight: 28, label: 'Samantha' },
  { pattern: /^Karen$/i, weight: 26, label: 'Karen' },
  { pattern: /^Daniel$/i, weight: 24, label: 'Daniel' },
  { pattern: /^Moira$/i, weight: 24, label: 'Moira' },
  { pattern: /^Tessa$/i, weight: 24, label: 'Tessa' },
  { pattern: /^Aria$/i, weight: 22, label: 'Aria' },
  { pattern: /^Jenny\b/i, weight: 22, label: 'Jenny' },
  { pattern: /^Guy\b/i, weight: 18, label: 'Guy' },
  { pattern: /^Microsoft\s+Rizwan/i, weight: 28, label: 'Microsoft Rizwan' },
  { pattern: /^Microsoft\s+Yasmin/i, weight: 28, label: 'Microsoft Yasmin' }
];

const LANGUAGE_TAGS: Record<AppLanguage, { primary: string; secondary: string[]; fallback: string[] }> = {
  en: { primary: 'en-US', secondary: ['en-GB', 'en-AU', 'en-IN', 'en'], fallback: [] },
  ms: { primary: 'ms-MY', secondary: ['ms'], fallback: ['id-ID', 'id'] }
};

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
}

export function scoreVoices(voices: SpeechSynthesisVoice[], language: AppLanguage): ScoredVoice[] {
  const tags = LANGUAGE_TAGS[language];
  const primary = tags.primary.toLowerCase();
  const secondary = tags.secondary.map((tag) => tag.toLowerCase());
  const fallback = tags.fallback.map((tag) => tag.toLowerCase());

  return voices
    .map((voice) => {
      const name = voice.name;
      const lang = voice.lang.toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      if (voice.localService) {
        score += 8;
        reasons.push('local');
      }

      if (voice.default) {
        score += 4;
        reasons.push('default');
      }

      if (lang === primary) {
        score += language === 'ms' ? 80 : 30;
        reasons.push('primary-lang');
      } else if (secondary.some((tag) => lang === tag || lang.startsWith(`${tag}-`))) {
        score += language === 'ms' ? 24 : 12;
        reasons.push('secondary-lang');
      } else if (fallback.some((tag) => lang === tag || lang.startsWith(`${tag}-`))) {
        score += language === 'ms' ? 4 : 8;
        reasons.push('fallback-lang');
      } else if (lang.startsWith(tags.primary.slice(0, 2))) {
        score += 6;
        reasons.push('family-lang');
      }

      for (const hint of HIGH_QUALITY_VOICE_HINTS) {
        if (hint.pattern.test(name)) {
          score += hint.weight;
          reasons.push(hint.label);
          break;
        }
      }

      return { voice, score, reason: reasons.join(', ') || 'fallback' };
    })
    .sort((a, b) => b.score - a.score);
}

export function pickBestVoice(voices: SpeechSynthesisVoice[], language: AppLanguage): ScoredVoice | null {
  const scored = scoreVoices(voices, language);
  return scored[0] ?? null;
}

export function listVoicesForLanguage(voices: SpeechSynthesisVoice[], language: AppLanguage): ScoredVoice[] {
  return scoreVoices(voices, language);
}
