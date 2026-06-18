'use client';

export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, string | number | boolean | null>;
  timestamp: string;
};

const QUEUE_KEY = 'mm-analytics-queue';
const MAX_QUEUE = 200;

function readQueue(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(events: AnalyticsEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(0, MAX_QUEUE)));
  } catch {
    // Ignore storage errors
  }
}

function dispatch(event: AnalyticsEvent) {
  if (typeof window === 'undefined') return;
  // Hook for future analytics providers (PostHog, Plausible, etc.).
  // No-op today: events are persisted to localStorage and logged in dev.
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics]', event.name, event.properties ?? {});
  }
}

/**
 * Track a frontend event. Safe to call during SSR (no-op on the server).
 * Events are queued in localStorage so they can be flushed by a future
 * server-side endpoint.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString()
  };
  const queue = readQueue();
  queue.unshift(event);
  writeQueue(queue);
  dispatch(event);
}

/**
 * Helper for the common `data-event="..."` attribute pattern. Reads the
 * attribute from a clicked element and forwards it to `trackEvent`.
 */
export function trackFromElement(target: HTMLElement): void {
  const eventName = target.closest<HTMLElement>('[data-event]')?.dataset.event;
  if (eventName) trackEvent(eventName);
}

/**
 * Read all queued events (for a future "flush to backend" call).
 */
export function drainQueue(): AnalyticsEvent[] {
  const queue = readQueue();
  writeQueue([]);
  return queue;
}
