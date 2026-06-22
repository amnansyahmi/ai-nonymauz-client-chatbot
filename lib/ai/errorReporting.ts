'use client';

import { trackEvent } from '../analytics';

export type ErrorReport = {
  message: string;
  stack?: string;
  source: string;
  context?: Record<string, string | number | boolean | null>;
  timestamp: string;
  url?: string;
};

const QUEUE_KEY = 'mm-error-queue';
const MAX_QUEUE = 50;

/**
 * Lightweight error reporter. Captures uncaught exceptions and
 * rejections, queues them in localStorage, and forwards to the
 * analytics stub. Designed to be replaced by Sentry / similar by
 * swapping the transport — public API stays the same.
 */
export function reportError(error: Error | string, context?: ErrorReport['context']): void {
  if (typeof window === 'undefined') return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const report: ErrorReport = {
    message,
    stack,
    source: 'client',
    context,
    timestamp: new Date().toISOString(),
    url: window.location.pathname
  };

  try {
    const queue = readQueue();
    queue.unshift(report);
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUE)));
  } catch {
    // Storage failures are not reportable themselves; ignore.
  }

  trackEvent('client_error', { message, source: report.source });
}

function readQueue(): ErrorReport[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ErrorReport[]) : [];
  } catch {
    return [];
  }
}

/**
 * Install global listeners for `error` and `unhandledrejection`. Idempotent.
 */
let listenersInstalled = false;

export function installGlobalErrorHandlers(): void {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;

  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, { kind: 'error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    reportError(reason, { kind: 'unhandledrejection' });
  });
}
