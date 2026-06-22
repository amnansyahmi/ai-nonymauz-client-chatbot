import { describe, expect, it } from 'vitest';
import { generateSuggestions, type SuggestionContext } from '../lib/ai/proactiveSuggestions';

// Single source of truth for a "blank" context. Individual tests override only
// the fields they care about, so adding a new SuggestionContext field never
// breaks every case again.
const baseContext: SuggestionContext = {
  daysToWedding: null,
  weddingDateSet: false,
  venueBooked: false,
  photographerBooked: false,
  cateringBooked: false,
  hasBudget: false,
  hasChecklist: false,
  guestCount: 0,
  pendingGuests: 0,
  hantaranItems: 0,
  transportBooked: false,
  invitationsSent: false,
  totalPlanned: 0,
  totalActual: 0,
  completedChecklistCount: 0,
  totalChecklistItems: 0
};

const ctx = (overrides: Partial<SuggestionContext> = {}): SuggestionContext => ({
  ...baseContext,
  ...overrides
});

describe('proactiveSuggestions', () => {
  it('suggests setting a date when wedding date is not set', () => {
    const suggestions = generateSuggestions(ctx());
    expect(suggestions.some((s) => s.key === 'set-wedding-date')).toBe(true);
  });

  it('suggests booking venue for weddings >365 days out', () => {
    const suggestions = generateSuggestions(
      ctx({ daysToWedding: 500, weddingDateSet: true, hasBudget: true, hasChecklist: true })
    );
    expect(suggestions.some((s) => s.key === 'book-venue')).toBe(true);
  });

  it('does NOT suggest venue when already booked', () => {
    const suggestions = generateSuggestions(
      ctx({ daysToWedding: 500, weddingDateSet: true, venueBooked: true, hasBudget: true, hasChecklist: true })
    );
    expect(suggestions.some((s) => s.key === 'book-venue')).toBe(false);
  });

  it('suggests photographer for weddings 6-12 months out', () => {
    const suggestions = generateSuggestions(
      ctx({ daysToWedding: 250, weddingDateSet: true, venueBooked: true, hasBudget: true, hasChecklist: true })
    );
    expect(suggestions.some((s) => s.key === 'book-photographer')).toBe(true);
  });

  it('suggests catering for weddings 3-6 months out', () => {
    const suggestions = generateSuggestions(
      ctx({
        daysToWedding: 130,
        weddingDateSet: true,
        venueBooked: true,
        photographerBooked: true,
        hasBudget: true,
        hasChecklist: true,
        guestCount: 200
      })
    );
    expect(suggestions.some((s) => s.key === 'book-catering')).toBe(true);
  });

  it('suggests invitations for weddings 1-3 months out', () => {
    const suggestions = generateSuggestions(
      ctx({
        daysToWedding: 60,
        weddingDateSet: true,
        venueBooked: true,
        photographerBooked: true,
        cateringBooked: true,
        hasBudget: true,
        hasChecklist: true,
        guestCount: 200,
        hantaranItems: 5
      })
    );
    expect(suggestions.some((s) => s.key === 'send-invitations')).toBe(true);
  });

  it('suggests RSVP follow-up when many pending guests', () => {
    const suggestions = generateSuggestions(
      ctx({
        daysToWedding: 45,
        weddingDateSet: true,
        venueBooked: true,
        photographerBooked: true,
        cateringBooked: true,
        hasBudget: true,
        hasChecklist: true,
        guestCount: 200,
        pendingGuests: 25,
        hantaranItems: 5,
        invitationsSent: true
      })
    );
    expect(suggestions.some((s) => s.key === 'plan-rsvp')).toBe(true);
  });

  it('suggests reviewing the budget when actual spend exceeds plan late in planning', () => {
    const suggestions = generateSuggestions(
      ctx({
        daysToWedding: 20,
        weddingDateSet: true,
        venueBooked: true,
        photographerBooked: true,
        cateringBooked: true,
        hasBudget: true,
        hasChecklist: true,
        transportBooked: true,
        hantaranItems: 5,
        totalPlanned: 10000,
        totalActual: 15000
      })
    );
    expect(suggestions.some((s) => s.key === 'update-budget')).toBe(true);
  });

  it('nudges to start a checklist that has tasks but no completions', () => {
    const suggestions = generateSuggestions(
      ctx({
        daysToWedding: 100,
        weddingDateSet: true,
        venueBooked: true,
        photographerBooked: true,
        cateringBooked: true,
        hasBudget: true,
        hasChecklist: true,
        hantaranItems: 5,
        totalChecklistItems: 20,
        completedChecklistCount: 0
      })
    );
    expect(suggestions.some((s) => s.key === 'create-checklist')).toBe(true);
  });

  it('caps results at the requested limit', () => {
    const suggestions = generateSuggestions(
      ctx({ daysToWedding: 60, weddingDateSet: true, guestCount: 200, pendingGuests: 25 }),
      2
    );
    expect(suggestions).toHaveLength(2);
  });

  it('sorts by priority', () => {
    const suggestions = generateSuggestions(ctx({ daysToWedding: 60, weddingDateSet: true }));
    for (let i = 0; i < suggestions.length - 1; i += 1) {
      expect(suggestions[i].priority).toBeLessThanOrEqual(suggestions[i + 1].priority);
    }
  });
});
