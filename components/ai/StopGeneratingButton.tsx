'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trackEvent } from '../../lib/analytics';

type StopGeneratingButtonProps = {
  visible: boolean;
  language?: 'ms' | 'en';
  onStop: () => void;
};

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.8" />
    </svg>
  );
}

export default function StopGeneratingButton({ visible, language = 'ms', onStop }: StopGeneratingButtonProps) {
  if (!visible) return null;
  const isMs = language === 'ms';

  return (
    <button
      type="button"
      className="stop-generating"
      onClick={onStop}
      data-event="stop_generating"
      aria-label={isMs ? 'Berhenti jana' : 'Stop generating'}
      title={isMs ? 'Henti jana' : 'Stop generating'}
    >
      <StopIcon />
    </button>
  );
}

/**
 * Small hook that exposes a stable abort controller for the current
 * in-flight AI request. Call `start()` before fetch, `abort()` on stop.
 */
export function useAbortController(): {
  start: () => () => void;
  abort: () => void;
  isRunning: () => boolean;
} {
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return (input: RequestInit = {}): RequestInit => ({
      ...input,
      signal: controller.signal
    });
  }, []);

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
      trackEvent('ai_response_aborted');
    }
  }, []);

  const isRunning = useCallback(() => controllerRef.current !== null, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  return { start, abort, isRunning };
}
