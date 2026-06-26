import { eq } from 'drizzle-orm';
import { db, sql } from '../db';
import { affiliates, clicks, referrals, commissions, affiliateSettings } from '../db/schema';
import { resolveTier, type AffiliateTier } from './constants';

export type AffiliateRow = typeof affiliates.$inferSelect;

export type DashboardMetric = {
  key: string;
  label: string;
  value: string;
  icon: string;
  trend?: string;
};

export type DashboardReferral = {
  name: string;
  status: string; // registered | trial | active
  packageName: string;
  date: string;
};

export type DashboardPayout = {
  amount: number;
  method: string;
  status: string;
  date: string;
};

export type AffiliateDashboardData = {
  profile: {
    code: string;
    link: string;
    status: string;
    tier: AffiliateTier;
    tierProgress: { current: number; next: number; nextTier: AffiliateTier };
  };
  metrics: DashboardMetric[];
  today: { label: string; value: string }[];
  referrals: DashboardReferral[];
  payouts: DashboardPayout[];
};

function referralLink(code: string): string {
  return `majlismate.ai/ref/${code.toLowerCase()}`;
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function rm(amount: number): string {
  return `RM ${amount.toLocaleString('ms-MY')}`;
}

/** Generate a referral code from a name, retrying until it is unique. */
async function generateUniqueCode(name: string): Promise<string> {
  const base =
    (name.trim().split(/\s+/)[0] || 'AFF').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 8) || 'AFF';
  for (let i = 0; i < 25; i++) {
    const code = `${base}${Math.floor(10 + Math.random() * 90)}`;
    const existing = await db.select({ id: affiliates.id }).from(affiliates).where(eq(affiliates.code, code)).limit(1);
    if (existing.length === 0) return code;
  }
  // Extremely unlikely fallback — guarantee uniqueness with a timestamp suffix.
  return `${base}${Date.now().toString().slice(-6)}`;
}

export async function getAffiliateByEmail(email: string): Promise<AffiliateRow | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await db.select().from(affiliates).where(eq(affiliates.email, normalized)).limit(1);
  return rows[0] ?? null;
}

export async function getAffiliateByCode(code: string): Promise<AffiliateRow | null> {
  const normalized = code.trim().toUpperCase();
  const rows = await db.select().from(affiliates).where(eq(affiliates.code, normalized)).limit(1);
  return rows[0] ?? null;
}

/**
 * Log a click on a referral link. Returns the matched affiliate (so the caller
 * can set the attribution cookie), or null when the code is unknown.
 */
export async function recordClick(
  code: string,
  meta: { ip?: string | null; device?: string | null; browser?: string | null; utmSource?: string | null }
): Promise<AffiliateRow | null> {
  const affiliate = await getAffiliateByCode(code);
  if (!affiliate) return null;
  await db.insert(clicks).values({
    affiliateId: affiliate.id,
    ip: meta.ip ?? null,
    device: meta.device ?? null,
    browser: meta.browser ?? null,
    utmSource: meta.utmSource ?? null
  });
  return affiliate;
}

/**
 * Insert a new affiliate, or return the existing one for this email. Used by
 * both the public application form and the dashboard (auto-provision on login),
 * so an email always maps to exactly one affiliate.
 */
export async function createOrGetAffiliate(input: {
  name: string;
  email: string;
  phone?: string | null;
  social?: string | null;
  userId?: string | null;
}): Promise<AffiliateRow> {
  const email = input.email.trim().toLowerCase();
  const existing = await getAffiliateByEmail(email);
  if (existing) return existing;

  const code = await generateUniqueCode(input.name);
  const [row] = await db
    .insert(affiliates)
    .values({
      code,
      name: input.name.trim() || email.split('@')[0],
      email,
      phone: input.phone?.trim() || null,
      social: input.social?.trim() || null,
      userId: input.userId ?? null
    })
    .returning();
  return row;
}

export type CommissionSetting = typeof affiliateSettings.$inferSelect;

