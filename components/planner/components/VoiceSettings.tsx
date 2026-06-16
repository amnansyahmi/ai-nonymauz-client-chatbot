'use client';

import { useState } from 'react';
import type { ScoredVoice } from '../../../lib/voice/voices';
import type { VoicePreferences } from '../../../lib/voice/storage';
import type { AppLanguage } from '../types';
import type { VoiceMode } from '../../../lib/voice/storage';

export type VoiceSettingsProps = {
  language: AppLanguage;
  preferences: VoicePreferences;
  voices: ScoredVoice[];
  selectedVoiceURI: string | null;
  mode: VoiceMode;
  onChange: (patch: Partial<VoicePreferences>) => void;
  onModeChange: (mode: VoiceMode) => void;
  onClose: () => void;
};

export default function VoiceSettings({
  language,
  preferences,
  voices,
  selectedVoiceURI,
  mode,
  onChange,
  onModeChange,
  onClose
}: VoiceSettingsProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        aria-label={language === 'ms' ? 'Tetapan suara' : 'Voice settings'}
        onClick={() => setOpen(true)}
        className="voice-settings__trigger"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="voice-settings" role="dialog" aria-label={language === 'ms' ? 'Tetapan suara' : 'Voice settings'}>
      <div className="voice-settings__header">
        <strong>{language === 'ms' ? 'Tetapan suara' : 'Voice settings'}</strong>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onClose();
          }}
          aria-label={language === 'ms' ? 'Tutup tetapan' : 'Close settings'}
        >
          ×
        </button>
      </div>

      <label className="voice-settings__row">
        <span>{language === 'ms' ? 'Mod' : 'Mode'}</span>
        <select
          value={mode}
          onChange={(event) => onModeChange(event.target.value as VoiceMode)}
        >
          <option value="continuous">{language === 'ms' ? 'Auto (hands-free)' : 'Auto (hands-free)'}</option>
          <option value="push-to-talk">{language === 'ms' ? 'Push-to-talk' : 'Push-to-talk'}</option>
        </select>
      </label>

      <label className="voice-settings__row">
        <span>{language === 'ms' ? 'Suara' : 'Voice'}</span>
        <select
          value={selectedVoiceURI ?? ''}
          onChange={(event) => onChange({ voiceURI: event.target.value || null })}
        >
          <option value="">{language === 'ms' ? 'Auto (paling sesuai)' : 'Auto (best match)'}</option>
          {voices.map((scored) => (
            <option key={scored.voice.voiceURI} value={scored.voice.voiceURI}>
              {scored.voice.name} ({scored.voice.lang})
            </option>
          ))}
        </select>
      </label>

      <label className="voice-settings__row">
        <span>{language === 'ms' ? 'Kelajuan' : 'Speed'}</span>
        <input
          type="range"
          min={0.7}
          max={1.3}
          step={0.05}
          value={preferences.rate}
          onChange={(event) => onChange({ rate: Number(event.target.value) })}
        />
        <output>{preferences.rate.toFixed(2)}x</output>
      </label>

      <label className="voice-settings__row">
        <input
          type="checkbox"
          checked={preferences.bargeIn}
          onChange={(event) => onChange({ bargeIn: event.target.checked })}
        />
        <span>{language === 'ms' ? 'Boleh interrupt AI' : 'Allow interrupting AI'}</span>
      </label>

      <label className="voice-settings__row">
        <input
          type="checkbox"
          checked={preferences.greeting}
          onChange={(event) => onChange({ greeting: event.target.checked })}
        />
        <span>
          {language === 'ms'
            ? 'Sapa saya bila buka live voice'
            : 'Greet me when I open live voice'}
        </span>
      </label>
    </div>
  );
}
