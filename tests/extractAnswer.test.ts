import { describe, expect, it } from 'vitest';
import { extractAnswerFromJson } from '../lib/stream/sse';

describe('extractAnswerFromJson', () => {
  it('extracts from openai-style choices[0].message.content', () => {
    expect(extractAnswerFromJson({ choices: [{ message: { content: 'hi' } }] })).toBe('hi');
  });

  it('extracts from openai-style choices[0].delta.content', () => {
    expect(extractAnswerFromJson({ choices: [{ delta: { content: 'streamed' } }] })).toBe('streamed');
  });

  it('falls back to answer field', () => {
    expect(extractAnswerFromJson({ answer: 'fallback' })).toBe('fallback');
  });

  it('returns empty string for unknown shapes', () => {
    expect(extractAnswerFromJson({ random: 1 })).toBe('');
    expect(extractAnswerFromJson(null)).toBe('');
    expect(extractAnswerFromJson(undefined)).toBe('');
  });
});
