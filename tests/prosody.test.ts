import { describe, expect, it } from 'vitest';
import { humanize, isQuestionSentence, sentenceProsody } from '../lib/voice/prosody';

describe('humanize (English)', () => {
  it('expands common contractions', () => {
    expect(humanize('I am going to the store', 'en')).toBe("I'm going to the store");
    expect(humanize('It is a good day', 'en')).toBe("It's a good day");
    expect(humanize('I will not be there', 'en')).toBe("I won't be there");
    expect(humanize('do not forget', 'en')).toBe("don't forget");
  });
  it('does not change text that is already casual', () => {
    expect(humanize("I'm going", 'en')).toBe("I'm going");
    expect(humanize("don't worry", 'en')).toBe("don't worry");
  });
  it('inserts a breath comma before "and" in long phrases only', () => {
    const longBefore = 'I am planning the entire wedding from start to finish and it is taking forever';
    expect(humanize(longBefore, 'en')).toBe("I'm planning the entire wedding from start to finish, and it is taking forever");
    expect(humanize('Python and JavaScript', 'en')).toBe('Python and JavaScript');
  });
  it('returns the input unchanged for empty strings', () => {
    expect(humanize('', 'en')).toBe('');
  });
});

describe('humanize (Malay)', () => {
  it('normalizes whitespace but does not change words', () => {
    expect(humanize('Saya nak pergi kedai', 'ms')).toBe('Saya nak pergi kedai');
    expect(humanize('  Saya   nak   pergi  ', 'ms')).toBe('Saya nak pergi');
  });
});

describe('isQuestionSentence', () => {
  it('detects trailing question mark', () => {
    expect(isQuestionSentence('Are you sure?')).toBe(true);
    expect(isQuestionSentence('Are you sure? ')).toBe(true);
    expect(isQuestionSentence('That is nice.')).toBe(false);
  });
});

describe('sentenceProsody', () => {
  it('gives the first sentence a slight emphasis bump', () => {
    const p = sentenceProsody(0, false, 1.0, 1.0);
    expect(p.rate).toBeGreaterThan(1.0);
    expect(p.pitch).toBeGreaterThan(1.0);
  });
  it('lifts pitch on questions', () => {
    const nonQ = sentenceProsody(3, false, 1.0, 1.0);
    const q = sentenceProsody(3, true, 1.0, 1.0);
    expect(q.pitch).toBeGreaterThan(nonQ.pitch);
  });
  it('respects the base rate/pitch and adds jitter around them', () => {
    const p = sentenceProsody(5, false, 0.95, 1.05);
    // Within jitter range of the base
    expect(p.rate).toBeGreaterThan(0.91);
    expect(p.rate).toBeLessThan(0.99);
    expect(p.pitch).toBeGreaterThan(1.01);
    expect(p.pitch).toBeLessThan(1.09);
  });
  it('clamps to the Web Speech API range', () => {
    const p = sentenceProsody(0, true, 100, 100);
    expect(p.rate).toBeLessThanOrEqual(2);
    expect(p.pitch).toBeLessThanOrEqual(2);
  });
});
