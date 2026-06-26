/**
 * Static affiliate UI data — marketing assets and badge ladder. These are not
 * per-user records, so they stay as constants (not in the database).
 */

export type MarketingAsset = {
  title: string;
  type: string;
  icon: string;
};

export const AFFILIATE_ASSETS: MarketingAsset[] = [
  { title: 'Poster Instagram', type: 'Imej · 1080×1350', icon: '🖼️' },
  { title: 'Banner Facebook', type: 'Imej · 1200×630', icon: '🏷️' },
  { title: 'Reel promosi 15s', type: 'Video · MP4', icon: '🎬' },
  { title: 'Template WhatsApp', type: 'Teks', icon: '💬' },
  { title: 'Caption sosial', type: 'Teks', icon: '✍️' },
  { title: 'Logo & garis panduan', type: 'ZIP', icon: '📦' }
];

export const AFFILIATE_BADGES = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;

export type AffiliateTier = (typeof AFFILIATE_BADGES)[number];

// Badge thresholds by number of active subscriptions (sales).
export const TIER_THRESHOLDS: { tier: AffiliateTier; min: number }[] = [
  { tier: 'Platinum', min: 50 },
  { tier: 'Gold', min: 30 },
  { tier: 'Silver', min: 10 },
  { tier: 'Bronze', min: 0 }
];

/** Resolve a sales count into a tier + progress toward the next tier. */
export function resolveTier(sales: number): {
  tier: AffiliateTier;
  current: number;
  next: number;
  nextTier: AffiliateTier;
} {
  const tier = TIER_THRESHOLDS.find((t) => sales >= t.min)?.tier ?? 'Bronze';
  const idx = AFFILIATE_BADGES.indexOf(tier);
  const nextTier = AFFILIATE_BADGES[Math.min(idx + 1, AFFILIATE_BADGES.length - 1)];
  const next = TIER_THRESHOLDS.find((t) => t.tier === nextTier)?.min ?? sales;
  return { tier, current: sales, next: Math.max(next, sales), nextTier };
}
