import { describe, expect, it } from 'vitest';
import {
  MM_CLARIFY_OPEN,
  MM_CLARIFY_CLOSE,
  parseClarify,
  stripClarifyBlock
} from '../lib/planner/chatClarify';

const wrap = (json: string) => `${MM_CLARIFY_OPEN}\n${json}\n${MM_CLARIFY_CLOSE}`;

describe('parseClarify', () => {
  it('returns [] when no block is present', () => {
    expect(parseClarify('Just a normal answer.')).toEqual([]);
  });

  it('parses a bare JSON array of options', () => {
    const text = `What vendor?\n${wrap('["Photographer", "Caterer", "Venue"]')}`;
    expect(parseClarify(text)).toEqual(['Photographer', 'Caterer', 'Venue']);
  });

  it('parses an { options: [...] } object form', () => {
    const text = wrap('{ "options": ["A", "B"] }');
    expect(parseClarify(text)).toEqual(['A', 'B']);
  });

  it('tolerates a code-fence wrapper', () => {
    const text = wrap('```json\n["A", "B"]\n```');
    expect(parseClarify(text)).toEqual(['A', 'B']);
  });

  it('requires at least two distinct options', () => {
    expect(parseClarify(wrap('["Only one"]'))).toEqual([]);
    expect(parseClarify(wrap('["Same", "same"]'))).toEqual([]);
  });

  it('caps at four options and trims whitespace', () => {
    const text = wrap('["  a ", "b", "c", "d", "e"]');
    expect(parseClarify(text)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ignores an unterminated (still-streaming) block', () => {
    const text = `Question?\n${MM_CLARIFY_OPEN}\n["A", "B"]`;
    expect(parseClarify(text)).toEqual([]);
  });

  it('drops non-string entries', () => {
    expect(parseClarify(wrap('["A", 5, null, "B"]'))).toEqual(['A', 'B']);
  });
});

describe('stripClarifyBlock', () => {
  it('removes a complete block and keeps the visible question', () => {
    const text = `Which vendor type?\n${wrap('["A", "B"]')}`;
    expect(stripClarifyBlock(text)).toBe('Which vendor type?');
  });

  it('removes a partial block during streaming', () => {
    const text = `Which vendor type?\n${MM_CLARIFY_OPEN}\n["A"`;
    expect(stripClarifyBlock(text)).toBe('Which vendor type?');
  });

  it('is a no-op when there is no block', () => {
    expect(stripClarifyBlock('Plain text')).toBe('Plain text');
  });

  it('preserves text that follows the block', () => {
    const text = `Before\n${wrap('["A", "B"]')}\nAfter`;
    expect(stripClarifyBlock(text)).toBe('Before\nAfter');
  });
});
