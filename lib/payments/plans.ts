/**
 * MajlisMate subscription plans. All prices are in Malaysian Ringgit (RM).
 * Kept short and friendly so non-IT users can scan them quickly.
 */

export type PlanId = 'percuma' | 'sehari-hari' | 'bisnes';

export type PlanInterval = 'bulanan' | 'tahunan';

export type PlanFeature = {
  ms: string;
  en: string;
  included: boolean;
};

export type Plan = {
  id: PlanId;
  nameMs: string;
  nameEn: string;
  taglineMs: string;
  taglineEn: string;
  priceMonthly: number;
  priceYearly: number;
  currency: 'MYR';
  highlighted: boolean;
  ctaMs: string;
  ctaEn: string;
  features: PlanFeature[];
};

export const PLANS: ReadonlyArray<Plan> = [
  {
    id: 'percuma',
    nameMs: 'Percuma',
    nameEn: 'Free',
    taglineMs: 'Cuba dulu, tak perlu bayar',
    taglineEn: 'Try it out, no credit card',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'MYR',
    highlighted: false,
    ctaMs: 'Mula sekarang',
    ctaEn: 'Start free',
    features: [
      { ms: 'Chat assistant', en: 'Chat assistant', included: true },
      { ms: 'Senarai semak asas', en: 'Basic checklist', included: true },
      { ms: 'Hingga 50 tetamu', en: 'Up to 50 guests', included: true },
      { ms: 'Voice mode (BM)', en: 'Voice mode (BM)', included: true },
      { ms: 'Widget embed', en: 'Embed on your website', included: false },
      { ms: 'Laporan & analitik', en: 'Reports & analytics', included: false }
    ]
  },
  {
    id: 'sehari-hari',
    nameMs: 'Sehari-hari',
    nameEn: 'Everyday',
    taglineMs: 'Untuk bakal pengantin',
    taglineEn: 'For soon-to-wed couples',
    priceMonthly: 49,
    priceYearly: 490,
    currency: 'MYR',
    highlighted: true,
    ctaMs: 'Langgan sekarang',
    ctaEn: 'Subscribe now',
    features: [
      { ms: 'Semua dalam Percuma', en: 'Everything in Free', included: true },
      { ms: 'Tetamu tanpa had', en: 'Unlimited guests', included: true },
      { ms: 'Vendor shortlist + WhatsApp', en: 'Vendor shortlist + WhatsApp', included: true },
      { ms: 'Bajet & laporan', en: 'Budget & reports', included: true },
      { ms: 'Countdown majlis', en: 'Wedding countdown', included: true },
      { ms: 'Widget embed (1 website)', en: 'Embed on 1 website', included: true },
      { ms: 'Sokongan WhatsApp', en: 'WhatsApp support', included: false }
    ]
  },
  {
    id: 'bisnes',
    nameMs: 'Bisnes',
    nameEn: 'Business',
    taglineMs: 'Untuk wedding planner & vendor',
    taglineEn: 'For planners & vendors',
    priceMonthly: 199,
    priceYearly: 1990,
    currency: 'MYR',
    highlighted: false,
    ctaMs: 'Hubungi kami',
    ctaEn: 'Contact us',
    features: [
      { ms: 'Semua dalam Sehari-hari', en: 'Everything in Everyday', included: true },
      { ms: 'Sehingga 50 majlis / bulan', en: 'Up to 50 weddings / month', included: true },
      { ms: 'Custom branding + warna', en: 'Custom branding & colors', included: true },
      { ms: 'Multi-pengguna (5 ahli)', en: 'Multi-user (5 seats)', included: true },
      { ms: 'Widget embed tanpa had', en: 'Unlimited website embed', included: true },
      { ms: 'Sokongan WhatsApp prioriti', en: 'Priority WhatsApp support', included: true },
      { ms: 'Latihan onboarding', en: 'Onboarding training', included: true }
    ]
  }
];

export function findPlan(id: string | null | undefined): Plan | undefined {
  if (!id) return undefined;
  return PLANS.find((plan) => plan.id === id);
}

export function priceForInterval(plan: Plan, interval: PlanInterval): number {
  return interval === 'tahunan' ? plan.priceYearly : plan.priceMonthly;
}

export function formatRinggit(amount: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
