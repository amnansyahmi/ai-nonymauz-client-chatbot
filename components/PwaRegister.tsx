'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {
          // A stale service worker should not block local development.
        });

      if ('caches' in window) {
        caches.keys()
          .then((keys) => Promise.all(keys.filter((key) => key.startsWith('majlismate-pwa-')).map((key) => caches.delete(key))))
          .catch(() => {
            // Local cache cleanup is best-effort.
          });
      }

      return;
    }

    let refreshed = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshed) return;
      refreshed = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {
        // The app still works online if registration fails.
      });
  }, []);

  return null;
}
