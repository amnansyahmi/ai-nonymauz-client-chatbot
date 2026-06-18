import type { ChecklistItem } from '../../components/planner/types';

export type MonthBucket = {
  key: string;
  labelMs: string;
  labelEn: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  isPast: boolean;
  isWeddingMonth: boolean;
  isFuture: boolean;
};

const MS = ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogos','Sep','Okt','Nov','Dis'];
const EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function pad2(n: number): string { return n < 10 ? '0' + n : String(n); }

export function monthKey(d: Date): string { return d.getFullYear() + '-' + pad2(d.getMonth() + 1); }

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = /^(\\d{4})-(\\d{2})$/.exec(key);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function formatMonthLabel(key: string, locale: 'ms' | 'en' = 'ms'): string {
  const p = parseMonthKey(key);
  if (!p) return key;
  const labels = locale === 'ms' ? MS : EN;
  return labels[p.month - 1] + ' ' + p.year;
}

export function getMonthBucketFromDeadline(d: string | undefined): string | null {
  if (!d) return null;
  const date = new Date(d + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return null;
  return monthKey(date);
}

export function computeMonthBucketFromOffset(w: string | undefined, days: number): string | null {
  if (!w) return null;
  const wd = new Date(w + 'T00:00:00');
  if (Number.isNaN(wd.getTime())) return null;
  const d = new Date(wd);
  d.setDate(d.getDate() - days);
  return monthKey(d);
}

export function generateMonthBuckets(
  weddingDate: string | undefined,
  _locale: 'ms' | 'en' = 'ms'
): MonthBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentKey = monthKey(today);
  const wedding = weddingDate ? new Date(weddingDate + 'T00:00:00') : null;
  const valid = wedding !== null && !Number.isNaN(wedding.getTime());
  const weddingKey = valid ? monthKey(wedding) : null;
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = valid
    ? new Date(wedding.getFullYear(), wedding.getMonth() + 1, 1)
    : new Date(today.getFullYear(), today.getMonth() + 6, 1);
  const buckets: MonthBucket[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = monthKey(cursor);
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    buckets.push({
      key: key,
      labelMs: formatMonthLabel(key, 'ms'),
      labelEn: formatMonthLabel(key, 'en'),
      startDate: monthStart,
      endDate: monthEnd,
      isCurrent: key === currentKey,
      isPast: monthEnd < today,
      isWeddingMonth: key === weddingKey,
      isFuture: monthStart > today
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return buckets;
}

export type MonthGroup = {
  bucket: MonthBucket;
  items: ChecklistItem[];
  doneCount: number;
  totalCount: number;
};

export function groupItemsByMonth(items: ChecklistItem[], buckets: MonthBucket[]): MonthGroup[] {
  const byBucket = new Map<string, ChecklistItem[]>();
  const noBucket: ChecklistItem[] = [];
  for (const item of items) {
    if (!item.monthBucket) { noBucket.push(item); continue; }
    const existing = byBucket.get(item.monthBucket) ?? [];
    existing.push(item);
    byBucket.set(item.monthBucket, existing);
  }
  const groups: MonthGroup[] = buckets.map((b) => {
    const mi = byBucket.get(b.key) ?? [];
    return { bucket: b, items: mi, doneCount: mi.filter((i) => i.completed).length, totalCount: mi.length };
  });
  if (noBucket.length > 0) {
    groups.push({
      bucket: { key: '__no_deadline__', labelMs: 'Tiada tarikh', labelEn: 'No deadline', startDate: new Date(0), endDate: new Date(0), isCurrent: false, isPast: false, isWeddingMonth: false, isFuture: false },
      items: noBucket,
      doneCount: noBucket.filter((i) => i.completed).length,
      totalCount: noBucket.length
    });
  }
  return groups.filter((g) => g.totalCount > 0);
}

export function sortMonthGroups(groups: MonthGroup[]): MonthGroup[] {
  return [...groups].sort((a, b) => {
    if (a.bucket.key === '__no_deadline__') return 1;
    if (b.bucket.key === '__no_deadline__') return -1;
    if (a.bucket.isCurrent && !b.bucket.isCurrent) return -1;
    if (b.bucket.isCurrent && !a.bucket.isCurrent) return 1;
    if (a.bucket.isPast && !b.bucket.isPast) return -1;
    if (b.bucket.isPast && !a.bucket.isPast) return 1;
    if (a.bucket.isWeddingMonth && !b.bucket.isWeddingMonth) return -1;
    if (b.bucket.isWeddingMonth && !a.bucket.isWeddingMonth) return 1;
    return a.bucket.key.localeCompare(b.bucket.key);
  });
}

export function itemsDueThisMonth(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter((i) => i.monthBucket === monthKey(new Date()));
}

export function itemsDueThisMonthIncomplete(items: ChecklistItem[]): ChecklistItem[] {
  return itemsDueThisMonth(items).filter((i) => !i.completed);
}

export function itemsBehindSchedule(items: ChecklistItem[]): ChecklistItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return items.filter((item) => {
    if (item.completed || !item.monthBucket) return false;
    const p = parseMonthKey(item.monthBucket);
    if (!p) return false;
    const monthEnd = new Date(p.year, p.month, 0);
    monthEnd.setHours(23, 59, 59, 999);
    return monthEnd < today;
  });
}

export function migrateChecklistItems(items: ChecklistItem[]): ChecklistItem[] {
  let mutated = false;
  const next = items.map((item) => {
    if (item.monthBucket && item.monthBucketMs && item.monthBucketEn) return item;
    mutated = true;
    const key = getMonthBucketFromDeadline(item.deadline);
    if (!key) {
      return { ...item, monthBucket: undefined, monthBucketMs: undefined, monthBucketEn: undefined };
    }
    return {
      ...item,
      monthBucket: key,
      monthBucketMs: formatMonthLabel(key, 'ms'),
      monthBucketEn: formatMonthLabel(key, 'en')
    };
  });
  return mutated ? next : items;
}
