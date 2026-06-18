'use client';

import { useCallback, useMemo } from 'react';
import { checklistTemplates, defaultChecklistTemplate, storageKeys } from '../data';
import type { AppLanguage, ChecklistItem } from '../types';
import {
  daysUntil,
  fallbackChecklist,
  generateDefaultChecklist,
  localizedValue
} from '../utils';
import { useLocalStorage } from '../../../lib/hooks/useLocalStorage';

export type ChecklistView = 'next' | 'timeline' | 'category' | 'completed';

export type ChecklistPriority = 'urgent' | 'soon' | 'later' | 'done';

export type UseChecklistOptions = {
  language: AppLanguage;
};

export type UseChecklistResult = {
  items: ChecklistItem[];
  title: string;
  view: ChecklistView;
  filter: string;
  setFilter: (filter: string) => void;
  setView: (view: ChecklistView) => void;
  newItemDraft: string;
  setNewItemDraft: (value: string) => void;
  hydrated: boolean;
  completedCount: number;
  total: number;
  progress: number;
  openItems: ChecklistItem[];
  completedItems: ChecklistItem[];
  nextItems: ChecklistItem[];
  urgentCount: number;
  soonCount: number;
  dueThisMonthCount: number;
  focusGroups: Array<{ key: string; title: string; helper: string; items: ChecklistItem[] }>;
  phaseGroups: Array<{ phase: string; items: ChecklistItem[] }>;
  categoryGroups: Array<{ phase: string; items: ChecklistItem[] }>;
  statusCounts: Array<{ value: 'all' | 'not-started' | 'in-progress' | 'done'; label: string; count: number }>;
  viewOptions: Array<{ value: ChecklistView; label: string; count: number }>;
  setTitle: (title: string) => void;
  setItems: (updater: (current: ChecklistItem[]) => ChecklistItem[]) => void;
  replaceAll: (items: ChecklistItem[], title?: string) => void;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  addManual: (text: string) => void;
  updateStatus: (id: string, status: NonNullable<ChecklistItem['status']>) => void;
  loadDefault: (weddingDate?: string) => void;
  loadTemplate: (template: (typeof checklistTemplates)[number]) => void;
  generateFromPrompt: (prompt: string, parsed: ChecklistItem[]) => void;
  applyFromText: (text: string, parsed: ChecklistItem[]) => void;
  getItemText: (item: ChecklistItem, lang?: AppLanguage) => string;
  getItemPhase: (item: ChecklistItem, lang?: AppLanguage) => string;
  getPriority: (item: ChecklistItem) => { className: ChecklistPriority; label: string };
  getStatus: (item: ChecklistItem) => NonNullable<ChecklistItem['status']>;
  copy: { defaultTemplate: string; custom: string };
};

const PRIORITY_LABELS: Record<AppLanguage, Record<ChecklistPriority, string>> = {
  ms: { urgent: 'Urgent', soon: 'Soon', later: 'Later', done: 'Selesai' },
  en: { urgent: 'Urgent', soon: 'Soon', later: 'Later', done: 'Done' }
};

