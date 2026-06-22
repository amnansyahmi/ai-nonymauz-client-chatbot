import { describe, expect, it } from 'vitest';
import {
  extractFacts,
  mergeFacts,
  memoryToContext
} from '../lib/ai/conversationMemory';

describe('conversationMemory', () => {
  describe('extractFacts', () => {
    it('captures partner name in Bahasa Melayu', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Suami saya ialah Amir' }
      ]);
      const partnerFact = facts.find((f) => f.key.startsWith('partner:'));
      expect(partnerFact).toBeDefined();
      expect(partnerFact?.value).toBe('Amir');
    });

    it('captures wedding date in Malay month format', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Majlis saya pada 15 Jun 2026' }
      ]);
      const dateFact = facts.find((f) => f.key === 'wedding:date');
      expect(dateFact?.value).toContain('15 Jun 2026');
    });

    it('captures budget in RM', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Bajet saya adalah RM 50000' }
      ]);
      const budgetFact = facts.find((f) => f.key.startsWith('budget:'));
      expect(budgetFact).toBeDefined();
    });

    it('captures guest count', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Jumlah tetamu saya 300 orang' }
      ]);
      const guestFact = facts.find((f) => f.key.startsWith('guest:'));
      expect(guestFact?.value).toBe('300');
    });

    it('captures venue', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Dewan saya di KLCC' }
      ]);
      const venueFact = facts.find((f) => f.key.startsWith('venue:'));
      expect(venueFact).toBeDefined();
    });

    it('captures theme', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Tema saya ialah garden rustic' }
      ]);
      const themeFact = facts.find((f) => f.key.startsWith('theme:'));
      expect(themeFact?.value).toContain('garden rustic');
    });

    it('captures preference', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Saya suka jawapan yang pendek' }
      ]);
      const pref = facts.find((f) => f.key.startsWith('preference:'));
      expect(pref?.value).toBe('pendek');
    });

    it('ignores assistant messages', () => {
      const facts = extractFacts([
        { role: 'assistant', content: 'Suami saya ialah Amir' },
        { role: 'user', content: 'Tolong saya' }
      ]);
      expect(facts.find((f) => f.key.startsWith('partner:'))).toBeUndefined();
    });

    it('returns deduplicated facts for repeated keys', () => {
      const facts = extractFacts([
        { role: 'user', content: 'Tarikh majlis 1 Januari 2026' },
        { role: 'user', content: 'Tarikh majlis 1 Januari 2026' }
      ]);
      const dateFacts = facts.filter((f) => f.key === 'wedding:date');
      expect(dateFacts).toHaveLength(1);
    });
  });

  describe('mergeFacts', () => {
    it('keeps existing facts when no new ones are provided', () => {
      const existing = [
        { key: 'partner:Amir', value: 'Amir', capturedAt: '2026-01-01T00:00:00Z' }
      ];
      const merged = mergeFacts(existing, []);
      expect(merged).toEqual(existing);
    });

    it('adds new facts without removing existing ones', () => {
      const existing = [
        { key: 'partner:Amir', value: 'Amir', capturedAt: '2026-01-01T00:00:00Z' }
      ];
      const incoming = [
        { key: 'venue:KLCC', value: 'KLCC', capturedAt: '2026-01-02T00:00:00Z' }
      ];
      const merged = mergeFacts(existing, incoming);
      expect(merged).toHaveLength(2);
    });

    it('newer fact wins when both have the same key', () => {
      const existing = [
        { key: 'partner:Amir', value: 'Amir', capturedAt: '2026-01-01T00:00:00Z' }
      ];
      const incoming = [
        { key: 'partner:Amir', value: 'Amir', capturedAt: '2026-02-01T00:00:00Z' }
      ];
      const merged = mergeFacts(existing, incoming);
      expect(merged).toHaveLength(1);
      expect(merged[0].capturedAt).toBe('2026-02-01T00:00:00Z');
    });
  });

  describe('memoryToContext', () => {
    it('returns empty string when no facts', () => {
      expect(memoryToContext([])).toBe('');
    });

    it('renders Malay context', () => {
      const ctx = memoryToContext([
        { key: 'partner:Amir', value: 'Amir', capturedAt: '2026-01-01' }
      ], 'ms');
      expect(ctx).toContain('Apa yang saya tahu');
      expect(ctx).toContain('Amir');
    });

    it('renders English context', () => {
      const ctx = memoryToContext(
        [
          { key: 'partner:Amir', value: 'Amir', capturedAt: '2026-01-01' },
          { key: 'wedding:date', value: '1 Jan 2026', capturedAt: '2026-01-01' }
        ],
        'en'
      );
      expect(ctx).toContain('What I know');
      expect(ctx).toContain('Amir');
      expect(ctx).toContain('Wedding');
    });

    it('caps at 10 facts to keep context short', () => {
      const facts = Array.from({ length: 15 }, (_, i) => ({
        key: `fact:${i}`,
        value: `value-${i}`,
        capturedAt: '2026-01-01'
      }));
      const ctx = memoryToContext(facts);
      const lines = ctx.split('\n').filter((l) => l.startsWith('-'));
      expect(lines).toHaveLength(10);
    });
  });
});
