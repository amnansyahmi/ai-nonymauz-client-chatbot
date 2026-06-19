import { describe, expect, it } from 'vitest';
import {
  parseChecklistItems,
  findChecklistDuplicate,
  findBudgetDuplicate,
  findAppointmentDuplicate,
  detectPlannerDuplicate,
  hasAddIntent,
  wantsNewEntry,
  wantsMarkDone,
  buildDuplicateClarifyMessage
} from '../lib/planner/duplicateGuard';
import { parseClarify } from '../lib/planner/chatClarify';

const checklistSummary = [
  '3/10 selesai | 1 overdue | 2 due minggu ini',
  'Task terbuka (ikut keutamaan):',
  '• Buat ujian HIV (syarat kursus pra-perkahwinan) [3-6 bulan] — not-started, due dalam 20 hari',
  '• Tempah pelamin & dekorasi [5-3 bulan] — in-progress, due dalam 40 hari',
  '• Cari photographer — not-started, tiada tarikh'
].join('\n');

describe('parseChecklistItems', () => {
  it('extracts task texts without phase or status', () => {
    const items = parseChecklistItems(checklistSummary);
    expect(items).toContain('Buat ujian HIV (syarat kursus pra-perkahwinan)');
    expect(items).toContain('Cari photographer');
    expect(items.some((i) => i.includes('selesai |'))).toBe(false);
  });

  it('returns [] for empty input', () => {
    expect(parseChecklistItems(undefined)).toEqual([]);
    expect(parseChecklistItems('')).toEqual([]);
  });
});

describe('findChecklistDuplicate', () => {
  it('matches a repeated HIV question against the existing task', () => {
    const match = findChecklistDuplicate('bila kena buat ujian HIV?', checklistSummary);
    expect(match).not.toBeNull();
    expect(match?.category).toBe('checklist');
    expect(['hiv', 'ujian']).toContain(match?.topic);
    expect(match?.existing).toContain('HIV');
  });

  it('matches across languages via the shared domain keyword', () => {
    const match = findChecklistDuplicate('I want to add a photographer', checklistSummary);
    expect(match?.topic).toBe('photographer');
  });

  it('does not match unrelated requests', () => {
    expect(findChecklistDuplicate('apa bajet untuk honeymoon?', checklistSummary)).toBeNull();
  });

  it('does not false-match on generic stopwords', () => {
    expect(findChecklistDuplicate('I want to add something for my wedding day', checklistSummary)).toBeNull();
  });
});

describe('findBudgetDuplicate / findAppointmentDuplicate', () => {
  it('matches an existing budget category', () => {
    const match = findBudgetDuplicate('tambah bajet katering', ['Katering: planned RM10k, actual RM0, paid RM0']);
    expect(match?.category).toBe('budget');
    expect(match?.topic).toBe('katering');
  });

  it('matches an existing appointment title', () => {
    const match = findAppointmentDuplicate('set appointment dengan photographer lagi', [
      { title: 'Photographer meeting' }
    ]);
    expect(match?.category).toBe('appointment');
    expect(match?.topic).toBe('photographer');
  });
});

describe('intent helpers', () => {
  it('detects add intent', () => {
    expect(hasAddIntent('tambah ujian HIV ke checklist')).toBe(true);
    expect(hasAddIntent('add a photographer')).toBe(true);
    expect(hasAddIntent('bila kena buat ujian HIV?')).toBe(false);
  });

  it('detects new-entry confirmation', () => {
    expect(wantsNewEntry('Tambah "ujian HIV" baru')).toBe(true);
    expect(wantsNewEntry('add a new entry')).toBe(true);
    expect(wantsNewEntry('sama je')).toBe(false);
  });

  it('detects mark-done confirmation', () => {
    expect(wantsMarkDone('Tandakan "ujian HIV" selesai')).toBe(true);
    expect(wantsMarkDone('mark it done')).toBe(true);
  });
});

describe('buildDuplicateClarifyMessage', () => {
  it('produces a clarify block with topic-aware chips (MS)', () => {
    const match = detectPlannerDuplicate('tambah ujian HIV', { checklistSummary })!;
    const message = buildDuplicateClarifyMessage(match, 'ms');
    const options = parseClarify(message);
    expect(options.length).toBeGreaterThanOrEqual(2);
    // The "new entry" chip carries the topic so the follow-up message routes back.
    expect(options.some((o) => wantsNewEntry(o))).toBe(true);
    expect(options.some((o) => wantsMarkDone(o))).toBe(true);
  });

  it('produces an English clarify block', () => {
    const match = detectPlannerDuplicate('add a photographer', { checklistSummary })!;
    const message = buildDuplicateClarifyMessage(match, 'en');
    expect(message).toContain('checklist');
    expect(parseClarify(message).length).toBeGreaterThanOrEqual(2);
  });
});
