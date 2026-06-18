/**
 * Rule-based proactive suggestion engine. No API calls — pure client-side
 * heuristics that look at the user's planner state and surface the most
 * actionable next step.
 */

export type SuggestionKey =
  | 'book-venue'
  | 'book-photographer'
  | 'book-catering'
  | 'send-invitations'
  | 'set-budget'
  | 'create-checklist'
  | 'set-wedding-date'
  | 'plan-rsvp'
  | 'gift-hantaran'
  | 'guest-count'
  | 'transport-day';

export type SuggestionContext = {
  daysToWedding: number | null;
  weddingDateSet: boolean;
  venueBooked: boolean;
  photographerBooked: boolean;
  cateringBooked: boolean;
  hasBudget: boolean;
  hasChecklist: boolean;
  guestCount: number;
  pendingGuests: number;
  hantaranItems: number;
  transportBooked: boolean;
  invitationsSent: boolean;
};

export type ProactiveSuggestion = {
  key: SuggestionKey;
  promptMs: string;
  promptEn: string;
  ctaLabelMs: string;
  ctaLabelEn: string;
  priority: number; // 1 = highest
};

const MIN_AWAY_DAYS = 0;

export function generateSuggestions(context: SuggestionContext, limit = 3): ProactiveSuggestion[] {
  const suggestions: ProactiveSuggestion[] = [];
  const d = context.daysToWedding;

  // Date-related urgency
  if (!context.weddingDateSet) {
    suggestions.push({
      key: 'set-wedding-date',
      promptMs: 'Nak rancang majlis dengan lebih tepat, saya perlu tahu tarikh majlis kamu. Bila majlis kamu dijangka?',
      promptEn: 'To plan more accurately, I need your wedding date. When is the wedding?',
      ctaLabelMs: 'Set tarikh',
      ctaLabelEn: 'Set date',
      priority: 1
    });
  }

  if (d !== null && d > MIN_AWAY_DAYS) {
    if (d > 365 && !context.venueBooked) {
      suggestions.push({
        key: 'book-venue',
        promptMs: `Majlis kamu ${d} hari lagi. Antara langkah pertama yang penting ialah tempah dewan. Nak saya cadangkan venue ikut bajet?`,
        promptEn: `Your wedding is in ${d} days. One of the first things to book is the venue. Want venue suggestions within your budget?`,
        ctaLabelMs: 'Cari venue',
        ctaLabelEn: 'Find venues',
        priority: 2
      });
    }

    if (d > 180 && d <= 365 && !context.photographerBooked) {
      suggestions.push({
        key: 'book-photographer',
        promptMs: `Jurugambar perlu ditempah awal — tarikh popular cepat habis. Saya boleh cadang 3 jurugambar popular di kawasan kamu.`,
        promptEn: `Photographers should be booked early — popular dates fill up. I can suggest 3 photographers in your area.`,
        ctaLabelMs: 'Cari jurugambar',
        ctaLabelEn: 'Find photographers',
        priority: 3
      });
    }

    if (d > 90 && d <= 180 && !context.cateringBooked) {
      suggestions.push({
        key: 'book-catering',
        promptMs: `Untuk majlis dalam ${d} hari, masa terbaik tempah katering sekarang. Saya ada senarai katering dengan harga dan rating.`,
        promptEn: `With ${d} days to go, now is a great time to book catering. I have a list with prices and ratings.`,
        ctaLabelMs: 'Cari katering',
        ctaLabelEn: 'Find caterers',
        priority: 3
      });
    }

    if (d > 30 && d <= 90 && !context.invitationsSent && context.guestCount > 0) {
      suggestions.push({
        key: 'send-invitations',
        promptMs: `Kira-kira ${d} hari je lagi. Jemputan perlu dihantar sekarang supaya tetamu boleh atur jadual. Saya boleh buatkan template WhatsApp untuk semua tetamu kamu.`,
        promptEn: `About ${d} days to go. Invitations should go out now so guests can plan. I can draft WhatsApp templates for all your guests.`,
        ctaLabelMs: 'Hantar jemputan',
        ctaLabelEn: 'Send invitations',
        priority: 2
      });
    }

    if (d > 14 && d <= 60 && context.pendingGuests > 5) {
      suggestions.push({
        key: 'plan-rsvp',
        promptMs: `${context.pendingGuests} tetamu masih belum reply RSVP. Saya boleh follow up dengan WhatsApp reminder. Nak saya hantar?`,
        promptEn: `${context.pendingGuests} guests haven't replied yet. I can send WhatsApp reminders. Want me to?`,
        ctaLabelMs: 'Follow up',
        ctaLabelEn: 'Follow up',
        priority: 3
      });
    }

    if (d > 7 && d <= 21 && !context.transportBooked) {
      suggestions.push({
        key: 'transport-day',
        promptMs: `Transport hari majlis sangat penting. Saya boleh cadangkan pengangkutan untuk pengantin dan keluarga.`,
        promptEn: `Day-of transport matters a lot. I can suggest transport for the couple and family.`,
        ctaLabelMs: 'Cari transport',
        ctaLabelEn: 'Find transport',
        priority: 4
      });
    }

    if (d > 30 && context.hantaranItems === 0) {
      suggestions.push({
        key: 'gift-hantaran',
        promptMs: `Hantaran majlis kamu belum ada senarai. Saya boleh cadangkan ${context.guestCount > 100 ? '10-15' : '7-10'} item hantaran popular ikut bajet.`,
        promptEn: `Your gift hantaran list is empty. I can suggest ${context.guestCount > 100 ? '10-15' : '7-10'} popular hantaran items within budget.`,
        ctaLabelMs: 'Bina hantaran',
        ctaLabelEn: 'Build hantaran',
        priority: 4
      });
    }
  }

  if (!context.hasBudget && context.weddingDateSet) {
    suggestions.push({
      key: 'set-budget',
      promptMs: 'Bajet yang jelas bantu saya cadang vendor ikut kemampuan kamu. Nak set bajet sekarang?',
      promptEn: 'A clear budget helps me suggest vendors you can afford. Want to set a budget now?',
      ctaLabelMs: 'Set bajet',
      ctaLabelEn: 'Set budget',
      priority: 2
    });
  }

  if (!context.hasChecklist && context.weddingDateSet) {
    suggestions.push({
      key: 'create-checklist',
      promptMs: 'Saya boleh buatkan senarai tugasan lengkap untuk majlis kamu — dari tempahan sampai hari majlis.',
      promptEn: 'I can build a full task list for your wedding — from booking to the big day.',
      ctaLabelMs: 'Buat checklist',
      ctaLabelEn: 'Make checklist',
      priority: 3
    });
  }

  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}
