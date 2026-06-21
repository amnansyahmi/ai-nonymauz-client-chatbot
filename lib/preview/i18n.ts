import type { AppLanguage } from '../../components/planner/types';

type PreviewStrings = {
  defaultTitle: string;
  taskCount: string;
  daysToGo: string;
  tasksOrganized: string;
  lockedSuffix: string;
  ctaLocked: string;
  ctaButton: string;
  draftingLines: string[];
  paywallTitle: string;
  paywallTitleSuffix: string;
  paywallSubtitle: string;
  paywallFeatures: string[];
  paywallBadge: string;
  paywallPeriod: string;
  paywallCta: string;
  paywallViewAll: string;
  paywallBack: string;
  paywallAriaLabel: string;
  closeAria: string;
};

const previewStrings: Record<AppLanguage, PreviewStrings> = {
  ms: {
    defaultTitle: 'Checklist Majlis Saya',
    taskCount: 'tugasan',
    daysToGo: 'hari lagi',
    tasksOrganized: 'tugasan disusun untuk anda',
    lockedSuffix: 'lagi terkunci',
    ctaLocked: 'Dapatkan penuh untuk lihat semua',
    ctaButton: 'Lihat Pakej Penuh',
    draftingLines: [
      'Menyiapkan senarai semak...',
      'Menyusun mengutamakan tugasan...',
      'Membina pelan majlis anda...',
      'Menyemak kategori tugasan...',
      'Hampir siap...'
    ],
    paywallTitle: 'Anda dah jana',
    paywallTitleSuffix: 'tugasan',
    paywallSubtitle: 'Dapatkan pakej penuh untuk lihat semua dan rancang majlis dengan lengkap.',
    paywallFeatures: [
      'Checklist lengkap sehingga hari majlis',
      'Bajet pintar & tracking vendor',
      'Voice mode dalam Bahasa Melayu',
      'Senarai tetamu & RSVP',
      'Widget embed untuk website'
    ],
    paywallBadge: 'Paling popular',
    paywallPeriod: '/ bulan',
    paywallCta: 'Langgan Sekarang',
    paywallViewAll: 'Lihat semua pelan',
    paywallBack: 'Kembali ke preview',
    paywallAriaLabel: 'Pakej langganan',
    closeAria: 'Tutup'
  },
  en: {
    defaultTitle: 'My Wedding Checklist',
    taskCount: 'tasks',
    daysToGo: 'days to go',
    tasksOrganized: 'tasks organized for you',
    lockedSuffix: 'more locked',
    ctaLocked: 'Unlock the full list to view all',
    ctaButton: 'View Full Plan',
    draftingLines: [
      'Preparing your checklist...',
      'Prioritising tasks...',
      'Building your wedding plan...',
      'Reviewing task categories...',
      'Almost ready...'
    ],
    paywallTitle: 'You generated',
    paywallTitleSuffix: 'tasks',
    paywallSubtitle: 'Get the full plan to view all tasks and plan your wedding completely.',
    paywallFeatures: [
      'Complete checklist up to wedding day',
      'Smart budget & vendor tracking',
      'Voice mode in English & Bahasa Melayu',
      'Guest list & RSVP',
      'Website embed widget'
    ],
    paywallBadge: 'Most popular',
    paywallPeriod: '/ month',
    paywallCta: 'Subscribe Now',
    paywallViewAll: 'View all plans',
    paywallBack: 'Back to preview',
    paywallAriaLabel: 'Subscription plans',
    closeAria: 'Close'
  }
};

export function getPreviewStrings(lang: AppLanguage): PreviewStrings {
  return previewStrings[lang] || previewStrings.ms;
}
