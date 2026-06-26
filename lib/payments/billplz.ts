/**
 * Billplz client (sandbox by default). Billplz is a Malaysian payment gateway.
 *
 * Docs: https://www.billplz.com/api  (sandbox: https://www.billplz-sandbox.com)
 *
 * Auth: HTTP Basic, API secret key as the username (blank password).
 * Bills are created under a Collection (BILLPLZ_COLLECTION_ID).
 *
 * Endpoints used:
 *   - POST /api/v3/bills          create a bill
 *   - GET  /api/v3/bills/{id}     read bill / payment status
 */

export type BillplzEnv = {
  baseUrl: string;
  apiKey: string;
  collectionId: string;
  xSignatureKey: string;
};

function readEnv(): BillplzEnv {
  return {
    baseUrl: (process.env.BILLPLZ_BASE_URL || 'https://www.billplz-sandbox.com').replace(/\/$/, ''),
    apiKey: process.env.BILLPLZ_API_KEY ?? '',
    collectionId: process.env.BILLPLZ_COLLECTION_ID ?? '',
    xSignatureKey: process.env.BILLPLZ_X_SIGNATURE_KEY ?? ''
  };
}

export function isBillplzConfigured(env: BillplzEnv = readEnv()): boolean {
  return Boolean(env.apiKey && env.collectionId);
}

function authHeader(apiKey: string): string {
  return `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;
}

export type CreateBillInput = {
  name: string;
  email: string;
  amountInCents: number;
  description: string;
  callbackUrl: string;
  redirectUrl: string;
  reference: string;
};

export type CreateBillResult =
  | { ok: true; billId: string; paymentUrl: string }
  | { ok: false; reason: string };

export async function createBill(input: CreateBillInput): Promise<CreateBillResult> {
  const env = readEnv();
  if (!isBillplzConfigured(env)) {
    return { ok: false, reason: 'Billplz belum dikonfigurasi. Tetapkan BILLPLZ_API_KEY dan BILLPLZ_COLLECTION_ID.' };
  }

  const form = new URLSearchParams();
  form.set('collection_id', env.collectionId);
  form.set('email', input.email);
  form.set('name', input.name);
  form.set('amount', String(input.amountInCents)); // Billplz expects integer cents
  form.set('callback_url', input.callbackUrl);
  form.set('redirect_url', input.redirectUrl);
  form.set('description', input.description.slice(0, 200));
  form.set('reference_1_label', 'Ref');
  form.set('reference_1', input.reference);

  try {
    const res = await fetch(`${env.baseUrl}/api/v3/bills`, {
      method: 'POST',
      headers: { Authorization: authHeader(env.apiKey), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
    if (!res.ok) {
      const detail = typeof data === 'string' ? data : JSON.stringify(data);
      return { ok: false, reason: `Billplz error ${res.status}: ${detail}` };
    }
    if (data && typeof data === 'object' && 'id' in data && 'url' in data) {
      const d = data as { id: string; url: string };
      return { ok: true, billId: d.id, paymentUrl: d.url };
    }
    return { ok: false, reason: 'Billplz returned an unexpected response.' };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Unknown Billplz error' };
  }
}

export type BillStatus = {
  ok: boolean;
  paid: boolean;
  state: string | null;
  amountCents: number | null;
  reference: string | null;
  reason?: string;
};

export async function getBill(billId: string): Promise<BillStatus> {
  const env = readEnv();
  if (!isBillplzConfigured(env)) {
    return { ok: false, paid: false, state: null, amountCents: null, reference: null, reason: 'not-configured' };
  }
  try {
    const res = await fetch(`${env.baseUrl}/api/v3/bills/${encodeURIComponent(billId)}`, {
      headers: { Authorization: authHeader(env.apiKey) }
    });
    const text = await res.text();
    let data: Record<string, unknown> | null;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = null;
    }
    if (!res.ok || !data) {
      return { ok: false, paid: false, state: null, amountCents: null, reference: null, reason: `lookup-failed-${res.status}` };
    }
    return {
      ok: true,
      paid: data.paid === true || data.state === 'paid',
      state: typeof data.state === 'string' ? data.state : null,
      amountCents: typeof data.amount === 'number' ? data.amount : null,
      reference: typeof data.reference_1 === 'string' ? data.reference_1 : null
    };
  } catch (error) {
    return { ok: false, paid: false, state: null, amountCents: null, reference: null, reason: error instanceof Error ? error.message : 'error' };
  }
}
