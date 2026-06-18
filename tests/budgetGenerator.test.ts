import { describe, expect, it } from 'vitest';
import {
  budgetBlueprint,
  cateringPercentForGuests,
  contingencyPercent,
  generateBudgetBreakdown
} from '../lib/planner/budgetGenerator';

describe('cateringPercentForGuests', () => {
  it('scales catering up with guest count', () => {
    expect(cateringPercentForGuests(150)).toBe(0.3);
    expect(cateringPercentForGuests(400)).toBe(0.32);
    expect(cateringPercentForGuests(800)).toBe(0.36);
  });
});

describe('contingencyPercent', () => {
  it('is always at least 5%', () => {
    expect(contingencyPercent(200)).toBeGreaterThanOrEqual(0.05);
    expect(contingencyPercent(800)).toBeGreaterThanOrEqual(0.05);
  });
});

describe('generateBudgetBreakdown', () => {
  it('returns [] for a non-positive total', () => {
    expect(generateBudgetBreakdown(0, 200)).toEqual([]);
    expect(generateBudgetBreakdown(-100, 200)).toEqual([]);
  });

  it('includes a contingency line plus every blueprint category', () => {
    const items = generateBudgetBreakdown(50000, 200);
    expect(items.length).toBe(budgetBlueprint(200).length + 1);
    expect(items.some((item) => item.category === 'Contingency')).toBe(true);
  });

  it('allocates roughly the full total (within rounding)', () => {
    const total = 80000;
    const items = generateBudgetBreakdown(total, 300);
    const sum = items.reduce((acc, item) => acc + item.planned, 0);
    // Per-line rounding can drift by at most a few ringgit per category.
    expect(Math.abs(sum - total)).toBeLessThanOrEqual(items.length);
  });

  it('produces fresh items with zeroed actual/paid and not-started status', () => {
    const items = generateBudgetBreakdown(30000, 150);
    for (const item of items) {
      expect(item.actual).toBe(0);
      expect(item.paid).toBe(0);
      expect(item.status).toBe('not-started');
      expect(item.planned).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives larger catering allocation for bigger weddings', () => {
    const small = generateBudgetBreakdown(100000, 150).find((i) => i.category === 'Catering');
    const large = generateBudgetBreakdown(100000, 800).find((i) => i.category === 'Catering');
    expect(large!.planned).toBeGreaterThan(small!.planned);
  });
});
