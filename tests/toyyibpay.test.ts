import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ToyyibPayModule = typeof import('../lib/payments/toyyibpay');

const originalEnv = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function loadModule(): Promise<ToyyibPayModule> {
  vi.resetModules();
  return import('../lib/payments/toyyibpay');
}

describe('ToyyibPay client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    setEnv(originalEnv);
  });

  describe('isToyyibPayConfigured', () => {
    it('returns false when secret key is missing', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: undefined, TOYYIBPAY_CATEGORY_CODE: 'cat' });
      const mod = await loadModule();
      expect(mod.isToyyibPayConfigured()).toBe(false);
    });

    it('returns false when category code is missing', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: 'sec', TOYYIBPAY_CATEGORY_CODE: undefined });
      const mod = await loadModule();
      expect(mod.isToyyibPayConfigured()).toBe(false);
    });

    it('returns true when both are set', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: 'sec', TOYYIBPAY_CATEGORY_CODE: 'cat' });
      const mod = await loadModule();
      expect(mod.isToyyibPayConfigured()).toBe(true);
    });
  });

  describe('createBill', () => {
    const baseInput = {
      billName: 'Test plan',
      billDescription: 'desc',
      billAmountInCents: 4900,
      billReturnUrl: 'https://example.com/success',
      billCallbackUrl: 'https://example.com/callback',
      billExternalReferenceNo: 'ref-1',
      billTo: 'Ali',
      billEmail: 'ali@example.com',
      billPhone: '60123456789',
      billPaymentChannel: '0' as const,
      billChargeToCustomer: '1' as const
    };

    it('returns an error when not configured', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: undefined, TOYYIBPAY_CATEGORY_CODE: undefined });
      const mod = await loadModule();
      const result = await mod.createBill(baseInput);
      expect(result.ok).toBe(false);
    });

    it('parses a valid BillCode response', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: 'sec', TOYYIBPAY_CATEGORY_CODE: 'cat' });
      const mod = await loadModule();
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(JSON.stringify({ BillCode: 'abc123' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );

      const result = await mod.createBill(baseInput);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.billCode).toBe('abc123');
        expect(result.paymentUrl).toContain('abc123');
      }
    });

    it('returns an error when ToyyibPay returns an empty array', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: 'sec', TOYYIBPAY_CATEGORY_CODE: 'cat' });
      const mod = await loadModule();
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('[]', { status: 200, headers: {} }))
      );

      const result = await mod.createBill(baseInput);
      expect(result.ok).toBe(false);
    });

    it('returns an error when the network call fails', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: 'sec', TOYYIBPAY_CATEGORY_CODE: 'cat' });
      const mod = await loadModule();
      vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('network down'))));

      const result = await mod.createBill(baseInput);
      expect(result.ok).toBe(false);
    });

    it('returns an error when BillCode is missing', async () => {
      setEnv({ TOYYIBPAY_SECRET_KEY: 'sec', TOYYIBPAY_CATEGORY_CODE: 'cat' });
      const mod = await loadModule();
      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(JSON.stringify({ foo: 'bar' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );

      const result = await mod.createBill(baseInput);
      expect(result.ok).toBe(false);
    });
  });

  describe('status helpers', () => {
    it('isSuccessfulStatus recognises "1" and "success"', async () => {
      const mod = await loadModule();
      expect(mod.isSuccessfulStatus('1')).toBe(true);
      expect(mod.isSuccessfulStatus('success')).toBe(true);
      expect(mod.isSuccessfulStatus('2')).toBe(false);
    });

    it('isFailedStatus recognises 3, 4 and failed', async () => {
      const mod = await loadModule();
      expect(mod.isFailedStatus('3')).toBe(true);
      expect(mod.isFailedStatus('4')).toBe(true);
      expect(mod.isFailedStatus('failed')).toBe(true);
      expect(mod.isFailedStatus('1')).toBe(false);
    });

    it('isPendingStatus recognises 2 and pending', async () => {
      const mod = await loadModule();
      expect(mod.isPendingStatus('2')).toBe(true);
      expect(mod.isPendingStatus('pending')).toBe(true);
      expect(mod.isPendingStatus('1')).toBe(false);
    });
  });
});
