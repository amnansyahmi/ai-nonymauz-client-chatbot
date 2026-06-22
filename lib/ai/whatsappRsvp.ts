export type WhatsAppTemplateVars = {
  guestName: string;
  coupleNames: string;
  weddingDate: string;
  venue: string;
  language?: 'ms' | 'en';
};

const TEMPLATE_MS =
  'Hai {guestName}! 💕\n\nDengan hormat, kami {coupleNames} ingin menjemput anda ke majlis perkahwinan kami pada {weddingDate} di {venue}.\n\nSila reply mesej ini dengan HADIR atau TIDAK sebelum hujung bulan ini supaya kami boleh sediakan tempahan katering. Terima kasih banyak! 😊';

const TEMPLATE_EN =
  'Hi {guestName}! 💕\n\nWe, {coupleNames}, are pleased to invite you to our wedding on {weddingDate} at {venue}.\n\nPlease reply ATTENDING or NOT ATTENDING by end of this month so we can finalise our catering numbers. Thank you so much! 😊';

export function buildRsvpMessage(vars: WhatsAppTemplateVars): string {
  const language = vars.language ?? 'ms';
  const template = language === 'ms' ? TEMPLATE_MS : TEMPLATE_EN;
  return template
    .replace('{guestName}', vars.guestName || (language === 'ms' ? 'kawan' : 'friend'))
    .replace('{coupleNames}', vars.coupleNames || (language === 'ms' ? 'kami' : 'us'))
    .replace('{weddingDate}', vars.weddingDate || (language === 'ms' ? '[tarikh akan dimaklumkan]' : '[date to be confirmed]'))
    .replace('{venue}', vars.venue || (language === 'ms' ? '[tempat akan dimaklumkan]' : '[venue to be confirmed]'));
}

/**
 * Build a WhatsApp share URL pre-filled with an RSVP message. If a phone
 * number is provided, opens a chat with that specific contact.
 */
export function buildRsvpWhatsAppUrl(phone: string | undefined, message: string): string {
  const encoded = encodeURIComponent(message);
  if (phone && phone.trim().length > 0) {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    return `https://wa.me/${cleaned}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function normalisePhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  // Malaysian numbers: convert 01x-xxx-xxxx → 60xxxxxxxxx
  if (cleaned.startsWith('0')) {
    return `60${cleaned.slice(1)}`;
  }
  return cleaned;
}
