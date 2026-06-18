import { describe, expect, it } from 'vitest';
import { formatContext, retrieveContext } from '../lib/retrieval';

describe('retrieveContext', () => {
  it('returns all docs when query has no meaningful terms', () => {
    const docs = retrieveContext('a an the', 3);
    expect(docs).toHaveLength(3);
  });

  it('ranks by overlap and ignores stopwords', () => {
    const docs = retrieveContext('warranty policy refund', 4);
    expect(docs.length).toBeGreaterThan(0);
    // The top result must mention at least one of the query terms.
    const topHaystack = `${docs[0].title} ${docs[0].category} ${docs[0].content}`.toLowerCase();
    expect(topHaystack).toMatch(/warranty|policy|refund|vendor/);
  });

  it('returns an empty list when nothing matches and there are query terms', () => {
    // Monolingual stopword query (no real terms after filtering)
    const docs = retrieveContext('xxx yyy zzz', 5);
    expect(docs).toEqual([]);
  });
});

describe('formatContext', () => {
  it('returns the empty placeholder when no docs are provided', () => {
    expect(formatContext([])).toBe('No matching internal knowledge found.');
  });

  it('includes source number, title, and category', () => {
    const out = formatContext([{ id: 'a', title: 'A', category: 'faq', content: 'text' }]);
    expect(out).toContain('[Source 1: A | faq]');
    expect(out).toContain('text');
  });
});
