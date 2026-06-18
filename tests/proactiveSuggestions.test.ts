import { describe, expect, it } from 'vitest';
import { generateSuggestions } from '../lib/ai/proactiveSuggestions';

describe('proactiveSuggestions', () => {
  it('suggests setting a date when wedding date is not set', () => {
    const suggestions = generateSuggestions({
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
      invitationsSent: false
    });
    expect(suggestions.some((s) => s.key === 'set-wedding-date')).toBe(true);
  });

  it('suggests booking venue for weddings >365 days out', () => {
    const suggestions = generateSuggestions({
      daysToWedding: 500,
      weddingDateSet: true,
      venueBooked: false,
      photographerBooked: false,
      cateringBooked: false,
      hasBudget: true,
      hasChecklist: true,
      guestCount: 0,
      pendingGuests: 0,
      hantaranItems: 0,
      transportBooked: false,
      invitationsSent: false
    });
    expect(suggestions.some((s) => s.key === 'book-venue')).toBe(true);
  });

  it('does NOT suggest venue when already booked', () => {
    const suggestions = generateSuggestions({
      daysToWedding: 500,
      weddingDateSet: true,
      venueBooked: true,
      photographerBooked: false,
      cateringBooked: false,
      hasBudget: true,
      hasChecklist: true,
      guestCount: 0,
      pendingGuests: 0,
      hantaranItems: 0,
      transportBooked: false,
      invitationsSent: false
    });
    expect(suggestions.some((s) => s.key === 'book-venue')).toBe(false);
  });

  it('suggests photographer for weddings 6-12 months out', () => {
    const suggestions = generateSuggestions({
      daysToWedding: 250,
      weddingDateSet: true,
      venueBooked: true,
      photographerBooked: false,
      cateringBooked: false,
      hasBudget: true,
      hasChecklist: true,
      guestCount: 0,
      pendingGuests: 0,
      hantaranItems: 0,
      transportBooked: false,
      invitationsSent: false
    });
    expect(suggestions.some((s) => s.key === 'book-photographer')).toBe(true);
  });

  it('suggests catering for weddings 3-6 months out', () => {
    const suggestions = generateSuggestions({
      daysToWedding: 130,
      weddingDateSet: true,
      venueBooked: true,
      photographerBooked: true,
      cateringBooked: false,
      hasBudget: true,
      hasChecklist: true,
      guestCount: 200,
      pendingGuests: 0,
      hantaranItems: 0,
      transportBooked: false,
      invitationsSent: false
    });
    expect(suggestions.some((s) => s.key === 'book-catering')).toBe(true);
  });

  it('suggests invitations for weddings 1-3 months out', () => {
    const suggestions = generateSuggestions({
      daysToWedding: 60,
      weddingDateSet: true,
      venueBooked: true,
      photographerBooked: true,
      cateringBooked: true,
      hasBudget: true,
      hasChecklist: true,
      guestCount: 200,
      pendingGuests: 0,
      hantaranItems: 5,
      transportBooked: false,
      invitationsSent: false
    });
    expect(suggestions.some((s) => s.key === 'send-invitations')).toBe(true);
  });

  it('suggests RSVP follow-up when many pending guests', () => {
    const suggestions = generateSuggestions({
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
      transportBooked: false,
      invitationsSent: true
    });
    expect(suggestions.some((s) => s.key === 'plan-rsvp')).toBe(true);
  });

  it('caps results at the requested limit', () => {
    const suggestions = generateSuggestions(
      {
        daysToWedding: 60,
        weddingDateSet: true,
        venueBooked: false,
        photographerBooked: false,
        cateringBooked: false,
        hasBudget: false,
        hasChecklist: false,
        guestCount: 200,
        pendingGuests: 25,
        hantaranItems: 0,
        transportBooked: false,
        invitationsSent: false
      },
      2
    );
    expect(suggestions).toHaveLength(2);
  });

  it('sorts by priority', () => {
    const suggestions = generateSuggestions({
      daysToWedding: 60,
      weddingDateSet: true,
      venueBooked: false,
      photographerBooked: false,
      cateringBooked: false,
      hasBudget: false,
      hasChecklist: false,
      guestCount: 0,
      pendingGuests: 0,
      hantaranItems: 0,
      transportBooked: false,
      invitationsSent: false
    });
    for (let i = 0; i < suggestions.length - 1; i += 1) {
      expect(suggestions[i].priority).toBeLessThanOrEqual(suggestions[i + 1].priority);
    }
  });
});
