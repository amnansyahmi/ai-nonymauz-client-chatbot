import { describe, expect, it } from 'vitest';
import {
  encodeRsvpToken,
  decodeRsvpToken,
  buildRsvpPageUrl,
  buildGuestSubmitWhatsApp,
  type RsvpEventPayload
} from '../lib/planner/rsvpLink';

const payload: RsvpEventPayload = {
  couple: 'Arau & Troopers',
  date: '19 Jun 2027',
  time: '10:57 pg - 4:57 ptg',
  venue: 'Dewan Seksyen 21',
  location: 'Selangor',
  contact: '019-555 1701',
  lang: 'ms'
};

describe('encode/decode token', () => {
  it('round-trips a payload including unicode', () => {
    const token = encodeRsvpToken({ ...payload, couple: 'Aisyah & Müller 💕' });
    const decoded = decodeRsvpToken(token);
    expect(decoded?.couple).toBe('Aisyah & Müller 💕');
    expect(decoded?.venue).toBe('Dewan Seksyen 21');
  });

  it('produces a URL-safe token (no +, /, =)', () => {
    const token = encodeRsvpToken(payload);
    expect(token).not.toMatch(/[+/=]/);
  });

  it('returns null for garbage or empty tokens', () => {
    expect(decodeRsvpToken('')).toBeNull();
    expect(decodeRsvpToken('!!!not-base64!!!')).toBeNull();
  });
});

describe('buildRsvpPageUrl', () => {
  it('joins origin and token without double slash', () => {
    const url = buildRsvpPageUrl('https://majlismate.ai/', payload);
    expect(url.startsWith('https://majlismate.ai/rsvp/')).toBe(true);
    expect(url).not.toContain('//rsvp');
    // round-trips back to the same payload
    const token = url.split('/rsvp/')[1];
    expect(decodeRsvpToken(token)?.couple).toBe('Arau & Troopers');
  });
});

describe('buildGuestSubmitWhatsApp', () => {
  it('targets the couple contact and includes guest details when attending', () => {
    const url = buildGuestSubmitWhatsApp(payload, { name: 'Afiq Azlan', phone: '012-3456789', pax: 2, attending: true });
    expect(url.startsWith('https://wa.me/60195551701?text=')).toBe(true);
    const text = decodeURIComponent(url.split('text=')[1]);
    expect(text).toContain('Afiq Azlan');
    expect(text).toContain('Akan hadir');
    expect(text).toContain('Bilangan: 2');
  });

  it('omits pax when not attending', () => {
    const url = buildGuestSubmitWhatsApp(payload, { name: 'Mirul', attending: false });
    const text = decodeURIComponent(url.split('text=')[1]);
    expect(text).toContain('Tidak dapat hadir');
    expect(text).not.toContain('Bilangan');
  });

  it('falls back to a generic share when no contact is set', () => {
    const url = buildGuestSubmitWhatsApp({ ...payload, contact: '' }, { name: 'Ali', attending: true });
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
  });
});
