import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { PLANS } from '../../lib/payments/plans';
import ScrollReveal from '../../components/marketing/ScrollReveal';
import ScrollProgress from '../../components/marketing/ScrollProgress';
import InteractiveHero from '../../components/marketing/InteractiveHero';
import FloatingShapes from '../../components/marketing/FloatingShapes';
import AnimatedCounter from '../../components/marketing/AnimatedCounter';
import TestimonialCarousel from '../../components/marketing/TestimonialCarousel';
import FeatureShowcase from '../../components/marketing/FeatureShowcase';
import ConfettiLink from '../../components/marketing/ConfettiLink';

export const metadata: Metadata = {
  title: 'MajlisMate.ai — Pembantu AI untuk rancang majlis kahwin',
  description:
    'MajlisMate.ai ialah pembantu peribadi AI untuk merancang majlis kahwin. Senarai semak pintar, bajet, vendor dan voice mode dalam satu aplikasi.',
  keywords: ['wedding planner', 'majlis kahwin', 'AI assistant', 'ToyyibPay', 'Malaysia'],
  openGraph: {
    title: 'MajlisMate.ai — Pembantu AI untuk rancang majlis kahwin',
    description:
      'Rancang majlis kahwin dengan AI — senarai semak, bajet, vendor, voice mode dan WhatsApp dalam satu tempat.',
    type: 'website',
    locale: 'ms_MY'
  }
};

const FEATURES = [
  {
    icon: '💬',
    titleMs: 'Chat AI pintar',
    titleEn: 'Smart AI chat',
    bodyMs: 'Tanya apa-apa pasal majlis kahwin. AI kami jawab dalam Bahasa Melayu atau English.',
    bodyEn: 'Ask anything about your wedding. Our AI replies in Bahasa Melayu or English.'
  },
  {
    icon: '📋',
    titleMs: 'Senarai semak automatik',
    titleEn: 'Auto checklist',
    bodyMs: 'Cakap je apa yang anda nak — AI buatkan checklist majlis untuk anda.',
    bodyEn: 'Just say what you want — AI builds your wedding checklist for you.'
  },
  {
    icon: '💰',
    titleMs: 'Bajet pintar',
    titleEn: 'Smart budget',
    bodyMs: 'Track perbelanjaan, dapat amaran kalau terlebih bajet, pecahkan ikut kategori.',
    bodyEn: 'Track spending, get over-budget alerts, break down by category.'
  },
  {
    icon: '🏛️',
    titleMs: 'Vendor berdekatan',
    titleEn: 'Nearby vendors',
    bodyMs: 'Cari jurugambar, katering, dewan dan lebih. Draf WhatsApp terus dari app.',
    bodyEn: 'Find photographers, caterers, halls and more. Draft WhatsApp straight from the app.'
  },
  {
    icon: '🎤',
    titleMs: 'Voice mode',
    titleEn: 'Voice mode',
    bodyMs: 'Tak nak taip? Cakap je. AI dengar dan jawab dalam Bahasa Melayu.',
    bodyEn: 'Don\'t want to type? Just speak. AI listens and replies in Bahasa Melayu.'
  },
  {
    icon: '👥',
    titleMs: 'Senarai tetamu',
    titleEn: 'Guest list',
    bodyMs: 'Urus RSVP, jemputan WhatsApp, kira headcount untuk katering.',
    bodyEn: 'Manage RSVPs, WhatsApp invitations, count headcount for catering.'
  }
];

const TRUST_SIGNALS = [
  { label: 'Pembayaran selamat ToyyibPay', icon: '🔒' },
  { label: 'Data disimpan di Malaysia', icon: '🇲🇾' },
  { label: 'Batal bila-bila', icon: '↩️' },
  { label: 'Sokongan Bahasa Melayu', icon: '💬' }
];

