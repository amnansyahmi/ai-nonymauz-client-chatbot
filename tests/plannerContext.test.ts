import { describe, expect, it } from 'vitest';
import { derivePlannerContext, type PlannerContextInput } from '../components/planner/plannerContext';
import type { PlannerProfile } from '../components/planner/types';

const profile = (over: Partial<PlannerProfile> = {}): PlannerProfile => ({
  coupleName: 'Ali & Siti',
  groomName: 'Ali',
  brideName: 'Siti',
  majlisDate: '',
  negeri: '',
  totalBudget: 0,
  guestTarget: 0,
  weddingStyle: '',
  keyContact: '',
  completed: false,
  ...over
});

const baseInput = (over: Partial<PlannerContextInput> = {}): PlannerContextInput => ({
  profile: profile(),
  checklistItems: [],
  budgetItems: [],
  guests: [],
  savedVendors: [],
  appointments: [],
  completedCount: 0,
  ...over
});

describe('derivePlannerContext', () => {
  it('flags budget risk when planned exceeds the cap', () => {
    const ctx = derivePlannerContext(baseInput({
      profile: profile({ totalBudget: 10000 }),
      budgetItems: [{ id: 'b1', category: 'Catering', planned: 15000, actual: 0, paid: 0, status: 'not-started', note: '' }]
    }));
    expect(ctx.stateSummary).toMatch(/RISIKO/);
  });

  it('reports OK budget status within the cap', () => {
    const ctx = derivePlannerContext(baseInput({
      profile: profile({ totalBudget: 50000 }),
      budgetItems: [{ id: 'b1', category: 'Catering', planned: 20000, actual: 0, paid: 5000, status: 'in-progress', note: '' }]
    }));
    expect(ctx.stateSummary).toMatch(/Bajet: OK/);
  });

  it('summarises guest status counts', () => {
    const ctx = derivePlannerContext(baseInput({
      profile: profile({ guestTarget: 200 }),
      guests: [
        { id: 'g1', name: 'A', phone: '', group: 'F', pax: 2, status: 'confirmed' },
        { id: 'g2', name: 'B', phone: '', group: 'F', pax: 1, status: 'pending' }
      ]
    }));
    expect(ctx.stateSummary).toMatch(/2 pax confirm, 1 pending, 0 decline \(target 200\)/);
  });

  it('lists the vendor shortlist by name and notes when empty', () => {
    const empty = derivePlannerContext(baseInput());
    expect(empty.stateSummary).toMatch(/belum ada shortlist vendor/);
  });

  it('computes daysLeft and surfaces it in the summary', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const iso = future.toISOString().slice(0, 10);
    const ctx = derivePlannerContext(baseInput({ profile: profile({ majlisDate: iso }) }));
    expect(typeof ctx.daysLeft).toBe('number');
    expect(ctx.stateSummary).toMatch(/hari lagi/);
  });

  it('reports checklist completion progress', () => {
    const ctx = derivePlannerContext(baseInput({
      checklistItems: [
        { id: 'c1', text: 'Book venue', completed: true, status: 'done' },
        { id: 'c2', text: 'Book caterer', completed: false, status: 'not-started' }
      ],
      completedCount: 1
    }));
    expect(ctx.checklistSummary).toMatch(/1\/2 selesai/);
  });
});
