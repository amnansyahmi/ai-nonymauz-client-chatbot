import { describe, expect, it } from 'vitest';
import { parseSseEvents, encodeSseEvent, encodeSseError } from '../lib/stream/sse';

describe('parseSseEvents', () => {
  it('returns an empty result for empty input', () => {
    const { events, remaining } = parseSseEvents('');
    expect(events).toEqual([]);
    expect(remaining).toBe('');
  });

  it('parses a single complete event', () => {
    const buffer = encodeSseEvent({ type: 'delta', text: 'hello' });
    const { events, remaining } = parseSseEvents(buffer);
    expect(remaining).toBe('');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'delta', text: 'hello' });
  });

  it('parses multiple events in one chunk', () => {
    const buffer = [
      encodeSseEvent({ type: 'sources', sources: [{ id: 'a', title: 'A', category: 'doc' }] }),
      encodeSseEvent({ type: 'delta', text: 'hi' }),
      encodeSseEvent({ type: 'done' })
    ].join('');
    const { events, remaining } = parseSseEvents(buffer);
    expect(remaining).toBe('');
    expect(events.map((e) => e.type)).toEqual(['sources', 'delta', 'done']);
  });

  it('keeps an incomplete event in the remaining buffer', () => {
    const buffer = encodeSseEvent({ type: 'delta', text: 'partial' });
    const partial = buffer.slice(0, buffer.length - 5);
    const { events, remaining } = parseSseEvents(partial);
    expect(events).toEqual([]);
    expect(remaining).toBe(partial);
  });

  it('skips [DONE] sentinels', () => {
    const buffer = `data: [DONE]\n\ndata: ${JSON.stringify({ type: 'delta', text: 'late' })}\n\n`;
    const { events, remaining } = parseSseEvents(buffer);
    expect(remaining).toBe('');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'delta', text: 'late' });
  });

  it('falls back to delta text for non-JSON payloads', () => {
    const buffer = 'data: not json payload\n\n';
    const { events } = parseSseEvents(buffer);
    expect(events).toEqual([{ type: 'delta', text: 'not json payload' }]);
  });

  it('normalizes openai-style streaming chunks into delta events', () => {
    const buffer = 'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n';
    const { events } = parseSseEvents(buffer);
    expect(events).toEqual([{ type: 'delta', text: 'hello' }]);
  });

  it('combines multi-line data into one event', () => {
    const buffer = `data: ${JSON.stringify({ type: 'delta', text: 'first' })}\ndata: ${JSON.stringify({ type: 'delta', text: 'second' })}\n\n`;
    const { events } = parseSseEvents(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('delta');
  });
});

describe('SSE encoders', () => {
  it('encodes a delta event with a trailing double newline', () => {
    expect(encodeSseEvent({ type: 'delta', text: 'x' })).toBe('data: {"type":"delta","text":"x"}\n\n');
  });

  it('encodes an error envelope', () => {
    expect(encodeSseError('boom')).toBe('data: {"type":"error","error":"boom"}\n\n');
  });
});
