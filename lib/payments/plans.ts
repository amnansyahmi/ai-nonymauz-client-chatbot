/**
 * MajlisMate subscription plans. All prices are in Malaysian Ringgit (RM).
 * Kept short and friendly so non-IT users can scan them quickly.
 */

export type PlanId = 'sehari-hari';

export type PlanInterval = 'bulanan' | 'tahunan';

export type PlanFeature = {
  ms: string;
  en: string;
};

export type Plan = {
  id: PlanId;
  nameMs: string;
  nameEn: string;
  taglineMs: string;
  taglineEn: string;
  priceMonthly: number;
  currency: 'MYR';
  ctaMs: string;
  ctaEn: string;
  features: PlanFeature[];
};

export const PLANS: ReadonlyArray<Plan> = [
  {
    id: 'sehari-hari',
    nameMs: 'Sehari-hari',
    nameEn: 'Everyday',
    taglineMs: 'Pakej lengkap untuk bakal pengantin',
    taglineEn: 'Complete package for soon-to-wed couples',
    priceMonthly: 149,
    currency: 'MYR',
    ctaMs: 'Langgan sekarang',
    ctaEn: 'Subscribe now',
    features: [
      { ms: 'Chat AI pintar tanpa had', en: 'Unlimited smart AI chat' },
      { ms: 'Senarai semak automatik', en: 'Auto checklist' },
      { ms: 'Bajet & laporan', en: 'Budget & reports' },
      { ms: 'Tetamu tanpa had', en: 'Unlimited guests' },
      { ms: 'Vendor shortlist + WhatsApp', en: 'Vendor shortlist + WhatsApp' },
      { ms: 'Voice mode (BM)', en: 'Voice mode (BM)' },
      { ms: 'Countdown majlis', en: 'Wedding countdown' },
      { ms: 'Widget embed', en: 'Embed on your website' },
      { ms: 'Sokongan WhatsApp', en: 'WhatsApp support' }
    ]
  }
];

export function findPlan(id: string | null | undefined): Plan | undefined {
  if (!id) return undefined;
  return PLANS.find((plan) => plan.id === id);
}

export function priceForInterval(plan: Plan, _interval: PlanInterval): number {
  return plan.priceMonthly;
}

export function formatRinggit(amount: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}
