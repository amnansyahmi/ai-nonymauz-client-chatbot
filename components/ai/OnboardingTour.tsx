'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mm-onboarding-seen';

type OnboardingTourProps = {
  language?: 'ms' | 'en';
  onComplete?: () => void;
};

const STEPS = [
  {
    id: 'welcome',
    titleMs: 'Hai! Selamat datang 👋',
    titleEn: 'Hi! Welcome 👋',
    bodyMs:
      'MajlisMate ialah pembantu peribadi anda untuk merancang majlis kahwin. Jom tengok apa yang boleh dibuat.',
    bodyEn:
      'MajlisMate is your personal wedding planning assistant. Let me show you what it can do.',
    targetSelector: null
  },
  {
    id: 'chat',
    titleMs: 'Tanya apa sahaja 💬',
    titleEn: 'Ask anything 💬',
    bodyMs:
      'Cuba tanya pasal bajet, vendor, atau checklist. Saya akan jawab dalam Bahasa Melayu atau English.',
    bodyEn:
      'Try asking about budget, vendors, or checklist. I will reply in Bahasa Melayu or English.',
    targetSelector: '.composer-input'
  },
  {
    id: 'planner',
    titleMs: 'Planner pintar 📋',
    titleEn: 'Smart planner 📋',
    bodyMs:
      'Saya boleh buatkan checklist, jadual, bajet dan senarai vendor untuk anda. Semua data disimpan dalam telefon.',
    bodyEn:
      'I can build checklists, schedules, budgets and vendor lists for you. Everything is saved on your device.',
    targetSelector: '.workspace-tab-button'
  },
  {
    id: 'voice',
    titleMs: 'Bercakap je 🎤',
    titleEn: 'Just speak 🎤',
    bodyMs:
      'Tak nak taip? Tekan butang mikrofon dan cakap je. Saya akan dengar dan jawab.',
    bodyEn:
      'Don\'t want to type? Press the microphone button and just speak. I will listen and reply.',
    targetSelector: '.composer-dictate-button'
  }
];

/**
 * 4-step first-run tour. Non-modal (uses a small card overlay) so the
 * user can keep using the app while exploring. Once dismissed, the
 * choice persists in localStorage.
 */
export default function OnboardingTour({ language = 'ms', onComplete }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const isMs = language === 'ms';

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        // Delay slightly so the workspace can render before we measure.
        const id = window.setTimeout(() => setVisible(true), 600);
        return () => window.clearTimeout(id);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  if (!visible) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  function persist(seen: boolean) {
    try {
      window.localStorage.setItem(STORAGE_KEY, seen ? '1' : '0');
    } catch {
      // Ignore storage errors
    }
  }

  function handleNext() {
    if (isLast) {
      persist(true);
      setVisible(false);
      onComplete?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleSkip() {
    persist(false); // 0 = user skipped; we can re-show later
    setVisible(false);
    onComplete?.();
  }

  function handleClose() {
    persist(true);
    setVisible(false);
    onComplete?.();
  }

  return (
    <div className="onboarding-tour" role="dialog" aria-modal="false" aria-label={isMs ? 'Panduan pertama' : 'Onboarding tour'}>
      <button
        type="button"
        className="onboarding-tour__backdrop"
        aria-label={isMs ? 'Tutup panduan' : 'Close tour'}
        onClick={handleClose}
      />
      <div className="onboarding-tour__card">
        <div className="onboarding-tour__header">
          <p className="eyebrow">
            {isMs ? `Langkah ${stepIndex + 1} / ${STEPS.length}` : `Step ${stepIndex + 1} / ${STEPS.length}`}
          </p>
          <button
            type="button"
            className="onboarding-tour__close"
            onClick={handleClose}
            aria-label={isMs ? 'Tutup' : 'Close'}
          >
            ×
          </button>
        </div>
        <h3>{isMs ? step.titleMs : step.titleEn}</h3>
        <p>{isMs ? step.bodyMs : step.bodyEn}</p>
        <div className="onboarding-tour__dots" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.id} className={`onboarding-tour__dot ${i === stepIndex ? 'is-active' : ''}`} />
          ))}
        </div>
        <div className="onboarding-tour__actions">
          {!isFirst ? (
            <button type="button" className="utility-action" onClick={() => setStepIndex((i) => i - 1)}>
              {isMs ? 'Kembali' : 'Back'}
            </button>
          ) : null}
          <button type="button" className="utility-action" onClick={handleSkip}>
            {isMs ? 'Langkau' : 'Skip'}
          </button>
          <button type="button" className="primary-action" onClick={handleNext}>
            {isLast ? (isMs ? 'Mula' : 'Start') : isMs ? 'Seterusnya' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
