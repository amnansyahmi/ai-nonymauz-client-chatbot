'use client';

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { trackEvent } from '../analytics';

let initialised = false;

/**
 * Send Core Web Vitals to the analytics stub. Wired up in the root
 * layout; safe to call multiple times — only the first call installs
 * listeners.
 */
export function initWebVitals(): void {
  if (initialised) return;
  if (typeof window === 'undefined') return;
  initialised = true;

  function report(metric: Metric) {
    trackEvent('web_vital', {
      name: metric.name,
      value: Math.round(metric.value),
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType
    });
  }

  onCLS(report);
  onFCP(report);
  onINP(report);
  onLCP(report);
  onTTFB(report);
}
