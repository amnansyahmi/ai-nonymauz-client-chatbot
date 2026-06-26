'use client';

import { useCallback, useMemo } from 'react';
import { defaultBudgetItems, storageKeys } from '../data';
import type { BudgetItem, PlannerProfile } from '../types';
import { downloadTextFile, money, statusLabel } from '../utils';
import { useLocalStorage } from '@/lib/hooks/useLocalStorage';

export type UseBudgetOptions = {
  profile: PlannerProfile;
};

export type UseBudgetResult = {
  items: BudgetItem[];
  draft: BudgetItem;
  setDraft: (updater: (current: BudgetItem) => BudgetItem) => void;
  resetDraft: () => void;
  add: (next?: Partial<BudgetItem>) => void;
  update: (id: string, patch: Partial<BudgetItem>) => void;
  remove: (id: string) => void;
  addSuggestion: (item: BudgetItem) => boolean;
  applySmartAllocation: (total?: number) => void;
  exportCsv: () => void;
  totalPlanned: number;
  totalActual: number;
  totalPaid: number;
  remainingToPay: number;
  overBudgetItems: BudgetItem[];
  budgetAlert: string;
  hydrated: boolean;
};

const EMPTY_DRAFT: BudgetItem = {
  id: '',
  category: '',
  planned: 0,
  actual: 0,
  paid: 0,
  status: 'not-started',
  note: ''
};

const ALLOCATION_RULES: Array<{ test: RegExp; percent: number }> = [
  { test: /venue|dewan|hall/i, percent: 0.24 },
  { test: /cater|katering|catering/i, percent: 0.34 },
  { test: /pelamin|dekor|decor/i, percent: 0.1 },
  { test: /baju|andaman|mua|makeup/i, percent: 0.1 },
  { test: /photo|foto|video/i, percent: 0.1 },
  { test: /contingency|kecemasan|buffer/i, percent: 0.07 }
];

export function computeAllocation(items: BudgetItem[], total: number) {
  return items.map((item) => {
    const rule = ALLOCATION_RULES.find((candidate) => candidate.test.test(item.category));
    if (rule) return { ...item, planned: Math.round(total * rule.percent) };
    if (item.planned > 0) return item;
    return { ...item, planned: Math.round(total * 0.05) };
  });
}

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function useBudget({ profile }: UseBudgetOptions): UseBudgetResult {
  const [items, setItems, hydrated] = useLocalStorage<BudgetItem[]>(storageKeys.budgetItems, defaultBudgetItems);
  const [draft, setDraftRaw, draftHydrated] = useLocalStorage<BudgetItem>(storageKeys.budgetDraft, EMPTY_DRAFT);

  const setDraft = useCallback(
    (updater: (current: BudgetItem) => BudgetItem) => {
      setDraftRaw((current) => updater(current));
    },
    [setDraftRaw]
  );

  const resetDraft = useCallback(() => {
    setDraftRaw(EMPTY_DRAFT);
  }, [setDraftRaw]);

  const add = useCallback(
    (next?: Partial<BudgetItem>) => {
      setItems((current) => {
        const category = (next?.category ?? draft.category).trim();
        if (!category) return current;
        const planned = Number(next?.planned ?? draft.planned) || 0;
        const actual = Number(next?.actual ?? draft.actual) || 0;
        const paid = Number(next?.paid ?? draft.paid) || 0;
        return [
          ...current,
          {
            id: `${Date.now()}-${current.length}`,
            category,
            planned,
            actual,
            paid,
            status: next?.status ?? draft.status,
            note: next?.note ?? draft.note
          }
        ];
      });
    },
    [setItems, draft]
  );

  const update = useCallback(
    (id: string, patch: Partial<BudgetItem>) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [setItems]
  );

  const remove = useCallback(
    (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
    },
    [setItems]
  );

  const addSuggestion = useCallback(
    (item: BudgetItem) => {
      const category = item.category.trim();
      if (!category) return false;
      let added = false;
      setItems((current) => {
        if (current.some((budget) => budget.category.trim().toLowerCase() === category.toLowerCase())) {
          return current;
        }
        added = true;
        return [
          ...current,
          { ...item, id: `suggested-${Date.now()}`, actual: 0, paid: 0, status: 'not-started' }
        ];
      });
      return added;
    },
    [setItems]
  );

  const applySmartAllocation = useCallback(
    (total?: number) => {
      const base = Math.max(total || profile.totalBudget || 30000, 10000);
      setItems((current) => computeAllocation(current, base));
    },
    [setItems, profile.totalBudget]
  );

  const exportCsv = useCallback(() => {
    const rows = [
      ['category', 'planned', 'actual', 'paid', 'status', 'note'],
      ...items.map((item) => [
        item.category,
        String(item.planned),
        String(item.actual),
        String(item.paid),
        statusLabel(item.status),
        item.note
      ])
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    downloadTextFile('majlismate-budget.csv', csv, 'text/csv');
  }, [items]);

  const totalPlanned = useMemo(() => items.reduce((sum, item) => sum + (Number(item.planned) || 0), 0), [items]);
  const totalActual = useMemo(() => items.reduce((sum, item) => sum + (Number(item.actual) || 0), 0), [items]);
  const totalPaid = useMemo(() => items.reduce((sum, item) => sum + (Number(item.paid) || 0), 0), [items]);
  const remainingToPay = Math.max(totalActual - totalPaid, 0);

  const overBudgetItems = useMemo(
    () => items.filter((item) => item.actual > item.planned && item.planned > 0),
    [items]
  );

  const budgetAlert = useMemo(() => {
    if (overBudgetItems.length > 0) return `${overBudgetItems.length} over budget`;
    if (remainingToPay > 0) return `${money(remainingToPay)} to pay`;
    if (totalActual > 0) return 'On track';
    return 'Ready to plan';
  }, [overBudgetItems, remainingToPay, totalActual]);

  return {
    items,
    draft,
    setDraft,
    resetDraft,
    add,
    update,
    remove,
    addSuggestion,
    applySmartAllocation,
    exportCsv,
    totalPlanned,
    totalActual,
    totalPaid,
    remainingToPay,
    overBudgetItems,
    budgetAlert,
    hydrated: hydrated && draftHydrated
  };
}
