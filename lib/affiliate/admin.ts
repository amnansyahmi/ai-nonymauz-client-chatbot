import { sql } from '../db';

/**
 * Admin read queries. Raw SQL is used for the cross-table aggregates the admin
 * views need (joins + subqueries), returning plain rows the pages render.
 */

export type AdminKpis = {
  total_affiliates: number;
  active_affiliates: number;
  total_customers: number;
  active_subs: number;
  revenue: number;
  liability: number;
  paid: number;
  new_this_month: number;
};

export async function getAdminDashboard(): Promise<AdminKpis> {
  const rows = (await sql`
    SELECT
      (SELECT count(*) FROM affiliate)::int AS total_affiliates,
      (SELECT count(*) FROM affiliate WHERE status='approved')::int AS active_affiliates,
      (SELECT count(*) FROM referral)::int AS total_customers,
      (SELECT count(*) FROM referral WHERE status='active')::int AS active_subs,
      (SELECT coalesce(sum(amount),0) FROM referral WHERE status='active')::float AS revenue,
      (SELECT coalesce(sum(amount),0) FROM commission WHERE status IN ('pending','approved'))::float AS liability,
      (SELECT coalesce(sum(amount),0) FROM commission WHERE status='paid')::float AS paid,
      (SELECT count(*) FROM referral WHERE created_at >= date_trunc('month', now()))::int AS new_this_month
  `) as AdminKpis[];
  return rows[0];
}

export type AdminAffiliateRow = {
  id: string;
  code: string;
  name: string;
  email: string;
  status: string;
  tier: string;
  created_at: string;
  users: number;
  revenue: number;
  commission: number;
};

export async function listAffiliates(): Promise<AdminAffiliateRow[]> {
  return (await sql`
    SELECT a.id, a.code, a.name, a.email, a.status, a.tier, a.created_at,
      (SELECT count(*) FROM referral r WHERE r.affiliate_id = a.id)::int AS users,
      (SELECT coalesce(sum(amount),0) FROM referral r WHERE r.affiliate_id = a.id AND r.status='active')::float AS revenue,
      (SELECT coalesce(sum(amount),0) FROM commission c WHERE c.affiliate_id = a.id)::float AS commission
    FROM affiliate a
    ORDER BY a.created_at DESC
  `) as AdminAffiliateRow[];
}

export async function getAffiliateDetail(id: string) {
  const affRows = (await sql`SELECT * FROM affiliate WHERE id = ${id} LIMIT 1`) as Array<Record<string, unknown>>;
  const affiliate = affRows[0];
  if (!affiliate) return null;

  const users = (await sql`
    SELECT r.customer_name, r.customer_email, r.package_name, r.amount, r.status, r.created_at,
      (SELECT coalesce(sum(amount),0) FROM commission c WHERE c.referral_id = r.id)::float AS commission
    FROM referral r WHERE r.affiliate_id = ${id}
    ORDER BY r.created_at DESC
  `) as Array<Record<string, unknown>>;

  const statRows = (await sql`
    SELECT
      (SELECT count(*) FROM referral WHERE affiliate_id = ${id})::int AS users,
      (SELECT coalesce(sum(amount),0) FROM referral WHERE affiliate_id = ${id} AND status='active')::float AS revenue,
      (SELECT coalesce(sum(amount),0) FROM commission WHERE affiliate_id = ${id})::float AS commission
  `) as Array<{ users: number; revenue: number; commission: number }>;

  return { affiliate, users, stats: statRows[0] };
}

export async function listCommissions() {
  return (await sql`
    SELECT c.id, c.amount, c.type, c.status, c.created_at,
      a.code AS affiliate_code, a.name AS affiliate_name,
      r.customer_name
    FROM commission c
    JOIN affiliate a ON a.id = c.affiliate_id
    LEFT JOIN referral r ON r.id = c.referral_id
    ORDER BY c.created_at DESC
  `) as Array<Record<string, unknown>>;
}

export async function listCustomers() {
  return (await sql`
    SELECT r.customer_name, r.customer_email, r.package_name, r.amount, r.status, r.created_at,
      a.code AS affiliate_code
    FROM referral r
    JOIN affiliate a ON a.id = r.affiliate_id
    ORDER BY r.created_at DESC
  `) as Array<Record<string, unknown>>;
}

export async function listPayouts() {
  return (await sql`
    SELECT p.id, p.amount, p.method, p.status, p.created_at, p.paid_at,
      a.code AS affiliate_code, a.name AS affiliate_name
    FROM payout p
    JOIN affiliate a ON a.id = p.affiliate_id
    ORDER BY p.created_at DESC
  `) as Array<Record<string, unknown>>;
}

/** Affiliates with approved-but-unpaid commissions, ready for a payout. */
export async function getPayableAffiliates() {
  return (await sql`
    SELECT a.id, a.code, a.name, a.bank_name, a.bank_account,
      coalesce(sum(c.amount),0)::float AS owed,
      count(c.id)::int AS commission_count
    FROM affiliate a
    JOIN commission c ON c.affiliate_id = a.id AND c.status='approved'
    GROUP BY a.id
    ORDER BY owed DESC
  `) as Array<Record<string, unknown>>;
}

export async function getReports() {
  const topAffiliates = (await sql`
    SELECT a.code, a.name,
      count(r.id)::int AS referrals,
      coalesce(sum(r.amount) FILTER (WHERE r.status='active'),0)::float AS revenue
    FROM affiliate a
    LEFT JOIN referral r ON r.affiliate_id = a.id
    GROUP BY a.id
    ORDER BY revenue DESC
    LIMIT 10
  `) as Array<Record<string, unknown>>;

  const totalsRows = (await sql`
    SELECT
      (SELECT coalesce(sum(amount),0) FROM referral WHERE status='active')::float AS revenue,
      (SELECT coalesce(sum(amount),0) FROM commission)::float AS commission,
      (SELECT count(*) FROM referral)::int AS registrations,
      (SELECT count(*) FROM referral WHERE status='active')::int AS active_subs
  `) as Array<{ revenue: number; commission: number; registrations: number; active_subs: number }>;

  return { topAffiliates, totals: totalsRows[0] };
}
