'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db } from '../../../lib/db';
import { affiliates, commissions, payouts, affiliateSettings } from '../../../lib/db/schema';
import { requireAdmin, requireSuperuser } from '../../../lib/admin/session';
import { createAdminUser, deleteAdminUser } from '../../../lib/admin/users';

const AFFILIATE_STATUSES = ['pending', 'approved', 'suspended', 'rejected'];
const COMMISSION_STATUSES = ['pending', 'approved', 'rejected', 'paid'];

export async function setAffiliateStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !AFFILIATE_STATUSES.includes(status)) return;
  await db.update(affiliates).set({ status }).where(eq(affiliates.id, id));
  revalidatePath('/admin/affiliates');
  revalidatePath(`/admin/affiliates/${id}`);
  revalidatePath('/admin');
}

export async function setCommissionStatusAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !COMMISSION_STATUSES.includes(status)) return;
  await db.update(commissions).set({ status }).where(eq(commissions.id, id));
  revalidatePath('/admin/commissions');
  revalidatePath('/admin');
}

/**
 * Pay an affiliate's approved commissions: record a payout for the total and
 * flip those commissions to "paid". Idempotent-ish — only acts on currently
 * approved commissions.
 */
export async function payAffiliateAction(formData: FormData) {
  await requireAdmin();
  const affiliateId = String(formData.get('affiliateId') ?? '');
  const method = String(formData.get('method') ?? 'duitnow');
  if (!affiliateId || !['bank', 'duitnow'].includes(method)) return;

  const approved = await db
    .select()
    .from(commissions)
    .where(and(eq(commissions.affiliateId, affiliateId), eq(commissions.status, 'approved')));

  const total = approved.reduce((sum, c) => sum + Number(c.amount), 0);
  if (total <= 0) return;

  await db.insert(payouts).values({
    affiliateId,
    amount: total.toFixed(2),
    method,
    status: 'paid',
    paidAt: new Date()
  });

  for (const c of approved) {
    await db.update(commissions).set({ status: 'paid' }).where(eq(commissions.id, c.id));
  }

  revalidatePath('/admin/payouts');
  revalidatePath('/admin/commissions');
  revalidatePath('/admin');
}

export async function addAdminUserAction(formData: FormData) {
  await requireSuperuser();
  const email = String(formData.get('email') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();
  const role = String(formData.get('role') ?? 'admin') === 'superuser' ? 'superuser' : 'admin';
  if (!email) return;
  await createAdminUser({ email, name, role });
  revalidatePath('/admin/admins');
}

export async function removeAdminUserAction(formData: FormData) {
  await requireSuperuser();
  const id = String(formData.get('id') ?? '');
  if (id) await deleteAdminUser(id);
  revalidatePath('/admin/admins');
}

export async function updateSettingsAction(formData: FormData) {
  await requireAdmin();
  const commissionType = String(formData.get('commissionType') ?? 'fixed');
  const num = (key: string, fallback: number) => {
    const v = Number(formData.get(key));
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  await db
    .update(affiliateSettings)
    .set({
      commissionType: commissionType === 'percentage' ? 'percentage' : 'fixed',
      fixedAmount: num('fixedAmount', 30).toFixed(2),
      percentageRate: num('percentageRate', 20).toFixed(2),
      recurringRate: num('recurringRate', 10).toFixed(2),
      minPayout: num('minPayout', 50).toFixed(2),
      updatedAt: new Date()
    })
    .where(eq(affiliateSettings.id, 'default'));
  revalidatePath('/admin/settings');
}
