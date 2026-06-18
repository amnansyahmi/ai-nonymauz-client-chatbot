import { describe, expect, it } from 'vitest';
import {
  PLANS,
  findPlan,
  formatRinggit,
  priceForInterval
} from '../lib/payments/plans';

describe('plans', () => {
  it('exposes three plans in stable order', () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(['percuma', 'sehari-hari', 'bisnes']);
  });

  it('every plan has BM and EN labels', () => {
    for (const plan of PLANS) {
      expect(plan.nameMs.length).toBeGreaterThan(0);
      expect(plan.nameEn.length).toBeGreaterThan(0);
      expect(plan.taglineMs.length).toBeGreaterThan(0);
      expect(plan.taglineEn.length).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(0);
    }
  });

  it('only highlights one plan as "paling popular"', () => {
    const highlighted = PLANS.filter((plan) => plan.highlighted);
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0].id).toBe('sehari-hari');
  });

  it('returns the correct plan for a valid id', () => {
    expect(findPlan('sehari-hari')?.nameMs).toBe('Sehari-hari');
    expect(findPlan('percuma')?.priceMonthly).toBe(0);
  });

  it('returns undefined for an unknown id', () => {
    expect(findPlan('unknown')).toBeUndefined();
    expect(findPlan(null)).toBeUndefined();
    expect(findPlan(undefined)).toBeUndefined();
    expect(findPlan('')).toBeUndefined();
  });

  it('priceForInterval returns monthly price for bulanan', () => {
    const plan = PLANS[1];
    expect(priceForInterval(plan, 'bulanan')).toBe(plan.priceMonthly);
  });

  it('priceForInterval returns yearly price for tahunan', () => {
    const plan = PLANS[1];
    expect(priceForInterval(plan, 'tahunan')).toBe(plan.priceYearly);
  });

  it('yearly price is at least 10x monthly (annual discount)', () => {
    for (const plan of PLANS) {
      if (plan.priceMonthly === 0) continue;
      expect(plan.priceYearly).toBeGreaterThanOrEqual(plan.priceMonthly * 10);
    }
  });

  it('formatRinggit renders whole-ringgit values', () => {
    expect(formatRinggit(49)).toMatch(/49/);
    expect(formatRinggit(199)).toMatch(/199/);
  });

  it('all paid plans have cta text', () => {
    for (const plan of PLANS) {
      expect(plan.ctaMs.length).toBeGreaterThan(0);
      expect(plan.ctaEn.length).toBeGreaterThan(0);
    }
  });
});
