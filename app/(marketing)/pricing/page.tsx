import Link from 'next/link';
import type { Metadata } from 'next';
import { PLANS, formatRinggit } from '../../../lib/payments/plans';

export const metadata: Metadata = {
  title: 'Harga — MajlisMate.ai',
  description: 'Pilih pelan MajlisMate yang sesuai. Percuma, Sehari-hari, atau Bisnes.'
};

export default function PricingPage() {
  return (
    <main id="main" className="pricing-page">
      <header className="pricing-page__nav">
        <Link href="/" className="landing__brand" aria-label="MajlisMate.ai home">
          <img src="/logo-mark.svg" className="landing__brand-logo" alt="" aria-hidden="true" />
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav aria-label="Primary">
          <Link href="/">Utama</Link>
          <Link href="/chat">Buka app</Link>
        </nav>
      </header>

      <section className="pricing-page__hero">
        <span className="eyebrow">{/* ms */}Harga</span>
        <h1>Pilih pelan yang sesuai</h1>
        <p>Bermula percuma. Tukar atau batal bila-bila. Bayaran melalui ToyyibPay.</p>
      </section>

      <section className="pricing-page__grid" aria-label="Plans">
        {PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`pricing-page__card${plan.highlighted ? ' is-highlighted' : ''}`}
          >
            {plan.highlighted ? <span className="landing__plan-badge">Paling popular</span> : null}
            <h2>{plan.nameMs}</h2>
            <p className="pricing-page__tagline">{plan.taglineMs}</p>
            <div className="pricing-page__price">
              <strong>
                {plan.priceMonthly === 0 ? 'Percuma' : formatRinggit(plan.priceMonthly)}
              </strong>
              {plan.priceMonthly > 0 ? <span>/ bulan</span> : null}
            </div>
            {plan.priceMonthly > 0 ? (
              <p className="pricing-page__yearly">
                atau {formatRinggit(plan.priceYearly)} / tahun{' '}
                <small>(jimat 2 bulan)</small>
              </p>
            ) : null}
            <ul className="pricing-page__features">
              {plan.features.map((feature) => (
                <li
                  key={feature.en}
                  className={feature.included ? 'is-included' : 'is-excluded'}
                >
                  <span aria-hidden="true">{feature.included ? '✓' : '—'}</span>
                  {feature.ms}
                </li>
              ))}
            </ul>
            <Link
              href={plan.priceMonthly === 0 ? '/chat' : `/checkout?plan=${plan.id}`}
              className={plan.highlighted ? 'primary-action' : 'utility-action'}
            >
              {plan.ctaMs}
            </Link>
          </article>
        ))}
      </section>

      <section className="pricing-page__faq" aria-label="FAQ">
        <h2>Soalan lazim tentang harga</h2>
        <details>
          <summary>Adakah terdapat tempoh percubaan?</summary>
          <p>
            {/* ms */}Ya — pelan Percuma kekal selamanya. Anda boleh guna semua
            ciri asas tanpa bayar apa-apa. Upgrade bila anda sudah bersedia.
          </p>
        </details>
        <details>
          <summary>Bagaimana pembayaran berfungsi?</summary>
          <p>
            {/* ms */}Kami gunakan ToyyibPay. Selepas pilih pelan dan isi butiran,
            anda akan diarahkan ke ToyyibPay untuk bayar melalui FPX (bank
            online) atau Boost e-wallet. Selepas berjaya, anda akan diarahkan
            balik ke MajlisMate.
          </p>
        </details>
        <details>
          <summary>Boleh saya batal?</summary>
          <p>
            {/* ms */}Boleh. Tiada kontrak. Batal dari app bila-bila dan anda
            kekal boleh guna sehingga tamat tempoh langganan.
          </p>
        </details>
      </section>

      <footer className="landing__footer">
        <div>
          <strong>MajlisMate.ai</strong>
          <p>© {new Date().getFullYear()} MajlisMate.ai</p>
        </div>
        <div>
          <Link href="/">Utama</Link>
          <Link href="/chat">Buka app</Link>
        </div>
      </footer>
    </main>
  );
}
