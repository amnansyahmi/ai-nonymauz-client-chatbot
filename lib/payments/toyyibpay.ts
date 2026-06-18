/**
 * ToyyibPay client. ToyyibPay is a Malaysian payment gateway that
 * supports FPX (online banking), manual bank transfer, and Boost
 * e-wallet via bill codes.
 *
 * Docs: https://toyyibpay.com/apiv3
 *
 * Endpoints used:
 *   - createBill: POST /index.php/api/createBill
 *   - getBillTransactions: GET /index.php/api/getBillTransactions
 *
 * All network calls go through `fetchToyyibPay` so they can be stubbed
 * in tests.
 */

export type ToyyibPayEnv = {
  baseUrl: string;
  secretKey: string;
  categoryCode: string;
};

export type CreateBillInput = {
  billName: string;
  billDescription: string;
  billAmountInCents: number; // ToyyibPay expects integer cents (RM 49.00 → 4900)
  billReturnUrl: string;
  billCallbackUrl: string;
  billExternalReferenceNo: string;
  billTo: string;
  billEmail: string;
  billPhone: string;
  billPaymentChannel: '0' | '1' | '2'; // 0 = FPX, 1 = FPX + Boost, 2 = both
  billChargeToCustomer: '0' | '1'; // 0 = charge to merchant, 1 = charge to customer
};

export type CreateBillResult = {
  ok: true;
  billCode: string;
  paymentUrl: string;
};

export type CreateBillError = {
  ok: false;
  reason: string;
  raw?: unknown;
};

export type BillTransaction = {
  billName: string;
  billcode: string;
  status: '1' | '2' | '3' | '4'; // 1 = success, 2 = pending, 3 = fail, 4 = ?
  amount: string;
  billpaymentstatus?: string;
  billpaymentchannel?: string;
};

export type GetBillTransactionsResult = {
  ok: boolean;
  transactions: BillTransaction[];
  reason?: string;
  raw?: unknown;
};

const DEFAULT_BASE_URL = 'https://toyyibpay.com';

function readEnv(): ToyyibPayEnv {
  const baseUrl = process.env.TOYYIBPAY_BASE_URL ?? DEFAULT_BASE_URL;
  const secretKey = process.env.TOYYIBPAY_SECRET_KEY ?? '';
  const categoryCode = process.env.TOYYIBPAY_CATEGORY_CODE ?? '';
  return { baseUrl, secretKey, categoryCode };
}

export function isToyyibPayConfigured(env: ToyyibPayEnv = readEnv()): boolean {
  return Boolean(env.secretKey && env.categoryCode);
}

async function fetchToyyibPay<T>(path: string, init: RequestInit): Promise<T> {
  const env = readEnv();
  const url = `${env.baseUrl}${path}`;
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (!res.ok) {
    throw new Error(`ToyyibPay ${init.method} ${path} failed: ${res.status}`);
  }
  return parsed as T;
}

export async function createBill(input: CreateBillInput): Promise<CreateBillResult | CreateBillError> {
  const env = readEnv();
  if (!isToyyibPayConfigured(env)) {
    return { ok: false, reason: 'ToyyibPay is not configured. Set TOYYIBPAY_SECRET_KEY and TOYYIBPAY_CATEGORY_CODE.' };
  }

  const form = new URLSearchParams();
  form.set('userSecretKey', env.secretKey);
  form.set('categoryCode', env.categoryCode);
  form.set('billName', input.billName);
  form.set('billDescription', input.billDescription);
  form.set('billPriceSetting', '1'); // 1 = fixed price
  form.set('billPayorInfo', '1');
  form.set('billAmount', String(input.billAmountInCents));
  form.set('billReturnUrl', input.billReturnUrl);
  form.set('billCallbackUrl', input.billCallbackUrl);
  form.set('billExternalReferenceNo', input.billExternalReferenceNo);
  form.set('billTo', input.billTo);
  form.set('billEmail', input.billEmail);
  form.set('billPhone', input.billPhone);
  form.set('billPaymentChannel', input.billPaymentChannel);
  form.set('billChargeToCustomer', input.billChargeToCustomer);
  form.set('billSplitPayment', '0');
  form.set('billPaymentNowExpiry', '3'); // days
  form.set('billExpiryDate', '');
  form.set('billExpiryTime', '');

  try {
    const data = await fetchToyyibPay<unknown>('/index.php/api/createBill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    if (typeof data === 'object' && data !== null && 'BillCode' in data) {
      const billCode = (data as { BillCode?: string }).BillCode;
      if (!billCode) {
        return { ok: false, reason: 'ToyyibPay returned an empty BillCode.', raw: data };
      }
      return {
        ok: true,
        billCode,
        paymentUrl: `${env.baseUrl}/${billCode}`
      };
    }

    if (Array.isArray(data) && data.length === 0) {
      return { ok: false, reason: 'ToyyibPay menolak permohonan. Sila semak secret key dan category code.', raw: data };
    }

    return { ok: false, reason: 'ToyyibPay returned an unexpected response.', raw: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ToyyibPay error';
    return { ok: false, reason: message };
  }
}

export async function getBillTransactions(billCode: string): Promise<GetBillTransactionsResult> {
  const env = readEnv();
  if (!isToyyibPayConfigured(env)) {
    return { ok: false, transactions: [], reason: 'ToyyibPay is not configured.' };
  }

  const form = new URLSearchParams();
  form.set('userSecretKey', env.secretKey);
  form.set('billCode', billCode);

  try {
    const data = await fetchToyyibPay<unknown>('/index.php/api/getBillTransactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });

    if (Array.isArray(data)) {
      const transactions = data as BillTransaction[];
      return { ok: true, transactions };
    }

    return { ok: false, transactions: [], reason: 'ToyyibPay returned a non-array response.', raw: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ToyyibPay error';
    return { ok: false, transactions: [], reason: message };
  }
}

export function isSuccessfulStatus(status: string | undefined): boolean {
  return status === '1' || status === 'success';
}

export function isFailedStatus(status: string | undefined): boolean {
  return status === '3' || status === '4' || status === 'failed';
}

export function isPendingStatus(status: string | undefined): boolean {
  return status === '2' || status === 'pending';
}
