import { describe, expect, it } from 'vitest';
import {
  dateKey,
  daysUntil,
  fallbackChecklist,
  getCalendarDays,
  localizedValue,
  money,
  parseAppointment,
  parseAppointmentDate,
  parseMoneyAmount,
  parsePlannerSetup,
  sortAppointments,
  statusLabel,
  wantsAppointment,
  wantsChecklist
} from '../components/planner/utils';
import { computeAllocation } from '../components/planner/hooks/useBudget';

describe('parseMoneyAmount', () => {
  it('parses a currency-prefixed amount', () => {
    expect(parseMoneyAmount('Saya nak budget RM 30,000')).toBe(30000);
  });

  it('parses a 4-7 digit amount without prefix', () => {
    expect(parseMoneyAmount('Total 15000 ringgit')).toBe(15000);
  });

  it('returns null for ambiguous or missing values', () => {
    expect(parseMoneyAmount('no money here')).toBeNull();
  });
});

describe('parseAppointmentDate', () => {
  const base = new Date('2026-06-15T12:00:00');

  it('parses today and tomorrow', () => {
    expect(dateKey(parseAppointmentDate('today', base)!)).toBe('2026-06-15');
    expect(dateKey(parseAppointmentDate('tomorrow', base)!)).toBe('2026-06-16');
  });

  it('parses ISO dates', () => {
    expect(dateKey(parseAppointmentDate('2027-01-04', base)!)).toBe('2027-01-04');
  });

  it('parses slash dates', () => {
    expect(dateKey(parseAppointmentDate('4/1/2027', base)!)).toBe('2027-01-04');
  });

  it('parses month name + day', () => {
    expect(dateKey(parseAppointmentDate('January 4 2027', base)!)).toBe('2027-01-04');
    expect(dateKey(parseAppointmentDate('4 January 2027', base)!)).toBe('2027-01-04');
  });

  it('returns null for unrecognised strings', () => {
    expect(parseAppointmentDate('not a date', base)).toBeNull();
  });
});

describe('parseAppointment', () => {
  it('extracts title, date, time, vendor, and status', () => {
    const apt = parseAppointment('Create appointment on 2027-03-04 at 14:00 with Seri Rasa for food tasting');
    expect(apt).not.toBeNull();
    expect(apt?.date).toBe('2027-03-04');
    expect(apt?.time).toBe('14:00');
    expect(apt?.status).toBe('planned');
    expect(apt?.title.toLowerCase()).toContain('food tasting');
  });

  it('returns null when no date is found', () => {
    expect(parseAppointment('hello world')).toBeNull();
  });
});

describe('parsePlannerSetup', () => {
  it('parses wedding setup text into a profile patch', () => {
    const patch = parsePlannerSetup(
      'Setup majlis: 12/06/2027, Selangor, bajet RM30000, 300 pax',
      ['Selangor', 'Kuala Lumpur']
    );
    expect(patch.majlisDate).toBe('2027-06-12');
    expect(patch.negeri).toBe('Selangor');
    expect(patch.totalBudget).toBe(30000);
    expect(patch.guestTarget).toBe(300);
  });

  it('returns an empty patch when no signals are present', () => {
    const patch = parsePlannerSetup('hello world', ['Selangor']);
    expect(patch).toEqual({});
  });
});

describe('intents', () => {
  it('detects checklist intent', () => {
    expect(wantsChecklist('Buatkan saya checklist majlis')).toBe(true);
    expect(wantsChecklist('apa khabar')).toBe(false);
  });

  it('detects appointment intent when both an action and a date are present', () => {
    expect(wantsAppointment('add appointment on 2027-03-04')).toBe(true);
    expect(wantsAppointment('appointment on 2027-03-04')).toBe(false);
  });
});

describe('calendar + utils', () => {
  it('produces 6 weeks of days starting from Sunday', () => {
    const days = getCalendarDays(new Date('2026-06-15T00:00:00'));
    expect(days).toHaveLength(42);
    expect(days[0].date.getDay()).toBe(0);
  });

  it('sorts appointments by date then time', () => {
    const sorted = [
      { id: '1', title: 'A', date: '2027-01-01', time: '09:00', note: '' },
      { id: '2', title: 'B', date: '2027-01-01', time: '08:00', note: '' },
      { id: '3', title: 'C', date: '2027-01-02', time: '09:00', note: '' }
    ].sort(sortAppointments);
    expect(sorted.map((a) => a.id)).toEqual(['2', '1', '3']);
  });

  it('formats money with en-MY grouping', () => {
    expect(money(12345)).toBe('RM12,345');
  });

  it('returns a localized label for status', () => {
    expect(statusLabel('done')).toBe('Selesai');
    expect(statusLabel('in-progress')).toBe('Sedang Diurus');
    expect(statusLabel(undefined)).toBe('Belum Mula');
  });

  it('returns the right language-specific value', () => {
    expect(localizedValue({ ms: 'ms-text', en: 'en-text' }, 'ms')).toBe('ms-text');
    expect(localizedValue('plain', 'en')).toBe('plain');
  });

  it('produces a fallback checklist for prompts', () => {
    const items = fallbackChecklist('majlis saya');
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].id).toBeDefined();
  });

  it('computes days-until difference', () => {
    const today = new Date();
    const inFiveDays = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5);
    const inPast = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5);
    expect(daysUntil(dateKey(inFiveDays))).toBe(5);
    expect(daysUntil(dateKey(inPast))).toBe(-5);
    expect(daysUntil('')).toBeNull();
  });
});

describe('computeAllocation', () => {
  it('allocates venue and catering lines by their share', () => {
    const items = [
      { id: '1', category: 'Venue / Dewan', planned: 0, actual: 0, paid: 0, status: 'not-started' as const, note: '' },
      { id: '2', category: 'Catering', planned: 0, actual: 0, paid: 0, status: 'not-started' as const, note: '' },
      { id: '3', category: 'Other', planned: 0, actual: 0, paid: 0, status: 'not-started' as const, note: '' }
    ];
    const allocated = computeAllocation(items, 30000);
    const venue = allocated.find((i) => i.category === 'Venue / Dewan')!;
    const catering = allocated.find((i) => i.category === 'Catering')!;
    const other = allocated.find((i) => i.category === 'Other')!;
    expect(venue.planned).toBe(7200);
    expect(catering.planned).toBe(10200);
    expect(other.planned).toBe(1500);
  });

  it('preserves already-planned values for unmatched categories', () => {
    const items = [{ id: '1', category: 'XYZ', planned: 500, actual: 0, paid: 0, status: 'not-started' as const, note: '' }];
    const [out] = computeAllocation(items, 10000);
    expect(out.planned).toBe(500);
  });
});
