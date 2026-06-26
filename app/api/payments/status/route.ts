import { NextResponse } from 'next/server';
import { getBill } from '@/lib/payments/billplz';

export const runtime = 'nodejs';

/**
 * Status check used by the success page to confirm a payment landed. Reads the
 * bill straight from Billplz (authoritative, via our secret key).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const billId = url.searchParams.get('bill');

  if (!billId) {
    return NextResponse.json({ ok: false, reason: 'missing-bill' }, { status: 400 });
  }

  const result = await getBill(billId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason ?? 'lookup-failed' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    billCode: billId,
    paid: result.paid,
    status: result.state,
    amount: result.amountCents != null ? (result.amountCents / 100).toFixed(2) : null,
    channel: null
  });
}