// Fallback used only if the settings row is missing (it is seeded by default).
const DEFAULT_SETTING = {
  commissionType: 'fixed' as const,
  fixedAmount: '30.00',
  percentageRate: '20.00',
  recurringRate: '10.00',
  minPayout: '50.00'
};

/** Read the singleton commission/payout settings (admin-editable). */
export async function getCommissionSetting(): Promise<
  Pick<CommissionSetting, 'commissionType' | 'fixedAmount' | 'percentageRate' | 'recurringRate' | 'minPayout'>
> {
  const rows = await db.select().from(affiliateSettings).where(eq(affiliateSettings.id, 'default')).limit(1);
  return rows[0] ?? DEFAULT_SETTING;
}

/** Compute a commission amount from the configured rule + subscription value. */
export function computeCommission(
  setting: Pick<CommissionSetting, 'commissionType' | 'fixedAmount' | 'percentageRate'>,
  subscriptionAmount: number
): { amount: number; type: string } {
  if (setting.commissionType === 'percentage') {
    return {
      amount: Math.round(subscriptionAmount * (Number(setting.percentageRate) / 100) * 100) / 100,
      type: 'percentage'
    };
  }
  return { amount: Number(setting.fixedAmount), type: 'fixed' };
}

/**
 * Attribution step 1 — at checkout (browser has the mm_ref cookie). Records a
 * referred lead for the affiliate, keyed by the payment reference. Idempotent:
 * a second call with the same reference is a no-op. Returns the referral id, or
 * null when the code is unknown.
 */
export async function createReferralAtCheckout(input: {
  code: string;
  reference: string;
  amount?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  packageName?: string | null;
}): Promise<string | null> {
  const affiliate = await getAffiliateByCode(input.code);
  if (!affiliate) return null;

  const rows = await db
    .insert(referrals)
    .values({
      affiliateId: affiliate.id,
      reference: input.reference,
      amount: input.amount != null ? input.amount.toFixed(2) : null,
      customerName: input.customerName?.trim() || null,
      customerEmail: input.customerEmail?.trim()?.toLowerCase() || null,
      packageName: input.packageName ?? null,
      status: 'registered'
    })
    .onConflictDoNothing({ target: referrals.reference })
    .returning({ id: referrals.id });

  return rows[0]?.id ?? null;
}

/**
 * Attribution step 2 — on confirmed payment (ToyyibPay callback). Promotes the
 * referral to "active" and creates a pending commission. Idempotent: skips if
 * the referral is already active or already has a commission.
 */
export async function finalizeReferralCommission(reference: string): Promise<boolean> {
  const found = await db
    .select()
    .from(referrals)
    .where(eq(referrals.reference, reference))
    .limit(1);
  const referral = found[0];
  if (!referral) return false;

  // Guard against double commission on callback retries / refreshes.
  const existing = await db
    .select({ id: commissions.id })
    .from(commissions)
    .where(eq(commissions.referralId, referral.id))
    .limit(1);
  if (existing.length > 0) return false;

  const setting = await getCommissionSetting();
  const { amount, type } = computeCommission(setting, Number(referral.amount ?? 0));

  await db.update(referrals).set({ status: 'active' }).where(eq(referrals.id, referral.id));
  await db.insert(commissions).values({
    affiliateId: referral.affiliateId,
    referralId: referral.id,
    amount: amount.toFixed(2),
    type,
    status: 'pending'
  });
  return true;
}

