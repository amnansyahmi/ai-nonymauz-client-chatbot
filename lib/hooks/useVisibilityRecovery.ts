'use client';

import { useEffect, useRef } from 'react';

export type VisibilityRecoveryOptions = {
  enabled: boolean;
  onRecover: () => void;
  onSuspend: () => void;
};

/**
 * Mobile Safari + iOS Chrome: when the tab is backgrounded, audio playback is
 * paused and the Web Speech API's state can become inconsistent. This hook
 * wires document.visibilitychange so we can:
 *   - cancel any ongoing TTS when the page hides
 *   - resume listening (or re-prompt for mic permission) when the page returns
 *
 * Also attempts to resume the AudioContext on return, which iOS Safari
 * commonly suspends after backgrounding.
 */
export function useVisibilityRecovery({ enabled, onRecover, onSuspend }: VisibilityRecoveryOptions): void {
  const recoverRef = useRef(onRecover);
  const suspendRef = useRef(onSuspend);
  recoverRef.current = onRecover;
  suspendRef.current = onSuspend;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        suspendRef.current();
        return;
      }
      if (document.visibilityState === 'visible') {
        // Try to resume the AudioContext (iOS Safari suspends it on background)
        const win = window as Window & { webkitAudioContext?: typeof AudioContext };
        const Ctor = window.AudioContext ?? win.webkitAudioContext;
        if (Ctor) {
          // Create a one-shot silent context just to ensure audio is alive.
          // Browsers will throw on resume() if there's no user gesture, which
          // we catch and ignore.
          try {
            const ctx = new Ctor();
            const resume = ctx.resume?.bind(ctx);
            if (resume) {
              resume()
                .then(() => ctx.close())
                .catch(() => {});
            } else {
              void ctx.close();
            }
          } catch {
            // ignore
          }
        }
        recoverRef.current();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [enabled]);
}
