import { NextResponse } from 'next/server';
import { getBillTransactions, isSuccessfulStatus } from '../../../../lib/payments/toyyibpay';

export const runtime = 'nodejs';

/**
 * Lightweight status check used by the success / failed pages and by
 * the checkout form to confirm a payment landed. Not authoritative —
 * ToyyibPay's callback is the source of truth — but useful for the
 * post-redirect confirmation flow.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const billCode = url.searchParams.get('bill');

  if (!billCode) {
    return NextResponse.json({ ok: false, reason: 'missing-bill' }, { status: 400 });
  }

  const result = await getBillTransactions(billCode);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason ?? 'lookup-failed' },
      { status: 502 }
    );
  }

  const tx = result.transactions[0];
  const status = tx?.status;
  const paid = isSuccessfulStatus(status);

  return NextResponse.json({
    ok: true,
    billCode,
    paid,
    status: status ?? null,
    amount: tx?.amount ?? null,
    channel: tx?.billpaymentchannel ?? null
  });
}