export default function LandingPage() {
  return (
    <main id="main" className="landing">
      <ScrollProgress />
      <header className="landing__nav">
        <Link href="/" className="landing__brand" aria-label="MajlisMate.ai home">
          <Image src="/logo-mark.svg" width={40} height={40} className="landing__brand-logo" alt="" aria-hidden="true" />
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav className="landing__nav-links" aria-label="Primary">
          <Link href="#features">{/* ms */}Ciri-ciri</Link>
          <Link href="#pricing">{/* ms */}Harga</Link>
          <Link href="#faq">{/* ms */}Soalan</Link>
          <Link href="/preview" className="landing__nav-cta">
            {PLANS[0].ctaMs}
          </Link>
        </nav>
      </header>

      <section className="landing__hero">
        <FloatingShapes />
        <div className="landing__hero-copy">
          <span className="eyebrow">{/* ms */}Untuk bakal pengantin di Malaysia 🇲🇾</span>
          <h1>
            {/* ms */}Rancang majlis kahwin dengan AI —{' '}
            <span className="landing__hero-accent">senang, cepat, mesra</span>
          </h1>
          <p>
            {/* ms */}MajlisMate.ai ialah pembantu peribadi 24/7 anda. Dari
            checklist sampai bajet, dari cari vendor sampai hantar jemputan
            WhatsApp — semua dalam satu aplikasi mudah.
          </p>
          <div className="landing__hero-actions">
            <ConfettiLink href="/preview" className="primary-action landing__hero-primary">
              {/* ms */}Cuba percuma sekarang
            </ConfettiLink>
            <Link href="#pricing" className="utility-action">
              {/* ms */}Lihat harga
            </Link>
          </div>
          <ul className="landing__trust" aria-label="Trust signals">
            {TRUST_SIGNALS.map((signal) => (
              <li key={signal.label}>
                <span aria-hidden="true">{signal.icon}</span>
                {signal.label}
              </li>
            ))}
          </ul>
        </div>
        <InteractiveHero>
          <aside className="landing__hero-card" aria-hidden="true">
            <div className="landing__hero-window">
              <div className="landing__hero-bar">
                <span /> <span /> <span />
              </div>
              <div className="landing__hero-bubble landing__hero-bubble--assistant">
                <p>Hai! Saya MajlisMate 💕</p>
                <p>Saya boleh bantu rancang majlis kahwin kamu. Nak tanya apa?</p>
              </div>
              <div className="landing__hero-bubble landing__hero-bubble--user">
                <p>Boleh tolong buatkan checklist tempahan dewan?</p>
              </div>
              <div className="landing__hero-typing">
                <span className="landing__hero-typing-dot" />
                <span className="landing__hero-typing-dot" />
                <span className="landing__hero-typing-dot" />
              </div>
              <div className="landing__hero-bubble landing__hero-bubble--assistant landing__hero-bubble--delayed">
                <p>Sure! Saya dah buatkan 12 tugasan untuk tempahan dewan kamu:</p>
                <ul>
                  <li>✅ Senarai 5 dewan pilihan</li>
                  <li>✅ Banding harga & pakej</li>
                  <li>✅ Tempahan lawatan tapak</li>
                </ul>
                <p>Nak saya cari vendor berdekatan?</p>
              </div>
            </div>
          </aside>
        </InteractiveHero>
      </section>

      <section className="landing__stats" data-reveal>
        <div className="landing__stats-grid">
          <div className="landing__stat">
            <span className="landing__stat-icon">📋</span>
            <div className="landing__stat-value">
              <AnimatedCounter target={50} suffix="+" />
            </div>
            <p className="landing__stat-label">Senarai semak automatik</p>
          </div>
          <div className="landing__stat">
            <span className="landing__stat-icon">💬</span>
            <div className="landing__stat-value">BM & EN</div>
            <p className="landing__stat-label">Bahasa Melayu & English</p>
          </div>
          <div className="landing__stat">
            <span className="landing__stat-icon">⚡</span>
            <div className="landing__stat-value">
              <AnimatedCounter target={5} suffix=" min" />
            </div>
            <p className="landing__stat-label">Mula merancang</p>
          </div>
        </div>
      </section>

      <section className="landing__steps" aria-label="Cara ia berfungsi">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Cara ia berfungsi</span>
          <h2>Tiga langkah ke majlis idaman</h2>
        </div>
        <div className="landing__steps-grid">
          <div className="landing__steps-line" data-reveal aria-hidden="true" />
          <article className="landing__step" data-reveal style={{ animationDelay: '0ms' }}>
            <span className="landing__step-num">1</span>
            <span className="landing__step-icon" aria-hidden="true">💬</span>
            <h3>Cerita tentang majlis</h3>
            <p>Beritahu tarikh, negeri, bajet dan jumlah tetamu — dalam BM atau English.</p>
          </article>
          <article className="landing__step" data-reveal style={{ animationDelay: '120ms' }}>
            <span className="landing__step-num">2</span>
            <span className="landing__step-icon" aria-hidden="true">✨</span>
            <h3>AI susun pelan anda</h3>
            <p>Dapat checklist, bajet dan cadangan vendor automatik dalam beberapa saat.</p>
          </article>
          <article className="landing__step" data-reveal style={{ animationDelay: '240ms' }}>
            <span className="landing__step-num">3</span>
            <span className="landing__step-icon" aria-hidden="true">🎉</span>
            <h3>Mula urus dengan yakin</h3>
            <p>Track progress, hantar jemputan WhatsApp, dan jimat berjam-jam masa.</p>
          </article>
        </div>
      </section>

      <section id="features" className="landing__features" aria-label="Features">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Kenapa pilih MajlisMate?</span>
          <h2>Semua yang anda perlukan, satu app</h2>
        </div>
        <div className="landing__features-grid">
          {FEATURES.map((feature, index) => (
            <article
              key={feature.titleEn}
              className="landing__feature-card"
              data-reveal
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="landing__feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.titleMs}</h3>
              <p>{feature.bodyMs}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__showcase" aria-label="Lihat dalam app">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Tengok sendiri</span>
          <h2>Satu app, semua keperluan majlis</h2>
        </div>
        <div data-reveal>
          <FeatureShowcase />
        </div>
      </section>

      <section className="landing__testimonials" aria-label="Testimonials">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Kata mereka</span>
          <h2>Pasangan yang dah cuba MajlisMate</h2>
        </div>
        <div data-reveal>
          <TestimonialCarousel />
        </div>
      </section>

      <section id="pricing" className="landing__pricing" aria-label="Pricing">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Harga</span>
          <h2>Pakej lengkap, satu harga</h2>
          <p>Semua ciri dalam satu pakej. Tiada caj tersembunyi.</p>
        </div>
        <div className="landing__pricing-single" data-reveal>
          <article className="landing__plan-card landing__plan-card--single">
            <span className="landing__plan-badge">Paling popular</span>
            <h3>{PLANS[0].nameMs}</h3>
            <p className="landing__plan-tagline">{PLANS[0].taglineMs}</p>
            <div className="landing__plan-price">
              <strong>RM {PLANS[0].priceMonthly}</strong>
              <span>/ bulan</span>
            </div>
            <ul className="landing__plan-features">
            {PLANS[0].features.map((feature) => (
              <li key={feature.en} className="is-included">
                <span aria-hidden="true">✓</span>
                {feature.ms}
              </li>
            ))}
            </ul>
            <Link
              href={`/checkout?plan=${PLANS[0].id}`}
              className="primary-action"
            >
              {PLANS[0].ctaMs}
            </Link>
          </article>
        </div>
      </section>

      <section id="faq" className="landing__faq" aria-label="FAQ">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Soalan lazim</span>
          <h2>Soalan yang orang selalu tanya</h2>
        </div>
        <div className="landing__faq-grid" data-reveal>
          <details className="landing__faq-item">
            <summary>Adakah data saya selamat?</summary>
            <p>
              {/* ms */}Ya. Data anda disimpan di peranti anda secara lalai. Untuk
              pelan berbayar, kami hanya simpan maklumat asas akaun dan sejarah
              pembayaran di ToyyibPay — tiada vendor atau tetamu dihantar ke
              pihak ketiga.
            </p>
          </details>
          <details className="landing__faq-item">
            <summary>Bagaimana cara pembayaran?</summary>
            <p>
              {/* ms */}Kami gunakan ToyyibPay — gateway pembayaran tempatan
              Malaysia. Anda boleh bayar melalui FPX (online banking), kad
              debit, atau Boost e-wallet.
            </p>
          </details>
          <details className="landing__faq-item">
            <summary>Boleh saya batal langganan?</summary>
            <p>
              {/* ms */}Boleh, bila-bila. Tiada kontrak. Pembatalan berkuat kuasa
              serta-merta, dan anda kekal boleh guna app sehingga tamat tempoh
              yang sudah dibayar.
            </p>
          </details>
          <details className="landing__faq-item">
            <summary>Adakah Bahasa Melayu disokong?</summary>
            <p>
              {/* ms */}Sudah tentu! AI kami dilatih khas untuk Bahasa Melayu
              pasar, termasuk loghat dan istilah majlis. Voice mode pun
              guna Bahasa Melayu.
            </p>
          </details>
        </div>
      </section>

      <section className="landing__cta" data-reveal>
        <h2>Bermula cuma 5 minit</h2>
        <p>
          {/* ms */}Daftar percuma hari ini. Tiada kad kredit diperlukan.
          Anda boleh upgrade bila-bila.
        </p>
        <div className="landing__cta-actions">
          <ConfettiLink href="/preview" className="primary-action">
            {/* ms */}Cuba percuma sekarang
          </ConfettiLink>
          <Link href="/checkout?plan=sehari-hari" className="utility-action">
            {/* ms */}Langgan Sehari-hari
          </Link>
        </div>
      </section>

      <footer className="landing__footer">
        <div>
          <strong>MajlisMate.ai</strong>
          <p>© {new Date().getFullYear()} MajlisMate.ai — AI pembantu majlis.</p>
        </div>
        <div>
          <Link href="/chat">Buka app</Link>
          <Link href="#pricing">Harga</Link>
          <Link href="#faq">Soalan lazim</Link>
        </div>
      </footer>

      <ScrollReveal />
    </main>
  );
}
