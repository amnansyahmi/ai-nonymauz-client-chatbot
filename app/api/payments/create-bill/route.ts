import { NextResponse } from 'next/server';
import { findPlan, priceForInterval, type PlanInterval } from '../../../../lib/payments/plans';
import { createBill, isToyyibPayConfigured } from '../../../../lib/payments/toyyibpay';
import { readAttributionCookie } from '../../../../lib/affiliate/tracking';
import { createReferralAtCheckout } from '../../../../lib/affiliate/queries';

export const runtime = 'nodejs';

type CreateBillBody = {
  planId?: string;
  interval?: PlanInterval;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

function getOrigin(request: Request): string {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, '');
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  // Accept any 9-15 digit number with optional + and spaces
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return /^\+?[0-9]{9,15}$/.test(cleaned);
}

export async function POST(request: Request) {
  if (!isToyyibPayConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: 'ToyyibPay is not configured on this server. Sila hubungi pentadbir.'
      },
      { status: 503 }
    );
  }

  let body: CreateBillBody;
  try {
    body = (await request.json()) as CreateBillBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const plan = findPlan(body.planId);
  if (!plan) {
    return NextResponse.json({ ok: false, error: 'Plan tidak dijumpai.' }, { status: 400 });
  }

  const interval: PlanInterval = body.interval === 'tahunan' ? 'tahunan' : 'bulanan';
  const amount = priceForInterval(plan, interval);
  if (amount <= 0) {
    return NextResponse.json(
      { ok: false, error: 'Plan percuma tidak memerlukan pembayaran.' },
      { status: 400 }
    );
  }

  const customer = body.customer ?? {};
  const name = (customer.name ?? '').trim();
  const email = (customer.email ?? '').trim();
  const phone = (customer.phone ?? '').trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, error: 'Sila isi nama penuh.' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Sila isi email yang sah.' }, { status: 400 });
  }
  if (!isValidPhone(phone)) {
    return NextResponse.json({ ok: false, error: 'Sila isi nombor telefon yang sah.' }, { status: 400 });
  }

  const origin = getOrigin(request);
  const billAmountInCents = Math.round(amount * 100);
  const reference = `mm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const result = await createBill({
    billName: `MajlisMate ${plan.nameMs} (${interval})`,
    billDescription: `Langganan MajlisMate ${plan.nameMs} untuk 1 bulan.`,
    billAmountInCents,
    billReturnUrl: `${origin}/checkout/success?ref=${reference}&plan=${plan.id}&interval=${interval}`,
    billCallbackUrl: `${origin}/api/payments/callback`,
    billExternalReferenceNo: reference,
    billTo: name,
    billEmail: email,
    billPhone: phone,
    billPaymentChannel: '0',
    billChargeToCustomer: '1'
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.reason },
      { status: 502 }
    );
  }

  // Affiliate attribution: if this visitor arrived via a referral link, record
  // a referred lead keyed by the payment reference. Never block checkout on it.
  const refCode = readAttributionCookie(request.headers.get('cookie'));
  if (refCode) {
    try {
      await createReferralAtCheckout({
        code: refCode,
        reference,
        amount,
        customerName: name,
        customerEmail: email,
        packageName: plan.nameMs
      });
    } catch (error) {
      console.error('[create-bill] referral attribution failed', error);
    }
  }

  return NextResponse.json({
    ok: true,
    paymentUrl: result.paymentUrl,
    billCode: result.billCode,
    reference,
    planId: plan.id,
    interval,
    amountCents: billAmountInCents
  });
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: 'Use POST to create a bill.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
