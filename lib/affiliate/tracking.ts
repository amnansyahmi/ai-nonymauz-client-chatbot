/**
 * Referral-attribution helpers: cookie config, user-agent parsing, and client
 * IP extraction. Pure functions — safe to import anywhere.
 */

/** Cookie that attributes a later signup to an affiliate. Read at registration. */
export const ATTRIBUTION_COOKIE = 'mm_ref';

/**
 * Attribution window in days. Brief allows 30 / 60 / 90; defaults to 90.
 * Configurable via AFFILIATE_COOKIE_DAYS.
 */
export function cookieWindowDays(): number {
  const raw = Number(process.env.AFFILIATE_COOKIE_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 90;
}

export function cookieMaxAgeSeconds(): number {
  return cookieWindowDays() * 24 * 60 * 60;
}

/** Coarse device + browser from a user-agent string (no external dep). */
export function parseUserAgent(ua: string | null | undefined): {
  device: string;
  browser: string;
} {
  const s = (ua ?? '').toLowerCase();

  let device = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile|windows phone/.test(s)) device = 'Mobile';
  else if (/ipad|tablet|android/.test(s)) device = 'Tablet';

  // Order matters: Edge/Opera UAs also contain "chrome"; Chrome contains "safari".
  let browser = 'Lain';
  if (/edg\//.test(s)) browser = 'Edge';
  else if (/opr\/|opera/.test(s)) browser = 'Opera';
  else if (/samsungbrowser/.test(s)) browser = 'Samsung';
  else if (/chrome|crios/.test(s)) browser = 'Chrome';
  else if (/firefox|fxios/.test(s)) browser = 'Firefox';
  else if (/safari/.test(s)) browser = 'Safari';

  return { device, browser };
}

/** Best-effort client IP from proxy headers. */
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') || headers.get('cf-connecting-ip') || null;
}

/** Read the attribution code from a raw Cookie header (route handlers). */
export function readAttributionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === ATTRIBUTION_COOKIE) {
      return decodeURIComponent(rest.join('=')).trim() || null;
    }
  }
  return null;
}
