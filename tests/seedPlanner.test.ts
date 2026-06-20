import { afterEach, describe, expect, it } from 'vitest';
import { seedPlannerFromPreview } from '../components/preview/seedPlanner';
import { storageKeys } from '../components/planner/data';
import type { ChecklistItem } from '../components/planner/types';

const sampleItems: ChecklistItem[] = [
  { id: 'a', text: 'Tempah dewan', completed: false, status: 'not-started', category: 'tempat-venue' }
];

const seed = {
  items: sampleItems,
  title: 'Checklist Majlis Saya',
  budgetItems: [{ id: 'b', category: 'Dewan', planned: 5000, actual: 0, paid: 0, status: 'not-started' as const, note: '' }],
  profileUpdate: { majlisDate: '2027-06-19', negeri: 'Selangor' }
};

afterEach(() => {
  window.localStorage.clear();
});

describe('seedPlannerFromPreview', () => {
  it('writes checklist, title, budget, and profile when planner is empty', () => {
    const wrote = seedPlannerFromPreview(seed);
    expect(wrote).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(storageKeys.checklistItems)!)).toHaveLength(1);
    expect(window.localStorage.getItem(storageKeys.checklistTitle)).toBe('Checklist Majlis Saya');
    expect(JSON.parse(window.localStorage.getItem(storageKeys.budgetItems)!)).toHaveLength(1);
    const profile = JSON.parse(window.localStorage.getItem(storageKeys.plannerProfile)!);
    expect(profile.majlisDate).toBe('2027-06-19');
    expect(profile.completed).toBe(true);
  });

  it('does NOT overwrite an existing planner checklist', () => {
    window.localStorage.setItem(storageKeys.checklistItems, JSON.stringify([{ id: 'existing', text: 'Real task' }]));
    const wrote = seedPlannerFromPreview(seed);
    expect(wrote).toBe(false);
    const stored = JSON.parse(window.localStorage.getItem(storageKeys.checklistItems)!);
    expect(stored[0].id).toBe('existing');
  });

  it('seeds when the stored checklist is an empty array', () => {
    window.localStorage.setItem(storageKeys.checklistItems, JSON.stringify([]));
    expect(seedPlannerFromPreview(seed)).toBe(true);
  });
});
