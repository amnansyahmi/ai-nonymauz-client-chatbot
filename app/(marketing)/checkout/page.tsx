'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { findPlan, formatRinggit, priceForInterval, type PlanInterval } from '../../../lib/payments/plans';
import { trackEvent } from '../../../lib/analytics';

type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  interval: PlanInterval;
};

type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

function CheckoutInner() {
  const router = useRouter();
  const params = useSearchParams();
  const planId = params.get('plan') ?? '';
  const intervalParam = params.get('interval') === 'tahunan' ? 'tahunan' : 'bulanan';

  const plan = findPlan(planId);
  const planIsMissing = !plan;

  const [form, setForm] = useState<CheckoutForm>({
    name: '',
    email: '',
    phone: '',
    interval: intervalParam
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (plan) trackEvent('checkout_view', { planId: plan.id, interval: form.interval });
  }, [plan, form.interval]);

  if (planIsMissing) {
    return (
      <main id="main" className="checkout-page">
        <header className="pricing-page__nav">
          <Link href="/" className="landing__brand">
            <Image src="/logo-mark.svg" width={40} height={40} className="landing__brand-logo" alt="" aria-hidden="true" />
            <strong>MajlisMate.ai</strong>
          </Link>
        </header>
        <section className="checkout-page__empty">
          <h1>Pelan tidak dijumpai</h1>
          <p>Sila pilih pelan dari halaman harga.</p>
          <Link href="/pricing" className="primary-action">
            Kembali ke harga
          </Link>
        </section>
      </main>
    );
  }

  const safePlan = plan;
  const amount = priceForInterval(safePlan, form.interval);

  function validate(): CheckoutErrors {
    const next: CheckoutErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = 'Sila isi nama penuh.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Sila isi email yang sah.';
    }
    if (!/^\+?[0-9]{9,15}$/.test(form.phone.replace(/[^0-9+]/g, ''))) {
      next.phone = 'Sila isi nombor telefon yang sah.';
    }
    return next;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitError('');
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    trackEvent('checkout_submit', { planId: safePlan.id, interval: form.interval });

    try {
      const res = await fetch('/api/payments/create-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: safePlan.id,
          interval: form.interval,
          customer: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.replace(/[^0-9+]/g, '')
          }
        })
      });
      const data = (await res.json()) as
        | { ok: true; paymentUrl: string }
        | { ok: false; error: string };

      if (!res.ok || !data.ok) {
        const reason = !data.ok ? data.error : 'Bayaran gagal dimulakan.';
        setSubmitError(reason);
        trackEvent('checkout_error', { planId: safePlan.id, reason });
        setSubmitting(false);
        return;
      }

      trackEvent('checkout_redirect', { planId: safePlan.id });
      window.location.href = data.paymentUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ralat tidak dijangka.';
      setSubmitError(message);
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="checkout-page">
      <header className="pricing-page__nav">
        <Link href="/" className="landing__brand">
          <span className="landing__brand-mark" aria-hidden="true">M</span>
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav aria-label="Primary">
          <Link href="/pricing">← Kembali ke harga</Link>
        </nav>
      </header>

      <section className="checkout-page__layout">
        <form className="checkout-page__form" onSubmit={handleSubmit} noValidate>
          <h1>Bayaran untuk {plan.nameMs}</h1>
          <p className="checkout-page__lede">
            {/* ms */}Isi butiran anda. Anda akan diarahkan ke Billplz untuk
            bayar dengan selamat.
          </p>

          <div className="checkout-page__plan-display">
            <span>Pakej</span>
            <strong>{plan.nameMs} — {formatRinggit(plan.priceMonthly)}/bulan</strong>
          </div>

          <label className="checkout-page__field">
            <span>Nama penuh</span>
            <input
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'checkout-name-error' : undefined}
              required
            />
            {errors.name ? (
              <span id="checkout-name-error" className="checkout-page__error" role="alert">
                {errors.name}
              </span>
            ) : null}
          </label>

          <label className="checkout-page__field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'checkout-email-error' : undefined}
              required
            />
            {errors.email ? (
              <span id="checkout-email-error" className="checkout-page__error" role="alert">
                {errors.email}
              </span>
            ) : null}
          </label>

          <label className="checkout-page__field">
            <span>No. telefon</span>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="e.g. 0123456789"
              value={form.phone}
              onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'checkout-phone-error' : undefined}
              required
            />
            {errors.phone ? (
              <span id="checkout-phone-error" className="checkout-page__error" role="alert">
                {errors.phone}
              </span>
            ) : null}
          </label>

          {submitError ? (
            <p className="checkout-page__alert" role="alert">
              {submitError}
            </p>
          ) : null}

          <button type="submit" className="primary-action checkout-page__submit" disabled={submitting}>
            {submitting
              ? 'Sila tunggu…'
              : `Bayar ${formatRinggit(amount)} melalui Billplz`}
          </button>

          <p className="checkout-page__small">
            {/* ms */}Dengan meneruskan, anda bersetuju dengan terma MajlisMate.
            Pembayaran diproses oleh Billplz — kami tidak menyimpan
            maklumat kad bank anda.
          </p>
        </form>

        <aside className="checkout-page__summary" aria-label="Order summary">
          <h2>Ringkasan pesanan</h2>
          <div className="checkout-page__summary-row">
            <span>Pakej</span>
            <strong>{plan.nameMs}</strong>
          </div>
          <div className="checkout-page__summary-row">
            <span>Harga</span>
            <strong>{formatRinggit(amount)}/bulan</strong>
          </div>
          <ul className="checkout-page__summary-features">
              {plan.features.slice(0, 5).map((feature) => (
                  <li key={feature.en}>
                    <span aria-hidden="true">✓</span>
                    {feature.ms}
                  </li>
                ))}
          </ul>
          <div className="checkout-page__summary-trust">
            <span aria-hidden="true">🔒</span>
            <span>Pembayaran selamat Billplz</span>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="checkout-page__loading">{/* ms */}Memuatkan…</div>}>
      <CheckoutInner />
    </Suspense>
  );
}
