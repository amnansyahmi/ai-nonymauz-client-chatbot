import { describe, expect, it } from 'vitest';
import { MOBILE_NAV_LABELS, MOBILE_NAV_TABS, type MobileTab } from '../../components/mobile/types';

describe('MobileBottomNav exports', () => {
  it('exposes the five primary tabs in a stable order', () => {
    expect(MOBILE_NAV_TABS).toEqual(['dashboard', 'checklist', 'chat', 'budget', 'rsvp']);
  });

  it('uses MobileTab type values that match the workspace ActiveTab union', () => {
    const allowed: ReadonlyArray<MobileTab> = [
      'dashboard',
      'checklist',
      'chat',
      'calendar',
      'budget',
      'rsvp',
      'vendors'
    ];
    for (const tab of MOBILE_NAV_TABS) {
      expect(allowed).toContain(tab);
    }
  });

  it('does not include calendar or vendors in the primary bar (full nav lives elsewhere)', () => {
    expect(MOBILE_NAV_TABS).not.toContain('calendar');
    expect(MOBILE_NAV_TABS).not.toContain('vendors');
  });

  it('provides BM labels for every tab', () => {
    for (const tab of MOBILE_NAV_TABS) {
      expect(MOBILE_NAV_LABELS.ms[tab]).toBeTruthy();
    }
  });

  it('provides EN labels that differ from BM', () => {
    expect(MOBILE_NAV_LABELS.en.dashboard).toBe('Home');
    expect(MOBILE_NAV_LABELS.en.rsvp).toBe('Guests');
    expect(MOBILE_NAV_LABELS.ms.dashboard).toBe('Utama');
    expect(MOBILE_NAV_LABELS.ms.rsvp).toBe('Tetamu');
  });
});
