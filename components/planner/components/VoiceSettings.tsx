'use client';

import { useState } from 'react';
import type { ScoredVoice } from '@/lib/voice/voices';
import type { VoicePreferences } from '@/lib/voice/storage';
import type { AppLanguage } from '../types';
import type { VoiceMode } from '@/lib/voice/storage';

export type VoiceSettingsProps = {
  language: AppLanguage;
  preferences: VoicePreferences;
  voices: ScoredVoice[];
  selectedVoiceURI: string | null;
  mode: VoiceMode;
  onChange: (patch: Partial<VoicePreferences>) => void;
  onModeChange: (mode: VoiceMode) => void;
  onClose: () => void;
  onRefreshVoices?: () => void;
};

function detectOS(): 'android' | 'ios' | 'windows' | 'mac' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  return 'other';
}

type MalayVoiceTip = {
  title: string;
  steps: string[];
  note?: string;
};

function getMalayVoiceTip(os: ReturnType<typeof detectOS>, language: AppLanguage): MalayVoiceTip {
  if (language === 'ms') {
    if (os === 'android') return {
      title: 'Pasang suara Melayu percuma',
      steps: [
        'Buka Tetapan telefon',
        'Cari "Text-to-Speech" atau "Teks-ke-Ucapan"',
        'Pilih Google Text-to-Speech sebagai enjin',
        'Ketuk ⚙ → Muat turun data bahasa',
        'Cari "Bahasa Melayu" → Muat turun',
        'Kembali ke sini & ketuk Refresh'
      ]
    };
    if (os === 'ios') return {
      title: 'Tiada suara Melayu dalam iOS',
      steps: [
        'Apple tidak menyediakan suara Melayu secara percuma',
        'Suara Indonesia (Damayanti) digunakan sebagai gantian — ia hampir sama dengan Melayu',
        'Buka Tetapan → Accessibility → Spoken Content → Voices → Indonesian untuk memuat turun Damayanti'
      ],
      note: 'iOS: pilih Indonesian → Damayanti untuk bunyi paling dekat dengan Bahasa Melayu'
    };
    if (os === 'windows') return {
      title: 'Pasang suara Melayu percuma (Windows)',
      steps: [
        'Buka Tetapan Windows → Masa & Bahasa → Bahasa & Wilayah',
        'Klik "Tambah bahasa" → cari "Malay (Malaysia)"',
        'Pasang & tunggu muat turun selesai',
        'Mulakan semula pelayar (browser)',
        'Kembali ke sini & ketuk Refresh'
      ],
      note: 'Suara: Microsoft Rizwan atau Microsoft Yasmin'
    };
    return {
      title: 'Dapatkan suara Melayu percuma',
      steps: [
        'Guna pelayar Chrome atau Edge untuk pilihan suara Melayu terbaik',
        'Pada Android: muat turun Google TTS → Bahasa Melayu',
        'Pada Windows: pasang bahasa Melayu dalam tetapan bahasa'
      ]
    };
  }

  // English copy
  if (os === 'android') return {
    title: 'Install free Malay voice',
    steps: [
      'Open phone Settings',
      'Search "Text-to-Speech output"',
      'Select Google Text-to-Speech as engine',
      'Tap ⚙ → Install voice data',
      'Find "Bahasa Melayu (Malaysia)" → Download',
      'Come back here and tap Refresh'
    ]
  };
  if (os === 'ios') return {
    title: 'No native Malay voice on iOS',
    steps: [
      'Apple does not provide a free Malay voice',
      'Indonesian (Damayanti) is being used — very similar pronunciation',
      'Settings → Accessibility → Spoken Content → Voices → Indonesian → download Damayanti'
    ],
    note: 'iOS: download Indonesian → Damayanti for closest Malay sound'
  };
  if (os === 'windows') return {
    title: 'Install free Malay voice (Windows)',
    steps: [
      'Open Windows Settings → Time & Language → Language & Region',
      'Click "Add a language" → search "Malay (Malaysia)"',
      'Install and wait for the download to finish',
      'Restart your browser',
      'Come back here and tap Refresh'
    ],
    note: 'Voices: Microsoft Rizwan or Microsoft Yasmin'
  };
  return {
    title: 'Get a free Malay voice',
    steps: [
      'Use Chrome or Edge for best Malay voice support',
      'On Android: download Google TTS → Bahasa Melayu',
      'On Windows: install Malay language in Windows language settings'
    ]
  };
}

export default function VoiceSettings({
  language,
  preferences,
  voices,
  selectedVoiceURI,
  mode,
  onChange,
  onModeChange,
  onClose,
  onRefreshVoices
}: VoiceSettingsProps) {
  const [open, setOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  const hasMalayVoice = voices.some(
    (s) => s.voice.lang.toLowerCase().startsWith('ms') || s.voice.lang.toLowerCase().startsWith('id')
  );
  const showMalayTip = language === 'ms' && !hasMalayVoice;
  const os = detectOS();
  const tip = getMalayVoiceTip(os, language);

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
        <span>{language === 'ms' ? 'Ton suara' : 'Pitch'}</span>
        <input
          type="range"
          min={0.7}
          max={1.4}
          step={0.05}
          value={preferences.pitch}
          onChange={(event) => onChange({ pitch: Number(event.target.value) })}
        />
        <output>{preferences.pitch.toFixed(2)}x</output>
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

      {showMalayTip ? (
        <div className="voice-settings__malay-tip">
          <button
            type="button"
            className="voice-settings__malay-tip-toggle"
            onClick={() => setTipOpen((v) => !v)}
          >
            <span>
              {language === 'ms'
                ? '⚠ Suara Melayu tidak dipasang'
                : '⚠ No Malay voice installed'}
            </span>
            <span>{tipOpen ? '▲' : '▼'}</span>
          </button>

          {tipOpen ? (
            <div className="voice-settings__malay-tip-body">
              <strong>{tip.title}</strong>
              <ol>
                {tip.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              {tip.note ? <p className="voice-settings__malay-tip-note">{tip.note}</p> : null}
              {onRefreshVoices ? (
                <button
                  type="button"
                  className="voice-settings__refresh-btn"
                  onClick={onRefreshVoices}
                >
                  {language === 'ms' ? '↻ Refresh senarai suara' : '↻ Refresh voice list'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
