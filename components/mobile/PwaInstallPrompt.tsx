'use client';

import { useEffect, useState } from 'react';
import { CloseIcon } from '../planner/icons';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const STORAGE_KEY = 'mm-pwa-install-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  return window.matchMedia?.('(display-mode: standalone)').matches === true;
}

function wasDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Listens for the browser's `beforeinstallprompt` event and shows a
 * custom banner inviting the user to install the PWA. Hidden when:
 *   - the prompt event hasn't fired
 *   - the app is already running as an installed PWA
 *   - the user has previously dismissed the banner
 */
export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;

    function onPrompt(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    }

    function onAppInstalled() {
      setVisible(false);
      setPromptEvent(null);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch {
      // The user agent can reject the prompt call; ignore.
    } finally {
      setVisible(false);
      setPromptEvent(null);
    }
  }

  function handleDismiss() {
    markDismissed();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="pwa-install-banner" role="region" aria-label="Install MajlisMate.ai">
      <div className="pwa-install-banner__copy">
        <strong>Pasang MajlisMate.ai</strong>
        <span>Pasang aplikasi untuk akses pantas dan offline.</span>
      </div>
      <button
        type="button"
        className="pwa-install-banner__btn"
        onClick={handleInstall}
        data-event="pwa_install_accept"
      >
        Pasang
      </button>
      <button
        type="button"
        className="pwa-install-banner__close"
        onClick={handleDismiss}
        aria-label="Tutup"
        data-event="pwa_install_dismiss"
      >
        <CloseIcon size={18} />
      </button>
    </div>
  );
}
