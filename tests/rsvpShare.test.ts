import { describe, expect, it } from 'vitest';
import {
  normalizeFormUrl,
  isValidFormUrl,
  buildRsvpInviteMessage,
  buildWhatsAppShareUrl
} from '../lib/planner/rsvpShare';

describe('normalizeFormUrl', () => {
  it('prepends https when scheme is missing', () => {
    expect(normalizeFormUrl('forms.gle/abc')).toBe('https://forms.gle/abc');
  });
  it('keeps an existing scheme and trims', () => {
    expect(normalizeFormUrl('  http://tally.so/r/xyz ')).toBe('http://tally.so/r/xyz');
  });
  it('returns empty for blank', () => {
    expect(normalizeFormUrl('   ')).toBe('');
  });
});

describe('isValidFormUrl', () => {
  it('accepts a host with a dot', () => {
    expect(isValidFormUrl('forms.gle/abc')).toBe(true);
    expect(isValidFormUrl('https://tally.so/r/xyz')).toBe(true);
  });
  it('rejects blank or hostless input', () => {
    expect(isValidFormUrl('')).toBe(false);
    expect(isValidFormUrl('notaurl')).toBe(false);
  });
});

describe('buildRsvpInviteMessage', () => {
  const base = {
    coupleNames: 'Arau & Troopers',
    weddingDate: '19 Jun 2027',
    venue: 'Dewan Seksyen 21',
    formUrl: 'forms.gle/abc'
  };

  it('builds a Malay message with normalized link, couple, date, venue', () => {
    const msg = buildRsvpInviteMessage({ ...base, language: 'ms' });
    expect(msg).toContain('Arau & Troopers');
    expect(msg).toContain('19 Jun 2027');
    expect(msg).toContain('di Dewan Seksyen 21');
    expect(msg).toContain('https://forms.gle/abc');
  });

  it('builds an English message', () => {
    const msg = buildRsvpInviteMessage({ ...base, language: 'en' });
    expect(msg).toContain("Arau & Troopers's wedding");
    expect(msg).toContain('at Dewan Seksyen 21');
    expect(msg).toContain('Please RSVP here');
  });

  it('omits venue clause when venue is empty', () => {
    const msg = buildRsvpInviteMessage({ ...base, venue: '', language: 'ms' });
    expect(msg).not.toContain('Dewan Seksyen 21');
    expect(msg).not.toContain(' di Dewan');
  });

  it('falls back gracefully when fields are missing', () => {
    const msg = buildRsvpInviteMessage({ coupleNames: '', weddingDate: '', venue: '', formUrl: '', language: 'ms' });
    expect(msg).toContain('kami');
    expect(msg).toContain('[tarikh akan dimaklumkan]');
  });
});

describe('buildWhatsAppShareUrl', () => {
  it('encodes the message into a wa.me share link', () => {
    const url = buildWhatsAppShareUrl('Hi there & welcome');
    expect(url).toBe('https://wa.me/?text=Hi%20there%20%26%20welcome');
  });
});
