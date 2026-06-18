import { describe, expect, it, vi } from 'vitest';
import { createStreamingTts, splitIntoSentences } from '../lib/voice/tts';

describe('splitIntoSentences', () => {
  it('returns an empty array for empty input', () => {
    expect(splitIntoSentences('')).toEqual([]);
  });

  it('returns a single segment when no punctuation is present', () => {
    expect(splitIntoSentences('Hello world')).toEqual(['Hello world']);
  });

  it('splits at period, exclamation, and question marks', () => {
    expect(splitIntoSentences('First sentence. Second! Third? Done.')).toEqual([
      'First sentence.',
      'Second!',
      'Third?',
      'Done.'
    ]);
  });

  it('collapses whitespace within sentences', () => {
    expect(splitIntoSentences('  Hello    world.  Bye.  ')).toEqual(['Hello world.', 'Bye.']);
  });

  it('treats newlines as whitespace within a sentence', () => {
    expect(splitIntoSentences('Line one\nLine two\nLine three.')).toEqual(['Line one Line two Line three.']);
  });
});

describe('createStreamingTts', () => {
  it('buffers text and emits complete sentences as deltas arrive', () => {
    const started: Array<{ text: string; index: number }> = [];
    const ended: Array<{ text: string; index: number }> = [];
    const completed = vi.fn();

    const stream = createStreamingTts({
      voice: null,
      lang: 'en-US',
      onSentenceStart: (text, index) => started.push({ text, index }),
      onSentenceEnd: (text, index) => ended.push({ text, index }),
      onComplete: completed
    });

    stream.push('Hello ');
    stream.push('world. ');
    stream.push('How are ');
    stream.push('you? ');
    stream.push('Fine');

    expect(started).toEqual([
      { text: 'Hello world.', index: 0 },
      { text: 'How are you?', index: 1 }
    ]);
    expect(ended).toEqual([
      { text: 'Hello world.', index: 0 },
      { text: 'How are you?', index: 1 }
    ]);
    expect(completed).not.toHaveBeenCalled();

    stream.cancel();
  });

  it('flushes the trailing buffer on finish()', () => {
    const started: string[] = [];
    const completed = vi.fn();

    const stream = createStreamingTts({
      voice: null,
      lang: 'en-US',
      onSentenceStart: (text) => started.push(text),
      onComplete: completed
    });

    stream.push('First sentence. ');
    stream.push('Trailing sentence without punctuation');
    stream.finish();

    expect(started).toEqual(['First sentence.', 'Trailing sentence without punctuation']);
  });

  it('handles a single chunk containing multiple sentences', () => {
    const started: string[] = [];
    const stream = createStreamingTts({
      voice: null,
      lang: 'en-US',
      onSentenceStart: (text) => started.push(text)
    });

    stream.push('One. Two. Three.');
    expect(started).toEqual(['One.', 'Two.', 'Three.']);
    stream.cancel();
  });

  it('cancels cleanly without throwing', () => {
    const stream = createStreamingTts({
      voice: null,
      lang: 'en-US'
    });
    stream.push('Hello. ');
    stream.cancel();
    stream.cancel();
    expect(stream.isStreaming()).toBe(false);
  });
});
