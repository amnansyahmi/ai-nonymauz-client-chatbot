import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { PLANS, formatRinggit } from '../../../lib/payments/plans';

export const metadata: Metadata = {
  title: 'Harga — MajlisMate.ai',
  description: 'Pakej lengkap MajlisMate.ai untuk merancang majlis kahwin. RM 149/bulan.'
};

export default function PricingPage() {
  const plan = PLANS[0];

  return (
    <main id="main" className="pricing-page">
      <header className="pricing-page__nav">
        <Link href="/" className="landing__brand" aria-label="MajlisMate.ai home">
          <Image src="/logo-mark.svg" width={40} height={40} className="landing__brand-logo" alt="" aria-hidden="true" />
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav aria-label="Primary">
          <Link href="/">Utama</Link>
          <Link href="/chat">Buka app</Link>
        </nav>
      </header>

      <section className="pricing-page__hero">
        <span className="eyebrow">{/* ms */}Harga</span>
        <h1>Pakej lengkap, satu harga</h1>
        <p>Semua ciri dalam satu pakej. Tiada caj tersembunyi. Bayaran melalui ToyyibPay.</p>
      </section>

      <section className="pricing-page__grid" aria-label="Plans">
        <article className="pricing-page__card pricing-page__card--single">
          <span className="landing__plan-badge">Paling popular</span>
          <h2>{plan.nameMs}</h2>
          <p className="pricing-page__tagline">{plan.taglineMs}</p>
          <div className="pricing-page__price">
            <strong>{formatRinggit(plan.priceMonthly)}</strong>
            <span>/ bulan</span>
          </div>
          <ul className="pricing-page__features">
            {plan.features.map((feature) => (
              <li key={feature.en} className="is-included">
                <span aria-hidden="true">✓</span>
                {feature.ms}
              </li>
            ))}
          </ul>
          <Link
            href={`/checkout?plan=${plan.id}`}
            className="primary-action"
          >
            {plan.ctaMs}
          </Link>
        </article>
      </section>

      <section className="pricing-page__faq" aria-label="FAQ">
        <h2>Soalan lazim tentang harga</h2>
        <details>
          <summary>Boleh saya batal?</summary>
          <p>
            {/* ms */}Boleh. Tiada kontrak. Batal dari app bila-bila dan anda
            kekal boleh guna sehingga tamat tempoh langganan.
          </p>
        </details>
        <details>
          <summary>Bagaimana pembayaran berfungsi?</summary>
          <p>
            {/* ms */}Kami gunakan ToyyibPay. Selepas pilih pakej dan isi butiran,
            anda akan diarahkan ke ToyyibPay untuk bayar melalui FPX (bank
            online) atau Boost e-wallet. Selepas berjaya, anda akan diarahkan
            balik ke MajlisMate.
          </p>
        </details>
        <details>
          <summary>Adakah terdapat tempoh percubaan?</summary>
          <p>
            {/* ms */}Ya — anda boleh cuba preview percuma sebelum melanggan.
            Upgrade bila anda sudah bersedia.
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
