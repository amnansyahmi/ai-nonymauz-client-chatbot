/**
 * Rule-based proactive suggestion engine with time-weighting and dismissal tracking.
 * No API calls — pure client-side heuristics that look at the user's planner state
 * and surface the most actionable next step.
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
  | 'transport-day'
  | 'update-budget'
  | 'confirm-vendors'
  | 'food-tasting'
  | 'final-fitting'
  | 'seating-plan'
  | 'emergency-kit';

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
  totalPlanned: number;
  totalActual: number;
  completedChecklistCount: number;
  totalChecklistItems: number;
};

export type ProactiveSuggestion = {
  key: SuggestionKey;
  promptMs: string;
  promptEn: string;
  ctaLabelMs: string;
  ctaLabelEn: string;
  priority: number; // 1 = highest (lower number = more urgent)
};

const DISMISSED_KEY = 'mm-dismissed-suggestions';
const DISMISSED_EXPIRY_DAYS = 14;

function getDismissedSuggestions(): Map<string, number> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const expiryMs = DISMISSED_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const map = new Map<string, number>();
    for (const [key, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && now - ts < expiryMs) {
        map.set(key, ts);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

export function dismissSuggestion(key: SuggestionKey): void {
  if (typeof window === 'undefined') return;
  try {
    const map = getDismissedSuggestions();
    map.set(key, Date.now());
    const obj: Record<string, number> = {};
    map.forEach((v, k) => { obj[k] = v; });
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(obj));
  } catch {
    // ignore
  }
}

function computeTimeWeight(daysToWedding: number | null): number {
  if (daysToWedding === null) return 1;
  if (daysToWedding <= 7) return 3;
  if (daysToWedding <= 14) return 2.5;
  if (daysToWedding <= 30) return 2;
  if (daysToWedding <= 60) return 1.5;
  if (daysToWedding <= 90) return 1.2;
  return 1;
}

export function generateSuggestions(context: SuggestionContext, limit = 3): ProactiveSuggestion[] {
  const dismissed = getDismissedSuggestions();
  const suggestions: ProactiveSuggestion[] = [];
  const d = context.daysToWedding;
  const timeWeight = computeTimeWeight(d);

  function addIfNotDismissed(s: ProactiveSuggestion) {
    if (!dismissed.has(s.key)) {
      suggestions.push(s);
    }
  }

  // Date-related urgency
  if (!context.weddingDateSet) {
    addIfNotDismissed({
      key: 'set-wedding-date',
      promptMs: 'Nak rancang majlis dengan lebih tepat, saya perlu tahu tarikh majlis kamu. Bila majlis kamu dijangka?',
      promptEn: 'To plan more accurately, I need your wedding date. When is the wedding?',
      ctaLabelMs: 'Set tarikh',
      ctaLabelEn: 'Set date',
      priority: 1
    });
  }

  if (d !== null && d > 0) {
    if (d > 365 && !context.venueBooked) {
      addIfNotDismissed({
        key: 'book-venue',
        promptMs: `Majlis kamu ${d} hari lagi. Antara langkah pertama yang penting ialah tempah dewan. Nak saya cadangkan venue ikut bajet?`,
        promptEn: `Your wedding is in ${d} days. One of the first things to book is the venue. Want venue suggestions within your budget?`,
        ctaLabelMs: 'Cari venue',
        ctaLabelEn: 'Find venues',
        priority: Math.round(2 / timeWeight)
      });
    }

    if (d > 180 && d <= 365 && !context.photographerBooked) {
      addIfNotDismissed({
        key: 'book-photographer',
        promptMs: `Jurugambar perlu ditempah awal — tarikh popular cepat habis. Saya boleh cadang 3 jurugambar popular di kawasan kamu.`,
        promptEn: `Photographers should be booked early — popular dates fill up. I can suggest 3 photographers in your area.`,
        ctaLabelMs: 'Cari jurugambar',
        ctaLabelEn: 'Find photographers',
        priority: Math.round(3 / timeWeight)
      });
    }

    if (d > 90 && d <= 180 && !context.cateringBooked) {
      addIfNotDismissed({
        key: 'book-catering',
        promptMs: `Untuk majlis dalam ${d} hari, masa terbaik tempah katering sekarang. Saya ada senarai katering dengan harga dan rating.`,
        promptEn: `With ${d} days to go, now is a great time to book catering. I have a list with prices and ratings.`,
        ctaLabelMs: 'Cari katering',
        ctaLabelEn: 'Find caterers',
        priority: Math.round(3 / timeWeight)
      });
    }

    if (d > 30 && d <= 90 && !context.invitationsSent && context.guestCount > 0) {
      addIfNotDismissed({
        key: 'send-invitations',
        promptMs: `Kira-kira ${d} hari je lagi. Jemputan perlu dihantar sekarang supaya tetamu boleh atur jadual. Saya boleh buatkan template WhatsApp untuk semua tetamu kamu.`,
        promptEn: `About ${d} days to go. Invitations should go out now so guests can plan. I can draft WhatsApp templates for all your guests.`,
        ctaLabelMs: 'Hantar jemputan',
        ctaLabelEn: 'Send invitations',
        priority: Math.round(2 / timeWeight)
      });
    }

    if (d > 14 && d <= 60 && context.pendingGuests > 5) {
      addIfNotDismissed({
        key: 'plan-rsvp',
        promptMs: `${context.pendingGuests} tetamu masih belum reply RSVP. Saya boleh follow up dengan WhatsApp reminder. Nak saya hantar?`,
        promptEn: `${context.pendingGuests} guests haven't replied yet. I can send WhatsApp reminders. Want me to?`,
        ctaLabelMs: 'Follow up',
        ctaLabelEn: 'Follow up',
        priority: Math.round(3 / timeWeight)
      });
    }

    if (d > 7 && d <= 21 && !context.transportBooked) {
      addIfNotDismissed({
        key: 'transport-day',
        promptMs: `Transport hari majlis sangat penting. Saya boleh cadangkan pengangkutan untuk pengantin dan keluarga.`,
        promptEn: `Day-of transport matters a lot. I can suggest transport for the couple and family.`,
        ctaLabelMs: 'Cari transport',
        ctaLabelEn: 'Find transport',
        priority: Math.round(4 / timeWeight)
      });
    }

    if (d > 30 && context.hantaranItems === 0) {
      addIfNotDismissed({
        key: 'gift-hantaran',
        promptMs: `Hantaran majlis kamu belum ada senarai. Saya boleh cadangkan ${context.guestCount > 100 ? '10-15' : '7-10'} item hantaran popular ikut bajet.`,
        promptEn: `Your gift hantaran list is empty. I can suggest ${context.guestCount > 100 ? '10-15' : '7-10'} popular hantaran items within budget.`,
        ctaLabelMs: 'Bina hantaran',
        ctaLabelEn: 'Build hantaran',
        priority: Math.round(4 / timeWeight)
      });
    }

    if (d <= 60 && d > 14 && context.guestCount > 0 && context.pendingGuests === 0) {
      addIfNotDismissed({
        key: 'seating-plan',
        promptMs: `Dengan ${context.guestCount} tetamu yang dah confirm, sekarang masa yang sesuai untuk susun atur meja dan seating plan.`,
        promptEn: `With ${context.guestCount} confirmed guests, now is a good time to arrange your seating plan.`,
        ctaLabelMs: 'Susun seating',
        ctaLabelEn: 'Plan seating',
        priority: Math.round(4 / timeWeight)
      });
    }

    if (d <= 14 && d > 0) {
      addIfNotDismissed({
        key: 'emergency-kit',
        promptMs: `Hari majlis hampir tiba! Jangan lupa sediakan emergency kit — ubat, jarum benang, powerbank, dan keperluan asas.`,
        promptEn: `The big day is almost here! Don't forget to prepare an emergency kit — medicine, needle & thread, powerbank, and essentials.`,
        ctaLabelMs: 'Sediakan kit',
        ctaLabelEn: 'Prepare kit',
        priority: Math.round(2 / timeWeight)
      });
    }

    if (d <= 30 && d > 7 && context.totalActual > 0 && context.totalPlanned > 0 && context.totalActual > context.totalPlanned * 1.1) {
      addIfNotDismissed({
        key: 'update-budget',
        promptMs: `Perbelanjaan sebenar anda (RM${context.totalActual.toLocaleString()}) telah melebihi bajet asal (RM${context.totalPlanned.toLocaleString()}). Semak dan kemas kini bajet anda.`,
        promptEn: `Your actual spending (RM${context.totalActual.toLocaleString()}) has exceeded your planned budget (RM${context.totalPlanned.toLocaleString()}). Review and update your budget.`,
        ctaLabelMs: 'Semak bajet',
        ctaLabelEn: 'Review budget',
        priority: Math.round(3 / timeWeight)
      });
    }
  }

  if (!context.hasBudget && context.weddingDateSet) {
    addIfNotDismissed({
      key: 'set-budget',
      promptMs: 'Bajet yang jelas bantu saya cadang vendor ikut kemampuan kamu. Nak set bajet sekarang?',
      promptEn: 'A clear budget helps me suggest vendors you can afford. Want to set a budget now?',
      ctaLabelMs: 'Set bajet',
      ctaLabelEn: 'Set budget',
      priority: 2
    });
  }

  if (!context.hasChecklist && context.weddingDateSet) {
    addIfNotDismissed({
      key: 'create-checklist',
      promptMs: 'Saya boleh buatkan senarai tugasan lengkap untuk majlis kamu — dari tempahan sampai hari majlis.',
      promptEn: 'I can build a full task list for your wedding — from booking to the big day.',
      ctaLabelMs: 'Buat checklist',
      ctaLabelEn: 'Make checklist',
      priority: 3
    });
  }

  if (context.hasChecklist && context.totalChecklistItems > 0 && context.completedChecklistCount === 0 && d !== null && d > 0) {
    addIfNotDismissed({
      key: 'create-checklist',
      promptMs: `Anda mempunyai ${context.totalChecklistItems} tugasan dalam checklist tetapi belum ada yang selesai. Mulakan dengan tugasan paling mendesak.`,
      promptEn: `You have ${context.totalChecklistItems} tasks in your checklist but none completed yet. Start with the most urgent tasks.`,
      ctaLabelMs: 'Mula sekarang',
      ctaLabelEn: 'Start now',
      priority: 3
    });
  }

  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}
