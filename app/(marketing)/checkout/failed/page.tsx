'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

const REASON_LABEL: Record<string, { ms: string; en: string }> = {
  'missing-bill': { ms: 'Maklumat bil tidak dijumpai.', en: 'Bill information is missing.' },
  lookup: { ms: 'Tidak dapat menyemak status bayaran.', en: 'Could not look up the payment status.' },
  'not-paid': { ms: 'Bayaran belum diterima lagi.', en: 'Payment has not been received yet.' }
};

function FailedInner() {
  const params = useSearchParams();
  const reason = params.get('reason') ?? 'unknown';
  const billCode = params.get('bill') ?? '';
  const reference = params.get('ref') ?? '';
  const isMs = true; // page is BM-first
  const label = REASON_LABEL[reason] ?? {
    ms: 'Bayaran tidak berjaya. Sila cuba lagi.',
    en: 'Payment failed. Please try again.'
  };

  return (
    <main id="main" className="checkout-status checkout-status--failed">
      <div className="checkout-status__card">
        <span className="checkout-status__emoji" aria-hidden="true">😔</span>
        <h1>Bayaran tidak berjaya</h1>
        <p>{isMs ? label.ms : label.en}</p>
        {reference || billCode ? (
          <p className="checkout-status__small">
            {reference ? `Rujukan: ${reference}` : null}
            {billCode ? ` · Bil: ${billCode}` : null}
          </p>
        ) : null}
        <div className="checkout-status__actions">
          <Link
            href="/pricing"
            className="primary-action"
            onClick={() => trackEvent('checkout_retry', { reason })}
          >
            Cuba lagi
          </Link>
          <Link href="/" className="utility-action">
            Kembali ke utama
          </Link>
        </div>
        <p className="checkout-status__hint">
          {/* ms */}Bayaran melalui Billplz kadangkala mengambil masa
          beberapa minit untuk dikemas kini. Jika wang sudah dipotong,
          hubungi kami di support@majlismate.ai.
        </p>
      </div>
    </main>
  );
}

export default function CheckoutFailedPage() {
  return (
    <Suspense fallback={<div className="checkout-page__loading">{/* ms */}Memuatkan…</div>}>
      <FailedInner />
    </Suspense>
  );
}
