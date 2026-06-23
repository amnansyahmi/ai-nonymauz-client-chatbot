import { describe, expect, it } from 'vitest';
import { parseChatActions, stripActionBlock, summarizeAction } from '../lib/planner/chatActions';

function wrap(json: string) {
  return '<<<MM_ACTIONS' + String.fromCharCode(10) + json + String.fromCharCode(10) + 'MM_ACTIONS>>>';
}

describe('parseChatActions - reason field', () => {
  it('captures reason on add_checklist_item', () => {
    const text = 'HIV test wajib.' + String.fromCharCode(10) + wrap(JSON.stringify([{ type: 'add_checklist_item', text: 'Buat HIV test', deadline: '2026-06-15', phase: '6-9 Bulan Sebelum', reason: 'Wajib untuk kursus pra-perkahwinan JAIS' }]));
    const [action] = parseChatActions(text);
    expect(action).toMatchObject({ type: 'add_checklist_item', text: 'Buat HIV test', reason: 'Wajib untuk kursus pra-perkahwinan JAIS' });
  });

  it('omits reason when not provided', () => {
    const text = wrap(JSON.stringify([{ type: 'add_checklist_item', text: 'Book venue' }]));
    const [action] = parseChatActions(text);
    expect(action && action.reason).toBeUndefined();
  });

  it('captures reason on add_budget_item', () => {
    const text = wrap(JSON.stringify([{ type: 'add_budget_item', category: 'Dewan', planned: 5000, reason: 'Anggaran awal' }]));
    const [action] = parseChatActions(text);
    expect(action).toMatchObject({ type: 'add_budget_item', reason: 'Anggaran awal' });
  });
});

describe('summarizeAction - shows reason', () => {
  it('appends reason in add_checklist_item label', () => {
    const label = summarizeAction({ type: 'add_checklist_item', text: 'Buat HIV test', deadline: '2026-06-15', reason: 'Wajib JAIS' }, 'ms');
    expect(label.label).toContain('Wajib JAIS');
    expect(label.label).toContain('2026-06-15');
  });

  it('omits reason when not set', () => {
    const label = summarizeAction({ type: 'add_checklist_item', text: 'Book venue', deadline: '2026-06-15' }, 'en');
    expect(label.label).toBe('Book venue (2026-06-15)');
  });
});
