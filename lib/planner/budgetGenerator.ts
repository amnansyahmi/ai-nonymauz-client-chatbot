import type { BudgetItem } from '../../components/planner/types';

/**
 * Shared, guest-aware budget blueprint. Single source of truth for both the
 * setup wizard's instant budget and the in-app "suggest a full budget" action.
 * Percentages are of the total budget; catering scales up with guest count.
 */
export type BudgetBlueprintEntry = { match: RegExp; label: string; percent: number };

export function cateringPercentForGuests(guests: number): number {
  return guests > 600 ? 0.36 : guests > 300 ? 0.32 : 0.3;
}

export function budgetBlueprint(guests: number): BudgetBlueprintEntry[] {
  return [
    { match: /venue|dewan|hall/i, label: 'Venue / Dewan', percent: 0.18 },
    { match: /cater|katering|catering/i, label: 'Catering', percent: cateringPercentForGuests(guests) },
    { match: /pelamin|dekor|decor/i, label: 'Pelamin & Dekorasi', percent: 0.1 },
    { match: /baju|pengantin|attire|dress/i, label: 'Baju Pengantin', percent: 0.06 },
    { match: /andaman|mua|makeup|make-?up/i, label: 'Andaman / MUA', percent: 0.06 },
    { match: /photo|foto/i, label: 'Photography', percent: 0.06 },
    { match: /video/i, label: 'Videography', percent: 0.05 },
    { match: /kad|invitation|jemputan/i, label: 'Kad Jemputan', percent: 0.02 },
    { match: /cender|doorgift|door gift|gift/i, label: 'Cenderahati', percent: 0.04 },
    { match: /hantaran/i, label: 'Hantaran', percent: 0.05 },
    { match: /kompang|hiburan|entertain/i, label: 'Kompang & Hiburan', percent: 0.02 },
    { match: /transport/i, label: 'Transport', percent: 0.02 },
    { match: /pengin|accommod|hotel|stay/i, label: 'Penginapan', percent: 0.03 }
  ];
}

/** Contingency takes whatever the blueprint leaves unallocated (min 5%). */
export function contingencyPercent(guests: number): number {
  const allocated = budgetBlueprint(guests).reduce((sum, item) => sum + item.percent, 0);
  return Math.max(0.05, 1 - allocated);
}

/**
 * Generate a fresh budget breakdown from a total and guest count. Used by the
 * setup wizard so couples land on a populated budget, not an empty table.
 *
 * The blueprint weights don't sum to exactly 1, so we normalize every line by
 * the total weight — guaranteeing the breakdown sums to the couple's stated
 * budget rather than overshooting it. Returns [] when there is no usable total.
 */
export function generateBudgetBreakdown(total: number, guests: number): BudgetItem[] {
  const base = Math.max(total || 0, 0);
  if (base <= 0) return [];

  const weighted = [
    ...budgetBlueprint(guests).map((entry, index) => ({
      id: `budget-setup-${entry.label.replace(/\W+/g, '')}-${index}`,
      category: entry.label,
      weight: entry.percent
    })),
    { id: 'budget-setup-contingency', category: 'Contingency', weight: contingencyPercent(guests) }
  ];
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0) || 1;

  return weighted.map((entry) => ({
    id: entry.id,
    category: entry.category,
    planned: Math.round((base * entry.weight) / totalWeight),
    actual: 0,
    paid: 0,
    status: 'not-started',
    note: ''
  }));
}
