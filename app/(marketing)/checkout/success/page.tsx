'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { findPlan, formatRinggit } from '@/lib/payments/plans';
import { trackEvent } from '@/lib/analytics';
import {
  clearSubscription,
  writeSubscription,
  type Subscription
} from '@/lib/payments/subscription';

type StatusResponse = {
  ok: boolean;
  paid: boolean;
  status: string | null;
  amount: string | null;
  channel: string | null;
};

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  // Billplz appends ?billplz[id]= & billplz[paid]= to the redirect URL.
  const billCode = params.get('billplz[id]') ?? params.get('billcode') ?? params.get('bill') ?? '';
  const reference = params.get('ref') ?? '';
  const planId = params.get('plan') ?? '';
  const intervalParam = params.get('interval') ?? 'bulanan';
  const plan = findPlan(planId);

  const [state, setState] = useState<'checking' | 'paid' | 'pending' | 'failed'>(
    'checking'
  );

  useEffect(() => {
    let cancelled = false;
    trackEvent('checkout_success_view', { reference, billCode });

    if (!billCode) {
      setState('pending');
      return;
    }

    fetch(`/api/payments/status?bill=${encodeURIComponent(billCode)}`)
      .then((res) => res.json() as Promise<StatusResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.paid) {
          const expiryDays = intervalParam === 'tahunan' ? 365 : 30;
          const subscription: Subscription = {
            id: reference || `mm-${Date.now()}`,
            plan: (plan?.id ?? 'sehari-hari') as Subscription['plan'],
            status: 'active',
            billCode,
            reference: reference || undefined,
            startsAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
            amountCents: data.amount ? Math.round(Number(data.amount) * 100) : undefined,
            updatedAt: new Date().toISOString()
          };
          writeSubscription(subscription);
          trackEvent('subscription_active', { planId: subscription.plan });
          setState('paid');
        } else {
          setState('pending');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState('pending');
      });

    return () => {
      cancelled = true;
    };
  }, [billCode, reference, plan]);

  function handleContinue() {
    trackEvent('checkout_success_continue');
    router.push('/chat');
  }

  return (
    <main id="main" className="checkout-status checkout-status--success">
      <div className="checkout-status__card">
        {state === 'checking' ? (
          <>
            <span className="checkout-status__emoji" aria-hidden="true">⏳</span>
            <h1>Menyemak pembayaran…</h1>
            <p>Sila tunggu sebentar. Kami sedang sahkan bayaran anda dengan Billplz.</p>
          </>
        ) : state === 'paid' ? (
          <>
            <span className="checkout-status__emoji" aria-hidden="true">🎉</span>
            <h1>Tahniah! Pembayaran berjaya</h1>
            <p>
              {/* ms */}Akaun <strong>{plan?.nameMs ?? 'MajlisMate'}</strong> anda
              sudah aktif. Anda boleh mula guna MajlisMate sekarang.
            </p>
            {plan ? (
              <ul className="checkout-status__receipt">
                <li>
                  <span>Pelan</span>
                  <strong>{plan.nameMs}</strong>
                </li>
                {plan.priceMonthly > 0 ? (
                  <li>
                    <span>Bayaran</span>
                    <strong>{formatRinggit(plan.priceMonthly)} / bulan</strong>
                  </li>
                ) : null}
                {reference ? (
                  <li>
                    <span>Rujukan</span>
                    <strong>{reference}</strong>
                  </li>
                ) : null}
              </ul>
            ) : null}
            <button type="button" className="primary-action" onClick={handleContinue}>
              {/* ms */}Buka MajlisMate
            </button>
          </>
        ) : (
          <>
            <span className="checkout-status__emoji" aria-hidden="true">⏳</span>
            <h1>Pembayaran sedang diproses</h1>
            <p>
              {/* ms */}Kami belum dapat sahkan bayaran anda. Ini biasanya
              mengambil masa beberapa minit. Jika sudah bayar, sila refresh
              halaman ini.
            </p>
            <div className="checkout-status__actions">
              <Link href="/chat" className="primary-action">
                {/* ms */}Cuba app dulu
              </Link>
              <button
                type="button"
                className="utility-action"
                onClick={() => {
                  clearSubscription();
                  router.refresh();
                }}
              >
                {/* ms */}Semak semula
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="checkout-page__loading">{/* ms */}Memuatkan…</div>}>
      <SuccessInner />
    </Suspense>
  );
}
