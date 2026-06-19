import { describe, expect, it } from 'vitest';
import {
  buildAppointmentIcs,
  buildBudgetCsv,
  buildCalendarIcs,
  buildGuestsCsv,
  icsFilename,
  parseGuestsCsv
} from '../components/planner/exporters';
import type { Appointment, BudgetItem, Guest } from '../components/planner/types';

const guest = (over: Partial<Guest> = {}): Guest => ({
  id: 'g1', name: 'Ali', phone: '0123456789', group: 'Family', pax: 2, status: 'confirmed', ...over
});

const appointment = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a1', title: 'Meet caterer', date: '2026-09-01', note: '', ...over
});

describe('buildGuestsCsv / parseGuestsCsv', () => {
  it('round-trips guests through CSV', () => {
    const csv = buildGuestsCsv([guest(), guest({ id: 'g2', name: 'Siti', status: 'pending', pax: 1 })]);
    const parsed = parseGuestsCsv(csv);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe('Ali');
    expect(parsed[0].status).toBe('confirmed');
    expect(parsed[1].name).toBe('Siti');
    expect(parsed[1].status).toBe('pending');
  });

  it('escapes quotes and commas in CSV cells', () => {
    const csv = buildGuestsCsv([guest({ name: 'Ali "AJ", Jr', group: 'Work, Friends' })]);
    expect(csv).toContain('"Ali ""AJ"", Jr"');
    // The comma inside the quoted cell must not split the row.
    expect(csv.split('\n')[1].startsWith('"Ali ""AJ"", Jr"')).toBe(true);
  });

  it('parses CSV without a header row', () => {
    const parsed = parseGuestsCsv('Ahmad,0112223333,Family,3,confirmed');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].pax).toBe(3);
    expect(parsed[0].status).toBe('confirmed');
  });

  it('maps Malay status words and skips nameless rows', () => {
    const parsed = parseGuestsCsv('name,phone,group,pax,status\nZ,,,,tidak hadir\n,,,,confirmed');
    expect(parsed).toHaveLength(1);
    expect(parsed[0].status).toBe('declined');
  });

  it('returns [] for empty input', () => {
    expect(parseGuestsCsv('')).toEqual([]);
  });
});

describe('buildBudgetCsv', () => {
  it('includes a header and one row per item', () => {
    const items: BudgetItem[] = [
      { id: 'b1', category: 'Catering', planned: 10000, actual: 0, paid: 2000, status: 'in-progress', note: '' }
    ];
    const lines = buildBudgetCsv(items).split('\n');
    expect(lines[0]).toContain('category');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('Catering');
    expect(lines[1]).toContain('10000');
  });
});

describe('buildAppointmentIcs / buildCalendarIcs', () => {
  it('wraps a single timed event with VEVENT and a 1h DTEND', () => {
    const ics = buildAppointmentIcs(appointment({ time: '14:00' }));
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20260901T140000');
    expect(ics).toContain('DTEND:20260901T150000');
    expect(ics).toContain('SUMMARY:Meet caterer');
  });

  it('uses an all-day VALUE=DATE range when there is no time', () => {
    const ics = buildAppointmentIcs(appointment());
    expect(ics).toContain('DTSTART;VALUE=DATE:20260901');
    expect(ics).toContain('DTEND;VALUE=DATE:20260902');
  });

  it('emits one VEVENT per appointment in a calendar', () => {
    const ics = buildCalendarIcs([appointment(), appointment({ id: 'a2', title: 'Venue visit' })]);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  });
});

describe('icsFilename', () => {
  it('slugifies titles and falls back to a default', () => {
    expect(icsFilename('Meet The Caterer!')).toBe('meet-the-caterer');
    expect(icsFilename('!!!')).toBe('appointment');
  });
});
