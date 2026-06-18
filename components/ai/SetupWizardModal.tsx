'use client';

import { useEffect, useState } from 'react';
import SetupWizard, { type SetupCompletePayload } from './SetupWizard';
import type { PlannerProfile } from '../planner/types';

const STORAGE_KEY = 'mm-setup-skipped-session';

type SetupWizardModalProps = {
  isReady: boolean;
  language: 'ms' | 'en';
  /** Force the modal open even if the profile is already complete (manual relaunch). */
  forceOpen?: boolean;
  onClose?: () => void;
  onComplete?: (payload: SetupCompletePayload) => void;
  initialProfile?: Partial<PlannerProfile>;
};

export default function SetupWizardModal({
  isReady,
  language,
  forceOpen = false,
  onClose,
  onComplete,
  initialProfile
}: SetupWizardModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isReady) {
      setShow(false);
      return;
    }
    let skipped = false;
    try {
      skipped = window.sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      // ignore storage errors
    }
    if (!skipped) setShow(true);
  }, [isReady]);

  function dismiss() {
    setShow(false);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    onClose?.();
  }

  const visible = forceOpen || (show && !isReady);
  if (!visible) return null;

  const isMs = language === 'ms';

  return (
    <div className="setup-modal" role="dialog" aria-modal="true" aria-label={isMs ? 'Setup planner' : 'Planner setup'}>
      <button
        type="button"
        className="setup-modal__backdrop"
        aria-label={isMs ? 'Tutup untuk sekarang' : 'Dismiss for now'}
        onClick={dismiss}
      />
      <div className="setup-modal__panel">
        <button
          type="button"
          className="setup-modal__close"
          onClick={dismiss}
          aria-label={isMs ? 'Tutup' : 'Close'}
          data-event="setup_modal_dismiss"
        >
          ×
        </button>
        <SetupWizard
          language={language}
          initialProfile={initialProfile}
          onComplete={onComplete}
          onClose={dismiss}
        />
      </div>
    </div>
  );
}
