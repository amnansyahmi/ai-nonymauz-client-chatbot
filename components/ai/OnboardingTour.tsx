'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mm-onboarding-seen';
const WEB_TOUR_QUERY = '(min-width: 900px)';

type OnboardingTourProps = {
  language?: 'ms' | 'en';
  onComplete?: () => void;
};

const STEPS = [
  {
    id: 'welcome',
    labelMs: 'Mula',
    labelEn: 'Start',
    titleMs: 'Selamat datang ke MajlisMate',
    titleEn: 'Welcome to MajlisMate',
    bodyMs:
      'MajlisMate ialah pembantu peribadi anda untuk merancang majlis kahwin. Jom tengok apa yang boleh dibuat.',
    bodyEn:
      'MajlisMate is your personal wedding planning assistant. Let me show you what it can do.',
    targetSelector: null
  },
  {
    id: 'chat',
    labelMs: 'Chat',
    labelEn: 'Chat',
    titleMs: 'Tanya apa sahaja',
    titleEn: 'Ask anything',
    bodyMs:
      'Cuba tanya pasal bajet, vendor, atau checklist. Saya akan jawab dalam Bahasa Melayu atau English.',
    bodyEn:
      'Try asking about budget, vendors, or checklist. I will reply in Bahasa Melayu or English.',
    targetSelector: '.composer-input'
  },
  {
    id: 'planner',
    labelMs: 'Planner',
    labelEn: 'Planner',
    titleMs: 'Planner pintar',
    titleEn: 'Smart planner',
    bodyMs:
      'Saya boleh buatkan checklist, jadual, bajet dan senarai vendor untuk anda. Semua data disimpan dalam telefon.',
    bodyEn:
      'I can build checklists, schedules, budgets and vendor lists for you. Everything is saved on your device.',
    targetSelector: '.workspace-tab-button'
  },
  {
    id: 'voice',
    labelMs: 'Voice',
    labelEn: 'Voice',
    titleMs: 'Bercakap sahaja',
    titleEn: 'Just speak',
    bodyMs:
      'Tak nak taip? Tekan butang mikrofon dan cakap sahaja. Saya akan dengar dan jawab.',
    bodyEn:
      "Don't want to type? Press the microphone button and speak. I will listen and reply.",
    targetSelector: '.composer-dictate-button'
  }
];

export default function OnboardingTour({ language = 'ms', onComplete }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const isMs = language === 'ms';

  useEffect(() => {
    try {
      if (!window.matchMedia(WEB_TOUR_QUERY).matches) return;

      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        const id = window.setTimeout(() => setVisible(true), 600);
        return () => window.clearTimeout(id);
      }
    } catch {
      // Ignore storage and media-query errors.
    }
  }, []);

  if (!visible) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Ignore storage errors.
    }
  }

  function finish() {
    persist();
    setVisible(false);
    onComplete?.();
  }

  function goToStep(index: number) {
    setStepIndex(index);

    const selector = STEPS[index].targetSelector;
    if (!selector) return;

    window.setTimeout(() => {
      document.querySelector(selector)?.scrollIntoView({
        block: 'center',
        behavior: 'smooth'
      });
    }, 50);
  }

  return (
    <aside
      className="onboarding-tour"
      role="dialog"
      aria-modal="false"
      aria-label={isMs ? 'Panduan web' : 'Web tour'}
    >
      <div className="onboarding-tour__card">
        <div className="onboarding-tour__header">
          <div>
            <p className="eyebrow">{isMs ? 'Panduan web' : 'Web guide'}</p>
            <strong>
              {isMs
                ? `Langkah ${stepIndex + 1} daripada ${STEPS.length}`
                : `Step ${stepIndex + 1} of ${STEPS.length}`}
            </strong>
          </div>
          <button
            type="button"
            className="onboarding-tour__close"
            onClick={finish}
            aria-label={isMs ? 'Tutup' : 'Close'}
          >
            x
          </button>
        </div>

        <div className="onboarding-tour__steps" aria-label={isMs ? 'Navigasi panduan' : 'Tour navigation'}>
          {STEPS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={index === stepIndex ? 'is-active' : ''}
              onClick={() => goToStep(index)}
              aria-current={index === stepIndex ? 'step' : undefined}
            >
              <span>{index + 1}</span>
              {isMs ? item.labelMs : item.labelEn}
            </button>
          ))}
        </div>

        <h3>{isMs ? step.titleMs : step.titleEn}</h3>
        <p>{isMs ? step.bodyMs : step.bodyEn}</p>

        <div className="onboarding-tour__dots" aria-hidden="true">
          {STEPS.map((item, index) => (
            <span key={item.id} className={`onboarding-tour__dot ${index === stepIndex ? 'is-active' : ''}`} />
          ))}
        </div>

        <div className="onboarding-tour__actions">
          {!isFirst ? (
            <button type="button" className="utility-action" onClick={() => goToStep(stepIndex - 1)}>
              {isMs ? 'Kembali' : 'Back'}
            </button>
          ) : null}
          <button type="button" className="utility-action" onClick={finish}>
            {isMs ? 'Langkau' : 'Skip'}
          </button>
          <button type="button" className="primary-action" onClick={isLast ? finish : () => goToStep(stepIndex + 1)}>
            {isLast ? (isMs ? 'Mula' : 'Start') : isMs ? 'Seterusnya' : 'Next'}
          </button>
        </div>
      </div>
    </aside>
  );
}
