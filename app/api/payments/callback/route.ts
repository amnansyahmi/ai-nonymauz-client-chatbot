import { NextResponse } from 'next/server';
import { getBillTransactions, isSuccessfulStatus } from '../../../../lib/payments/toyyibpay';
import { finalizeReferralCommission } from '../../../../lib/affiliate/queries';

export const runtime = 'nodejs';

async function handle(request: Request) {
  const url = new URL(request.url);
  const billCode = url.searchParams.get('billcode') ?? url.searchParams.get('BillCode');
  const reference = url.searchParams.get('ref') ?? url.searchParams.get('order_id');

  const baseUrl = new URL(request.url).origin;
  const safeRef = encodeURIComponent(reference ?? '');
  const safeBill = encodeURIComponent(billCode ?? '');

  if (!billCode) {
    return NextResponse.redirect(`${baseUrl}/checkout/failed?reason=missing-bill&ref=${safeRef}`);
  }

  const result = await getBillTransactions(billCode);
  if (!result.ok) {
    return NextResponse.redirect(
      `${baseUrl}/checkout/failed?reason=lookup&ref=${safeRef}&bill=${safeBill}`
    );
  }

  const tx = result.transactions[0];
  const status = tx?.status;
  if (isSuccessfulStatus(status)) {
    // Confirmed payment: promote the referral and create the commission. Keyed
    // by reference (order_id), idempotent, and never blocks the redirect.
    if (reference) {
      try {
        await finalizeReferralCommission(reference);
      } catch (error) {
        console.error('[callback] commission finalize failed', error);
      }
    }
    return NextResponse.redirect(
      `${baseUrl}/checkout/success?ref=${safeRef}&bill=${safeBill}`
    );
  }

  return NextResponse.redirect(
    `${baseUrl}/checkout/failed?reason=not-paid&ref=${safeRef}&bill=${safeBill}`
  );
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  // ToyyibPay sends form-encoded data; consume it so the body stream
  // is fully read before we look at the URL parameters above.
  try {
    const cloned = request.clone();
    const contentType = cloned.headers.get('content-type') ?? '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      await cloned.formData();
    } else if (contentType.includes('multipart/form-data')) {
      await cloned.formData();
    } else {
      await cloned.text();
    }
  } catch {
    // Ignore — the URL params are enough to verify.
  }
  return handle(request);
}