export function useChecklist({ language }: UseChecklistOptions): UseChecklistResult {
  const [items, setItemsRaw, hydrated] = useLocalStorage<ChecklistItem[]>(storageKeys.checklistItems, []);
  const [title, setTitleRaw, titleHydrated] = useLocalStorage<string>(storageKeys.checklistTitle, 'Checklist MajlisMate');
  const [view, setViewRaw] = useLocalStorage<ChecklistView>(storageKeys.checklistView, 'next');
  const [filter, setFilterRaw] = useLocalStorage<string>(storageKeys.checklistFilter, 'all');
  const [newItemDraft, setNewItemDraft] = useLocalStorage<string>(storageKeys.checklistNewDraft, '');

  const setItems = useCallback(
    (updater: (current: ChecklistItem[]) => ChecklistItem[]) => {
      setItemsRaw((current) => updater(current));
    },
    [setItemsRaw]
  );

  const setTitle = useCallback(
    (next: string) => {
      setTitleRaw(next);
    },
    [setTitleRaw]
  );

  const getItemText = useCallback(
    (item: ChecklistItem, lang: AppLanguage = language) =>
      (lang === 'ms' ? item.textMs || item.text : item.textEn || item.text) ?? '',
    [language]
  );

  const getItemPhase = useCallback(
    (item: ChecklistItem, lang: AppLanguage = language) =>
      (lang === 'ms' ? item.phaseMs || item.phase : item.phaseEn || item.phase) ?? '',
    [language]
  );

  const getStatus = useCallback(
    (item: ChecklistItem): NonNullable<ChecklistItem['status']> =>
      item.status || (item.completed ? 'done' : 'not-started'),
    []
  );

  const getPriority = useCallback(
    (item: ChecklistItem) => {
      if (item.completed || item.status === 'done') {
        return { className: 'done' as const, label: PRIORITY_LABELS[language].done };
      }
      if (!item.deadline) {
        return { className: 'later' as const, label: PRIORITY_LABELS[language].later };
      }
      const due = daysUntil(item.deadline);
      if (due !== null && due < 0) return { className: 'urgent' as const, label: language === 'ms' ? 'Overdue' : 'Overdue' };
      if (due !== null && due <= 14) return { className: 'urgent' as const, label: PRIORITY_LABELS[language].urgent };
      if (due !== null && due <= 45) return { className: 'soon' as const, label: PRIORITY_LABELS[language].soon };
      return { className: 'later' as const, label: PRIORITY_LABELS[language].later };
    },
    [language]
  );

  const toggle = useCallback(
    (id: string) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, completed: !item.completed, status: !item.completed ? 'done' : 'not-started' }
            : item
        )
      );
    },
    [setItems]
  );

  const remove = useCallback(
    (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
    },
    [setItems]
  );

  const addManual = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setItems((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          text: trimmed,
          textMs: language === 'ms' ? trimmed : undefined,
          textEn: language === 'en' ? trimmed : undefined,
          completed: false,
          status: 'not-started',
          phase: 'Custom'
        }
      ]);
    },
    [setItems, language]
  );

  const updateStatus = useCallback(
    (id: string, status: NonNullable<ChecklistItem['status']>) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, status, completed: status === 'done' } : item)));
    },
    [setItems]
  );

  const replaceAll = useCallback(
    (next: ChecklistItem[], nextTitle?: string) => {
      setItems(() => next);
      if (nextTitle !== undefined) setTitle(nextTitle);
    },
    [setItems, setTitle]
  );

  const loadDefault = useCallback(
    (weddingDate?: string) => {
      replaceAll(generateDefaultChecklist(weddingDate), 'Majlis planning checklist');
    },
    [replaceAll]
  );

  const loadTemplate = useCallback(
    (template: (typeof checklistTemplates)[number]) => {
      const localized = localizedValue(template.title, language);
      replaceAll(
        template.items.map((item, index) => ({
          id: `${Date.now()}-${index}`,
          text: item.ms,
          textMs: item.ms,
          textEn: item.en,
          completed: false,
          status: 'not-started' as const,
          phase: localizedValue(item.phase, language) || undefined,
          phaseMs: item.phase?.ms,
          phaseEn: item.phase?.en
        })),
        localized
      );
    },
    [replaceAll, language]
  );

  const generateFromPrompt = useCallback(
    (prompt: string, parsed: ChecklistItem[]) => {
      const nextTitle = prompt.length > 64 ? `${prompt.slice(0, 61)}...` : prompt;
      const next = parsed.length > 0 ? parsed : fallbackChecklist(prompt);
      replaceAll(next.map((item) => ({ ...item, status: 'not-started' as const })), nextTitle);
    },
    [replaceAll]
  );

  const applyFromText = useCallback(
    (text: string, parsed: ChecklistItem[]) => {
      if (parsed.length === 0) {
        replaceAll(fallbackChecklist(text).map((item) => ({ ...item, status: 'not-started' as const })));
        return;
      }
      replaceAll(parsed.map((item) => ({ ...item, status: 'not-started' as const })));
    },
    [replaceAll]
  );

  const completedCount = useMemo(() => items.filter((item) => item.completed).length, [items]);
  const total = items.length;
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const openItems = useMemo(() => items.filter((item) => getStatus(item) !== 'done'), [items, getStatus]);
  const completedItems = useMemo(() => items.filter((item) => getStatus(item) === 'done'), [items, getStatus]);

  const scoreItem = useCallback(
    (item: ChecklistItem) => {
      const priority = getPriority(item).className;
      const due = item.deadline ? daysUntil(item.deadline) : null;
      const priorityScore = priority === 'urgent' ? 0 : priority === 'soon' ? 1 : 2;
      const statusScore = getStatus(item) === 'in-progress' ? -0.25 : 0;
      return priorityScore + statusScore + (due === null ? 999 : Math.max(due, -30) / 1000);
    },
    [getPriority, getStatus]
  );

  const nextItems = useMemo(
    () => [...openItems].sort((a, b) => scoreItem(a) - scoreItem(b)).slice(0, 6),
    [openItems, scoreItem]
  );

  const urgentCount = useMemo(() => items.filter((item) => getPriority(item).className === 'urgent').length, [items, getPriority]);
  const soonCount = useMemo(() => items.filter((item) => getPriority(item).className === 'soon').length, [items, getPriority]);
  const dueThisMonthCount = useMemo(() => {
    const today = new Date();
    return items.filter((item) => {
      if (item.completed || item.status === 'done' || !item.deadline) return false;
      const dueDate = new Date(`${item.deadline}T00:00:00`);
      return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
    }).length;
  }, [items]);

  const focusGroups = useMemo(() => {
    const groups = [
      {
        key: 'now',
        title: language === 'ms' ? 'Sekarang' : 'Now',
        helper: language === 'ms' ? 'Overdue, urgent, atau sedang diurus.' : 'Overdue, urgent, or already in progress.',
        items: openItems
          .filter((item) => getPriority(item).className === 'urgent' || getStatus(item) === 'in-progress')
          .sort((a, b) => scoreItem(a) - scoreItem(b))
          .slice(0, 4)
      },
      {
        key: 'week',
        title: language === 'ms' ? 'Minggu ini' : 'This week',
        helper: language === 'ms' ? 'Task yang elok diselesaikan selepas item urgent.' : 'Tasks to handle after urgent items.',
        items: openItems
          .filter((item) => getPriority(item).className === 'soon')
          .sort((a, b) => scoreItem(a) - scoreItem(b))
          .slice(0, 4)
      },
      {
        key: 'later',
        title: language === 'ms' ? 'Kemudian' : 'Later',
        helper: language === 'ms' ? 'Belum kritikal, tapi jangan hilang dari radar.' : 'Not critical yet, but keep it visible.',
        items: openItems
          .filter((item) => getPriority(item).className === 'later')
          .sort((a, b) => scoreItem(a) - scoreItem(b))
          .slice(0, 4)
      }
    ];
    return groups.filter((group) => group.items.length > 0);
  }, [openItems, getPriority, getStatus, scoreItem, language]);

  const phaseGroups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      const phase = item.phase || 'Custom';
      if (!map.has(phase)) map.set(phase, []);
      map.get(phase)!.push(item);
    }
    return Array.from(map.entries()).map(([phase, list]) => ({ phase, items: list }));
  }, [items]);

  const categoryGroups = phaseGroups.length > 0 ? phaseGroups : [{ phase: 'Custom', items }];

  const statusCounts = useMemo(() => {
    const notStarted = items.filter((item) => getStatus(item) === 'not-started').length;
    const inProgress = items.filter((item) => getStatus(item) === 'in-progress').length;
    return [
      { value: 'all' as const, label: language === 'ms' ? 'Semua' : 'All', count: items.length },
      { value: 'not-started' as const, label: language === 'ms' ? 'Belum Mula' : 'Not started', count: notStarted },
      { value: 'in-progress' as const, label: language === 'ms' ? 'Sedang Diurus' : 'In progress', count: inProgress },
      { value: 'done' as const, label: language === 'ms' ? 'Selesai' : 'Done', count: completedCount }
    ];
  }, [items, getStatus, completedCount, language]);

  const viewOptions = useMemo(
    () => [
      { value: 'next' as const, label: language === 'ms' ? 'Seterusnya' : 'Next', count: nextItems.length },
      { value: 'timeline' as const, label: language === 'ms' ? 'Timeline' : 'Timeline', count: phaseGroups.length || items.length },
      { value: 'category' as const, label: language === 'ms' ? 'Kategori' : 'Category', count: categoryGroups.length },
      { value: 'completed' as const, label: language === 'ms' ? 'Selesai' : 'Completed', count: completedItems.length }
    ],
    [nextItems, phaseGroups, categoryGroups, completedItems, items, language]
  );

  const copy = useMemo(
    () => ({
      defaultTemplate: language === 'ms' ? 'Checklist MajlisMate' : 'MajlisMate checklist',
      custom: language === 'ms' ? 'Custom' : 'Custom'
    }),
    [language]
  );

  const setFilterValue = useCallback(
    (next: string) => {
      setFilterRaw(next);
    },
    [setFilterRaw]
  );

  const setViewValue = useCallback(
    (next: ChecklistView) => {
      setViewRaw(next);
    },
    [setViewRaw]
  );

  return {
    items,
    title,
    view,
    filter,
    setFilter: setFilterValue,
    setView: setViewValue,
    newItemDraft,
    setNewItemDraft,
    hydrated: hydrated && titleHydrated,
    completedCount,
    total,
    progress,
    openItems,
    completedItems,
    nextItems,
    urgentCount,
    soonCount,
    dueThisMonthCount,
    focusGroups,
    phaseGroups,
    categoryGroups,
    statusCounts,
    viewOptions,
    setTitle,
    setItems,
    replaceAll,
    toggle,
    remove,
    addManual,
    updateStatus,
    loadDefault,
    loadTemplate,
    generateFromPrompt,
    applyFromText,
    getItemText,
    getItemPhase,
    getPriority,
    getStatus,
    copy
  };
}

// Re-export the default template phases so consumers can label sections
export const CHECKLIST_PHASE_TEMPLATES = defaultChecklistTemplate;
