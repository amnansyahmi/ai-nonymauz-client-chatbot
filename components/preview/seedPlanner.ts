import { storageKeys, defaultPlannerProfile } from '../planner/data';
import type { BudgetItem, ChecklistItem } from '../planner/types';

export type PreviewSeed = {
  items: ChecklistItem[];
  title: string;
  budgetItems: BudgetItem[];
  profileUpdate: Record<string, unknown>;
};

/**
 * Carry the preview wizard's generated plan into the real planner, so a couple
 * who completes the funnel lands in a pre-populated app instead of an empty
 * wizard.
 *
 * Guarded: if a planner checklist already exists we do NOT overwrite it — an
 * existing user replaying /preview keeps their real plan. Returns true if the
 * seed was written.
 */
export function seedPlannerFromPreview(seed: PreviewSeed): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const existing = window.localStorage.getItem(storageKeys.checklistItems);
    const parsed = existing ? JSON.parse(existing) : [];
    if (Array.isArray(parsed) && parsed.length > 0) return false;

    window.localStorage.setItem(storageKeys.checklistItems, JSON.stringify(seed.items));
    window.localStorage.setItem(storageKeys.checklistTitle, seed.title);
    window.localStorage.setItem(storageKeys.budgetItems, JSON.stringify(seed.budgetItems));
    window.localStorage.setItem(
      storageKeys.plannerProfile,
      JSON.stringify({ ...defaultPlannerProfile, ...seed.profileUpdate, completed: true })
    );
    return true;
  } catch {
    return false;
  }
}