/** Aggregate all dashboard data for one affiliate from the database. */
export async function getDashboardData(affiliate: AffiliateRow): Promise<AffiliateDashboardData> {
  const id = affiliate.id;

  // Single round-trip for all the scalar aggregates.
  const aggRows = (await sql`
    SELECT
      (SELECT count(*) FROM click WHERE affiliate_id = ${id})::int AS clicks,
      (SELECT count(*) FROM referral WHERE affiliate_id = ${id})::int AS registrations,
      (SELECT count(*) FROM referral WHERE affiliate_id = ${id} AND status = 'active')::int AS subscriptions,
      (SELECT count(*) FROM click WHERE affiliate_id = ${id} AND created_at::date = now()::date)::int AS clicks_today,
      (SELECT count(*) FROM referral WHERE affiliate_id = ${id} AND created_at::date = now()::date)::int AS reg_today,
      (SELECT count(*) FROM referral WHERE affiliate_id = ${id} AND status = 'active' AND created_at::date = now()::date)::int AS subs_today,
      (SELECT coalesce(sum(amount), 0) FROM commission WHERE affiliate_id = ${id} AND status = 'pending')::float AS pending,
      (SELECT coalesce(sum(amount), 0) FROM commission WHERE affiliate_id = ${id} AND status = 'approved')::float AS approved,
      (SELECT coalesce(sum(amount), 0) FROM commission WHERE affiliate_id = ${id} AND status = 'paid')::float AS paid,
      (SELECT coalesce(sum(amount), 0) FROM commission WHERE affiliate_id = ${id} AND status = 'paid'
        AND date_trunc('month', created_at) = date_trunc('month', now()))::float AS paid_this_month
  `) as Array<Record<string, number>>;
  const agg = aggRows[0];

  const referralRows = (await sql`
    SELECT customer_name, status, package_name, created_at
    FROM referral WHERE affiliate_id = ${id}
    ORDER BY created_at DESC LIMIT 8
  `) as Array<{ customer_name: string | null; status: string; package_name: string | null; created_at: string }>;

  const payoutRows = (await sql`
    SELECT amount, method, status, created_at
    FROM payout WHERE affiliate_id = ${id}
    ORDER BY created_at DESC LIMIT 5
  `) as Array<{ amount: string; method: string; status: string; created_at: string }>;

  const conversion = agg.clicks > 0 ? (agg.subscriptions / agg.clicks) * 100 : 0;
  const tierProgress = resolveTier(agg.subscriptions);

  const metrics: DashboardMetric[] = [
    { key: 'clicks', label: 'Jumlah klik', value: agg.clicks.toLocaleString('ms-MY'), icon: '👆' },
    { key: 'registrations', label: 'Pendaftaran', value: agg.registrations.toLocaleString('ms-MY'), icon: '📝' },
    { key: 'subscriptions', label: 'Langganan', value: agg.subscriptions.toLocaleString('ms-MY'), icon: '⭐' },
    { key: 'conversion', label: 'Kadar tukar', value: `${conversion.toFixed(1)}%`, icon: '📈', trend: 'klik → langganan' },
    { key: 'pending', label: 'Komisen tertunggak', value: rm(agg.pending), icon: '⏳' },
    { key: 'approved', label: 'Komisen diluluskan', value: rm(agg.approved), icon: '✅' },
    { key: 'paid', label: 'Komisen dibayar', value: rm(agg.paid), icon: '💸' },
    { key: 'monthly', label: 'Pendapatan bulan ini', value: rm(agg.paid_this_month), icon: '🗓️' }
  ];

  const today = [
    { label: 'Klik hari ini', value: agg.clicks_today.toLocaleString('ms-MY') },
    { label: 'Pendaftaran hari ini', value: agg.reg_today.toLocaleString('ms-MY') },
    { label: 'Langganan hari ini', value: agg.subs_today.toLocaleString('ms-MY') }
  ];

  const referrals: DashboardReferral[] = referralRows.map((r) => ({
    name: r.customer_name || 'Tanpa nama',
    status: r.status,
    packageName: r.package_name || '—',
    date: formatDate(r.created_at)
  }));

  const payouts: DashboardPayout[] = payoutRows.map((p) => ({
    amount: Number(p.amount),
    method: p.method === 'bank' ? 'Bank' : 'DuitNow',
    status: p.status,
    date: formatDate(p.created_at)
  }));

  return {
    profile: {
      code: affiliate.code,
      link: referralLink(affiliate.code),
      status: affiliate.status,
      tier: tierProgress.tier,
      tierProgress: { current: tierProgress.current, next: tierProgress.next, nextTier: tierProgress.nextTier }
    },
    metrics,
    today,
    referrals,
    payouts
  };
}
