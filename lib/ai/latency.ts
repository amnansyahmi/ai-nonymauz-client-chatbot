/**
 * Format a duration in milliseconds as a friendly short string in
 * Bahasa Melayu or English. Always rounds sensibly and never exposes
 * technical jargon.
 *
 *   650   → "kurang 1 saat" / "less than a second"
 *   1450  → "1 saat" / "1 second"
 *   3200  → "3 saat" / "3 seconds"
 *   65000 → "1 minit" / "1 minute"
 */
export function formatLatency(ms: number, language: 'ms' | 'en' = 'ms'): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const isMs = language === 'ms';

  if (ms < 1000) {
    return isMs ? 'kurang 1 saat' : 'less than a second';
  }

  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) {
    return isMs ? `${totalSeconds} saat` : `${totalSeconds} second${totalSeconds === 1 ? '' : 's'}`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) {
    return isMs ? `${minutes} minit` : `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return isMs
    ? `${minutes} minit ${seconds} saat`
    : `${minutes} minute${minutes === 1 ? '' : 's'} ${seconds} second${seconds === 1 ? '' : 's'}`;
}

/**
 * Tiny wrapper that times how long an async operation takes. Useful
 * for measuring AI response latency without bringing in a full
 * observability library.
 */
export async function measureLatency<T>(fn: () => Promise<T> | T): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}
