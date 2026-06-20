/**
 * Stage-1 RSVP self-service (no backend).
 *
 * The couple hosts their own free RSVP form (Google Forms / Tally / etc.) and
 * stores its link in the app. We help them share that link via WhatsApp / copy,
 * pre-filled with their event details. Guest responses come back through the
 * existing CSV import. When the real backend lands, this is replaced by a
 * native /rsvp/[slug] page — the share/message shape stays the same.
 */

export type RsvpShareVars = {
  coupleNames: string;
  weddingDate: string;
  venue: string;
  formUrl: string;
  language?: 'ms' | 'en';
};

/** Trim and ensure the URL has an http(s) scheme so links/share work. */
export function normalizeFormUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Loose validity check: parses as a URL with a host that has a dot. */
export function isValidFormUrl(url: string): boolean {
  const normalized = normalizeFormUrl(url);
  if (!normalized) return false;
  try {
    const parsed = new URL(normalized);
    return Boolean(parsed.hostname) && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

/** Build the WhatsApp invite message that points guests at the RSVP form. */
export function buildRsvpInviteMessage(vars: RsvpShareVars): string {
  const language = vars.language ?? 'ms';
  const couple = vars.coupleNames || (language === 'ms' ? 'kami' : 'us');
  const date = vars.weddingDate || (language === 'ms' ? '[tarikh akan dimaklumkan]' : '[date to be confirmed]');
  const link = normalizeFormUrl(vars.formUrl);
  const venuePart = vars.venue
    ? language === 'ms' ? ` di ${vars.venue}` : ` at ${vars.venue}`
    : '';

  if (language === 'ms') {
    return (
      `Assalamualaikum & salam sejahtera 🌸\n\n` +
      `Anda dijemput ke majlis perkahwinan ${couple} pada ${date}${venuePart}.\n\n` +
      `Mohon sahkan kehadiran anda di sini:\n${link}\n\n` +
      `Terima kasih! 💕`
    );
  }
  return (
    `You're invited to ${couple}'s wedding on ${date}${venuePart}.\n\n` +
    `Please RSVP here:\n${link}\n\n` +
    `Thank you! 💕`
  );
}

/** Build a WhatsApp share URL (no specific recipient) pre-filled with a message. */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
