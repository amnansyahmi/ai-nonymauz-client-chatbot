'use client';

import { useEffect } from 'react';

/**
 * Locks the viewport so the planner behaves like a native app shell:
 * no pinch-zoom, no double-tap zoom. iOS Safari ignores the
 * `user-scalable=no` viewport flag for accessibility, so we block the
 * zoom gestures in JS instead. Mounted only inside the planner, so
 * marketing pages keep normal browser zoom.
 */
export default function ViewportLock() {
  useEffect(() => {
    const prevent = (event: Event) => event.preventDefault();

    // iOS Safari pinch-zoom fires non-standard gesture* events.
    document.addEventListener('gesturestart', prevent);
    document.addEventListener('gesturechange', prevent);
    document.addEventListener('gestureend', prevent);

    // Cross-browser pinch: any 2+ finger move is a zoom attempt.
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    // Double-tap zoom: swallow the second quick tap (but never on form
    // controls, so inputs/buttons keep working normally).
    let lastTouchEnd = 0;
    const onTouchEnd = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      const now = Date.now();
      if (now - lastTouchEnd <= 300) event.preventDefault();
      lastTouchEnd = now;
    };
    document.addEventListener('touchend', onTouchEnd, { passive: false });

    // ── Measure the floating bottom nav and reserve exactly its height ──
    // The nav is `position: fixed` with device-dependent height (safe-area,
    // tap-target sizing), so a hardcoded padding guess either leaves an empty
    // strip or hides content. We measure the real gap from the viewport
    // bottom to the nav's top edge and expose it as --mm-nav-space.
    const root = document.documentElement;
    const measureNav = () => {
      const nav = document.querySelector<HTMLElement>('.mobile-bottom-nav');
      if (!nav) return; // not mounted (or desktop) — keep the CSS fallback
      const rect = nav.getBoundingClientRect();
      if (rect.height === 0) return; // hidden (desktop) — keep fallback
      // Space from viewport bottom up to just above the nav, + small gap.
      const space = Math.max(0, window.innerHeight - rect.top) + 8;
      root.style.setProperty('--mm-nav-space', `${Math.round(space)}px`);
    };

    measureNav();
    // Re-measure on the next frames (nav may mount/animate after us).
    const raf1 = requestAnimationFrame(measureNav);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(measureNav));
    window.addEventListener('resize', measureNav);
    window.addEventListener('orientationchange', measureNav);
    const navEl = document.querySelector('.mobile-bottom-nav');
    const ro = navEl && 'ResizeObserver' in window ? new ResizeObserver(measureNav) : null;
    if (ro && navEl) ro.observe(navEl);

    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
      document.removeEventListener('gestureend', prevent);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('resize', measureNav);
      window.removeEventListener('orientationchange', measureNav);
      ro?.disconnect();
    };
  }, []);

  return null;
}
