import { NextResponse } from 'next/server';
import { getBill } from '../../../../lib/payments/billplz';
import { finalizeReferralCommission } from '../../../../lib/affiliate/queries';

export const runtime = 'nodejs';

/**
 * Billplz server-to-server callback. Billplz POSTs form-encoded fields (incl.
 * the bill `id`). We re-read the bill from Billplz (authoritative) to confirm
 * payment, then finalize affiliate attribution. Returns 200 — the browser
 * return is handled separately by the redirect_url (the success page).
 */
async function readBillId(request: Request): Promise<string | null> {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get('billplz[id]') || url.searchParams.get('id');
  if (fromQuery) return fromQuery;
  try {
    const form = await request.formData();
    const id = form.get('id');
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
}

async function handle(request: Request) {
  const billId = await readBillId(request);
  if (!billId) return NextResponse.json({ ok: false, reason: 'missing-bill' }, { status: 400 });

  const bill = await getBill(billId);
  if (bill.ok && bill.paid && bill.reference) {
    try {
      await finalizeReferralCommission(bill.reference);
    } catch (error) {
      console.error('[callback] commission finalize failed', error);
    }
  }

  // Billplz only needs a 200 acknowledgement.
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
