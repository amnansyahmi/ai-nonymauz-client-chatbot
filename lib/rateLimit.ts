type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export class SimpleRateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly max: number;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  hit(key: string): { allowed: boolean; remaining: number; resetInMs: number } {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || existing.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.max - 1, resetInMs: this.windowMs };
    }

    existing.count += 1;
    const remaining = Math.max(0, this.max - existing.count);
    return { allowed: existing.count <= this.max, remaining, resetInMs: existing.resetAt - now };
  }
}

export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'anonymous';
}
