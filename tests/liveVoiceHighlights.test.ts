import { describe, expect, it } from 'vitest';
import { createStreamingTts, splitIntoSentences } from '../lib/voice/tts';

describe('sentence-by-sentence progress (for current-sentence highlight)', () => {
  it('emits a started event for every complete sentence in order', () => {
    const indices: number[] = [];
    const stream = createStreamingTts({
      voice: null,
      lang: 'en-US',
      onSentenceStart: (_text, index) => indices.push(index)
    });
    stream.push('First sentence. ');
    stream.push('Second sentence. ');
    stream.push('Third sentence.');
    stream.cancel();
    expect(indices).toEqual([0, 1, 2]);
  });

  it('the second started event has index 1 even when the first chunk contains no complete sentence', () => {
    const indices: number[] = [];
    const stream = createStreamingTts({
      voice: null,
      lang: 'en-US',
      onSentenceStart: (_text, index) => indices.push(index)
    });
    // First push has no terminal punctuation — should NOT emit
    stream.push('Partial buffer without a period yet');
    expect(indices).toEqual([]);
    // Second push completes the first sentence and starts a second one
    stream.push('. Now the second one is done.');
    expect(indices).toEqual([0, 1]);
    stream.cancel();
  });

  it('finalises the trailing buffer with a final index when finish() is called', () => {
    const indices: number[] = [];
    const completed = { called: false, text: '' };
    const stream = createStreamingTts({
      voice: null,
      lang: 'en-US',
      onSentenceStart: (_text, index) => indices.push(index),
      onComplete: (text) => {
        completed.called = true;
        completed.text = text;
      }
    });
    stream.push('Sentence one. ');
    stream.push('Sentence two. ');
    stream.push('No punctuation here');
    stream.finish();
    expect(indices).toEqual([0, 1, 2]);
    expect(completed.called).toBe(true);
  });

  it('splitIntoSentences agrees with the stream boundary detection', () => {
    const text = 'Quick brown fox. Lazy dog. End.';
    const sentences = splitIntoSentences(text);
    expect(sentences).toEqual(['Quick brown fox.', 'Lazy dog.', 'End.']);
  });
});
