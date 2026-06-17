import type { AppLanguage, PlannerProfile, Vendor } from '../../components/planner/types';

export type VendorMessageIntent = 'enquiry' | 'negotiate' | 'follow_up' | 'booking';

export const VENDOR_MESSAGE_INTENTS: VendorMessageIntent[] = ['enquiry', 'negotiate', 'follow_up', 'booking'];

export function intentLabel(intent: VendorMessageIntent, language: AppLanguage): string {
  const isMs = language === 'ms';
  switch (intent) {
    case 'enquiry':
      return isMs ? 'Pertanyaan' : 'Enquiry';
    case 'negotiate':
      return isMs ? 'Runding harga' : 'Negotiate';
    case 'follow_up':
      return isMs ? 'Susulan' : 'Follow up';
    case 'booking':
      return isMs ? 'Tempahan' : 'Booking';
  }
}

function coupleLabel(profile: PlannerProfile): string {
  return (
    profile.coupleName?.trim() ||
    [profile.groomName, profile.brideName].filter(Boolean).join(' & ') ||
    ''
  );
}

function dateLabel(dateKey: string, language: AppLanguage): string {
  if (!dateKey) return '';
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/** Build a ready-to-send vendor message. Malay is primary; English is secondary. */
export function buildVendorMessage(
  vendor: Vendor,
  profile: PlannerProfile,
  intent: VendorMessageIntent,
  language: AppLanguage
): string {
  const isMs = language === 'ms';
  const couple = coupleLabel(profile);
  const date = dateLabel(profile.majlisDate, language);
  const negeri = profile.negeri?.trim();
  const guests = profile.guestTarget;

  const signOff = isMs
    ? couple
      ? `\n\nTerima kasih.\n${couple}`
      : '\n\nTerima kasih.'
    : couple
      ? `\n\nThank you.\n${couple}`
      : '\n\nThank you.';

  if (isMs) {
    const greet = `Salam ${vendor.name}, 😊`;
    const ctx = [
      date ? `majlis kami pada ${date}` : 'majlis kami',
      negeri ? `di ${negeri}` : '',
      guests ? `dengan anggaran ${guests} tetamu` : ''
    ]
      .filter(Boolean)
      .join(' ');

    switch (intent) {
      case 'enquiry':
        return `${greet}\n\nSaya nak bertanya tentang servis ${vendor.category} untuk ${ctx}. Boleh saya tahu:\n• Adakah tarikh tersebut masih available?\n• Apa pakej yang ditawarkan dan harganya?\n• Apa yang termasuk dalam pakej?\n• Berapa deposit dan terma pembayaran?${signOff}`;
      case 'negotiate':
        return `${greet}\n\nTerima kasih atas maklumat pakej untuk ${vendor.category}. Kami sangat berminat. Cuma bajet kami agak terhad — adakah ada ruang untuk pakej yang lebih sesuai dengan bajet kami, atau apa-apa promosi yang sedang berjalan?${signOff}`;
      case 'follow_up':
        return `${greet}\n\nSaya nak follow up tentang pertanyaan saya untuk servis ${vendor.category}${date ? ` pada ${date}` : ''}. Boleh sahkan availability dan pakej terkini? Kami ingin buat keputusan tidak lama lagi.${signOff}`;
      case 'booking':
        return `${greet}\n\nKami dah buat keputusan untuk tempah servis ${vendor.category} anda untuk ${ctx}. Boleh maklumkan:\n• Jumlah deposit untuk lock tarikh\n• Cara pembayaran\n• Dokumen/maklumat yang anda perlukan dari kami${signOff}`;
    }
  }

  const greet = `Hi ${vendor.name}, 😊`;
  const ctx = [
    date ? `our wedding on ${date}` : 'our wedding',
    negeri ? `in ${negeri}` : '',
    guests ? `with around ${guests} guests` : ''
  ]
    .filter(Boolean)
    .join(' ');

  switch (intent) {
    case 'enquiry':
      return `${greet}\n\nI'd like to enquire about your ${vendor.category} services for ${ctx}. Could you let me know:\n• Is the date still available?\n• What packages do you offer and the pricing?\n• What's included in each package?\n• Deposit amount and payment terms?${signOff}`;
    case 'negotiate':
      return `${greet}\n\nThank you for the package details for ${vendor.category}. We're very interested. Our budget is a little tight though — is there any room for a package that fits our budget better, or any ongoing promotions?${signOff}`;
    case 'follow_up':
      return `${greet}\n\nJust following up on my enquiry about your ${vendor.category} services${date ? ` for ${date}` : ''}. Could you confirm availability and the latest packages? We'd like to decide soon.${signOff}`;
    case 'booking':
      return `${greet}\n\nWe'd like to go ahead and book your ${vendor.category} services for ${ctx}. Could you advise:\n• Deposit needed to lock the date\n• Payment method\n• Any documents/details you need from us${signOff}`;
  }
}

/** Sanitize a contact string into a wa.me-compatible phone (Malaysia default). */
export function toWhatsAppNumber(contact: string | undefined): string | null {
  if (!contact) return null;
  let digits = contact.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) digits = `6${digits}`; // 01x... -> 601x...
  else if (!digits.startsWith('60') && digits.length <= 10) digits = `60${digits}`;
  return digits;
}

export function whatsappLink(contact: string | undefined, message: string): string {
  const number = toWhatsAppNumber(contact);
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}
