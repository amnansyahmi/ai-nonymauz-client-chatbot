'use client';

import { useEffect } from 'react';
import { initWebVitals } from '../../lib/ai/webVitals';

/**
 * Side-effect component that wires up Web Vitals reporting on mount.
 * Render once in the root layout.
 */
export default function WebVitalsReporter() {
  useEffect(() => {
    initWebVitals();
  }, []);
  return null;
}
