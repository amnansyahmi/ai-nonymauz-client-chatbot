import { describe, expect, it } from 'vitest';
import { buildHighlightPrompt } from '../lib/ai/highlightToAsk';

describe('highlightToAsk', () => {
  describe('buildHighlightPrompt', () => {
    it('produces a Bahasa Melayu prompt for short text', () => {
      expect(buildHighlightPrompt('Hello world', 'ms')).toBe('Tentang ni: "Hello world" — apa maksudnya?');
    });

    it('produces an English prompt for short text', () => {
      expect(buildHighlightPrompt('Hello world', 'en')).toBe('About this: "Hello world" — what does it mean?');
    });

    it('truncates very long text with ellipsis', () => {
      const long = 'a'.repeat(300);
      const result = buildHighlightPrompt(long, 'ms');
      expect(result).toContain('…');
      expect(result.length).toBeLessThan(long.length);
    });

    it('preserves text exactly when at the limit', () => {
      const text = 'a'.repeat(200);
      expect(buildHighlightPrompt(text, 'ms')).toContain('a'.repeat(200));
    });
  });
});
