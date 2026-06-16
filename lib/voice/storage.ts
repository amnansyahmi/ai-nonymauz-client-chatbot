import type { ScoredVoice } from './voices';

const STORAGE_KEY = 'majlismate.voicePreferences.v1';

export type VoiceMode = 'continuous' | 'push-to-talk';

export type VoicePreferences = {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  autoSpeak: boolean;
  bargeIn: boolean;
  mode: VoiceMode;
  greeting: boolean;
};

const DEFAULTS: VoicePreferences = {
  voiceURI: null,
  rate: 0.95,
  pitch: 1,
  autoSpeak: true,
  bargeIn: true,
  mode: 'continuous',
  greeting: true
};

export function loadVoicePreferences(): VoicePreferences {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<VoicePreferences>;
    return {
      voiceURI: typeof parsed.voiceURI === 'string' ? parsed.voiceURI : null,
      rate: clamp(parsed.rate ?? DEFAULTS.rate, 0.5, 2),
      pitch: clamp(parsed.pitch ?? DEFAULTS.pitch, 0.5, 2),
      autoSpeak: parsed.autoSpeak ?? DEFAULTS.autoSpeak,
      bargeIn: parsed.bargeIn ?? DEFAULTS.bargeIn,
      mode: parsed.mode === 'push-to-talk' ? 'push-to-talk' : 'continuous',
      greeting: parsed.greeting ?? DEFAULTS.greeting
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveVoicePreferences(prefs: Partial<VoicePreferences>): VoicePreferences {
  const merged: VoicePreferences = { ...loadVoicePreferences(), ...prefs };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {}
  }
  return merged;
}

export function findSavedVoice(voices: ScoredVoice[], uri: string | null): ScoredVoice | null {
  if (!uri) return null;
  return voices.find((scored) => scored.voice.voiceURI === uri) ?? null;
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
