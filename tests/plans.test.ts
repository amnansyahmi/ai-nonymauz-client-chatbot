import { describe, expect, it } from 'vitest';
import {
  PLANS,
  findPlan,
  formatRinggit,
  priceForInterval
} from '../lib/payments/plans';

describe('plans', () => {
  it('exposes one plan', () => {
    expect(PLANS.map((plan) => plan.id)).toEqual(['sehari-hari']);
  });

  it('plan has BM and EN labels', () => {
    const plan = PLANS[0];
    expect(plan.nameMs.length).toBeGreaterThan(0);
    expect(plan.nameEn.length).toBeGreaterThan(0);
    expect(plan.taglineMs.length).toBeGreaterThan(0);
    expect(plan.taglineEn.length).toBeGreaterThan(0);
    expect(plan.features.length).toBeGreaterThan(0);
  });

  it('returns the correct plan for a valid id', () => {
    expect(findPlan('sehari-hari')?.nameMs).toBe('Sehari-hari');
  });

  it('returns undefined for an unknown id', () => {
    expect(findPlan('unknown')).toBeUndefined();
    expect(findPlan(null)).toBeUndefined();
    expect(findPlan(undefined)).toBeUndefined();
    expect(findPlan('')).toBeUndefined();
  });

  it('priceForInterval returns monthly price', () => {
    const plan = PLANS[0];
    expect(priceForInterval(plan, 'bulanan')).toBe(plan.priceMonthly);
    expect(priceForInterval(plan, 'tahunan')).toBe(plan.priceMonthly);
  });

  it('formatRinggit renders whole-ringgit values', () => {
    expect(formatRinggit(149)).toMatch(/149/);
  });

  it('plan has cta text', () => {
    const plan = PLANS[0];
    expect(plan.ctaMs.length).toBeGreaterThan(0);
    expect(plan.ctaEn.length).toBeGreaterThan(0);
  });
});
