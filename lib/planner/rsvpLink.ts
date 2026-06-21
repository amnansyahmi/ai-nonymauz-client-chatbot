import { normalisePhoneForWhatsApp } from '../ai/whatsappRsvp';

/**
 * Native in-app RSVP page link (no backend).
 *
 * The whole event payload is encoded into the URL token, so the public
 * /rsvp/[token] page is fully self-contained — it needs no database to render.
 * Guests submit through the page, which routes their response back to the couple
 * via WhatsApp (the only cross-device channel that works without a backend).
 *
 * When a real backend lands, swap the token for a DB-backed slug; the page and
 * share UI stay the same shape.
 */

export type RsvpEventPayload = {
  /** Display-ready couple names, e.g. "Arau & Troopers". */
  couple: string;
  /** Display-ready date string, already localized by the couple. */
  date: string;
  time?: string;
  venue?: string;
  location?: string;
  /** Couple's WhatsApp contact number for routing submissions back. */
  contact?: string;
  lang?: 'ms' | 'en';
};

export type GuestRsvpInput = {
  name: string;
  phone?: string;
  pax?: number;
  attending: boolean;
};

function encodeBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 =
    typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64Url(input: string): string {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const binary =
    typeof atob !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeRsvpToken(payload: RsvpEventPayload): string {
  return encodeBase64Url(JSON.stringify(payload));
}

export function decodeRsvpToken(token: string): RsvpEventPayload | null {
  if (!token) return null;
  try {
    const parsed = JSON.parse(decodeBase64Url(token)) as RsvpEventPayload;
    if (!parsed || typeof parsed.couple !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Build the absolute RSVP page URL for sharing. */
export function buildRsvpPageUrl(origin: string, payload: RsvpEventPayload): string {
  const base = (origin || '').replace(/\/$/, '');
  return `${base}/rsvp/${encodeRsvpToken(payload)}`;
}

/**
 * Build the WhatsApp link that delivers a guest's RSVP to the couple. If the
 * couple gave a contact number it targets them directly; otherwise it opens a
 * generic share so the guest picks the couple from their contacts.
 */
export function buildGuestSubmitWhatsApp(payload: RsvpEventPayload, guest: GuestRsvpInput): string {
  const ms = (payload.lang ?? 'ms') === 'ms';
  const status = guest.attending
    ? ms ? 'Akan hadir ✅' : 'Attending ✅'
    : ms ? 'Tidak dapat hadir ❌' : 'Not attending ❌';
  const lines = [
    ms ? `RSVP majlis ${payload.couple}` : `RSVP for ${payload.couple}'s wedding`,
    `${ms ? 'Nama' : 'Name'}: ${guest.name}`,
    guest.phone ? `${ms ? 'No. Tel' : 'Phone'}: ${guest.phone}` : '',
    `${ms ? 'Kehadiran' : 'Attendance'}: ${status}`,
    guest.attending && guest.pax ? `${ms ? 'Bilangan' : 'Pax'}: ${guest.pax}` : ''
  ].filter(Boolean);
  const encoded = encodeURIComponent(lines.join('\n'));
  const contact = (payload.contact || '').trim();
  if (contact) {
    return `https://wa.me/${normalisePhoneForWhatsApp(contact)}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}
