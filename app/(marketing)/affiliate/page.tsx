import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import ScrollReveal from '../../../components/marketing/ScrollReveal';

export const metadata: Metadata = {
  title: 'Program Affiliate — MajlisMate.ai',
  description:
    'Jana pendapatan dengan kongsi MajlisMate.ai. Komisen sehingga 20% setiap langganan, bayaran berulang, dan ganjaran berperingkat. Daftar sebagai affiliate hari ini.',
  openGraph: {
    title: 'Program Affiliate MajlisMate.ai — jana pendapatan dengan kongsi',
    description:
      'Kongsi link rujukan anda, bantu bakal pengantin rancang majlis, dan dapat komisen sehingga 20% setiap langganan.',
    type: 'website',
    locale: 'ms_MY'
  }
};

// How the program works — 3 simple steps, mirrors the landing "steps" pattern.
const STEPS = [
  {
    icon: '📝',
    title: 'Daftar & dapat kod',
    body: 'Mohon sebagai affiliate, dapat kod rujukan unik dan link peribadi anda dalam beberapa minit.'
  },
  {
    icon: '📣',
    title: 'Kongsi link anda',
    body: 'Kongsi di WhatsApp, Instagram, TikTok atau Facebook guna poster dan caption siap sedia.'
  },
  {
    icon: '💰',
    title: 'Dapat komisen',
    body: 'Setiap langganan melalui link anda jana komisen — dibayar terus ke akaun bank atau DuitNow.'
  }
];

// Commission structure straight from the program brief, framed for affiliates.
const COMMISSIONS = [
  {
    icon: '💵',
    title: 'Komisen tetap',
    value: 'RM30',
    body: 'setiap langganan baharu yang sah melalui link anda.'
  },
  {
    icon: '📈',
    title: 'Komisen peratusan',
    value: '20%',
    body: 'daripada nilai langganan — pilihan terbaik untuk pakej premium.'
  },
  {
    icon: '🔁',
    title: 'Komisen berulang',
    value: '10%',
    body: 'setiap kali pelanggan anda perbaharui langganan. Pendapatan pasif.'
  }
];

// Tier-based bonus — the more you sell, the higher the rate.
const TIERS = [
  { range: '1–10 jualan', rate: '10%' },
  { range: '11–30 jualan', rate: '15%' },
  { range: '31+ jualan', rate: '20%' }
];

// What affiliates get access to once approved.
const TOOLS = [
  {
    icon: '📊',
    title: 'Dashboard masa nyata',
    body: 'Jejak klik, pendaftaran, langganan dan komisen — dikemas kini langsung.'
  },
  {
    icon: '🎨',
    title: 'Bahan pemasaran',
    body: 'Poster, banner, video, reel, template WhatsApp dan caption siap pakai.'
  },
  {
    icon: '🔗',
    title: 'Link & QR pintar',
    body: 'Link pendek, kod QR dan butang kongsi satu-klik ke semua platform sosial.'
  },
  {
    icon: '🏆',
    title: 'Leaderboard & lencana',
    body: 'Naik peringkat Gangsa hingga Platinum dan menang ganjaran affiliate terbaik bulanan.'
  },
  {
    icon: '🔔',
    title: 'Notifikasi segera',
    body: 'Diberitahu setiap kali ada rujukan baharu, langganan atau komisen diluluskan.'
  },
  {
    icon: '🤖',
    title: 'Bantuan AI eksklusif',
    body: 'AI jana caption, cadang masa posting terbaik dan kenal pasti prospek panas.'
  }
];

export default function AffiliatePage() {
  return (
    <main id="main" className="landing affiliate-page">
      <header className="landing__nav">
        <Link href="/" className="landing__brand" aria-label="MajlisMate.ai home">
          <Image src="/logo-mark.svg" width={40} height={40} className="landing__brand-logo" alt="" aria-hidden="true" />
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav className="landing__nav-links" aria-label="Primary">
          <Link href="/">Utama</Link>
          <Link href="#cara">Cara berfungsi</Link>
          <Link href="#komisen">Komisen</Link>
          <Link href="/affiliate/login">Log masuk</Link>
          <Link href="#daftar" className="landing__nav-cta">
            Daftar affiliate
          </Link>
        </nav>
      </header>

      <section className="landing__hero affiliate-page__hero">
        <div className="landing__hero-copy">
          <span className="eyebrow">{/* ms */}Program Affiliate MajlisMate.ai 🤝</span>
          <h1>
            {/* ms */}Jana pendapatan dengan{' '}
            <span className="landing__hero-accent">kongsi MajlisMate</span>
          </h1>
          <p>
            {/* ms */}Bantu bakal pengantin rancang majlis impian mereka — dan
            dapat komisen sehingga <strong>20% setiap langganan</strong>, ditambah
            bayaran berulang setiap pembaharuan. Tiada kos untuk sertai.
          </p>
          <div className="landing__hero-actions">
            <Link href="#daftar" className="primary-action landing__hero-primary">
              {/* ms */}Daftar sebagai affiliate
            </Link>
            <Link href="#komisen" className="utility-action">
              {/* ms */}Lihat kadar komisen
            </Link>
          </div>
          <ul className="landing__trust" aria-label="Kelebihan program">
            <li><span aria-hidden="true">💸</span>Komisen sehingga 20%</li>
            <li><span aria-hidden="true">🔁</span>Bayaran berulang</li>
            <li><span aria-hidden="true">🏦</span>Bayaran DuitNow / bank</li>
            <li><span aria-hidden="true">🆓</span>Percuma untuk sertai</li>
          </ul>
        </div>
      </section>

      <section id="cara" className="landing__steps" aria-label="Cara ia berfungsi">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Cara ia berfungsi</span>
          <h2>Tiga langkah untuk mula jana komisen</h2>
        </div>
        <div className="landing__steps-grid">
          <div className="landing__steps-line" data-reveal aria-hidden="true" />
          {STEPS.map((step, index) => (
            <article
              key={step.title}
              className="landing__step"
              data-reveal
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <span className="landing__step-num">{index + 1}</span>
              <span className="landing__step-icon" aria-hidden="true">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="komisen" className="landing__features" aria-label="Struktur komisen">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Struktur komisen</span>
          <h2>Pelbagai cara untuk dapat bayaran</h2>
          <p>Pilih yang paling sesuai dengan gaya promosi anda.</p>
        </div>
        <div className="landing__features-grid">
          {COMMISSIONS.map((item, index) => (
            <article
              key={item.title}
              className="landing__feature-card affiliate-page__commission-card"
              data-reveal
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="landing__feature-icon" aria-hidden="true">{item.icon}</span>
              <strong className="affiliate-page__commission-value">{item.value}</strong>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="affiliate-page__tiers" data-reveal>
          <div className="landing__section-head">
            <span className="eyebrow">{/* ms */}Ganjaran berperingkat</span>
            <h3>Lebih banyak jualan, lebih tinggi kadar</h3>
          </div>
          <ul className="affiliate-page__tier-list" aria-label="Kadar berperingkat">
            {TIERS.map((tier) => (
              <li key={tier.range} className="affiliate-page__tier">
                <span className="affiliate-page__tier-range">{tier.range}</span>
                <span className="affiliate-page__tier-rate">{tier.rate}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing__features" aria-label="Alat affiliate">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Semua yang anda perlukan</span>
          <h2>Alat untuk promosi dengan yakin</h2>
        </div>
        <div className="landing__features-grid">
          {TOOLS.map((tool, index) => (
            <article
              key={tool.title}
              className="landing__feature-card"
              data-reveal
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <span className="landing__feature-icon" aria-hidden="true">{tool.icon}</span>
              <h3>{tool.title}</h3>
              <p>{tool.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__faq" aria-label="Soalan lazim">
        <div className="landing__section-head" data-reveal>
          <span className="eyebrow">{/* ms */}Soalan lazim</span>
          <h2>Soalan tentang program affiliate</h2>
        </div>
        <div className="landing__faq-grid" data-reveal>
          <details className="landing__faq-item">
            <summary>Siapa boleh jadi affiliate?</summary>
            <p>
              {/* ms */}Sesiapa sahaja — pelan wedding, influencer, vendor majlis,
              atau pasangan yang dah guna MajlisMate. Daftar percuma dan tunggu
              kelulusan ringkas.
            </p>
          </details>
          <details className="landing__faq-item">
            <summary>Bagaimana komisen dikira?</summary>
            <p>
              {/* ms */}Setiap langganan sah melalui link rujukan anda jana komisen
              ikut struktur pilihan — tetap RM30, 20% nilai langganan, atau kadar
              berperingkat sehingga 20%. Pembaharuan beri 10% berulang.
            </p>
          </details>
          <details className="landing__faq-item">
            <summary>Berapa lama tempoh penjejakan?</summary>
            <p>
              {/* ms */}Cookie rujukan kekal sehingga 90 hari. Jika pelanggan
              melanggan dalam tempoh itu, komisen tetap dikira untuk anda.
            </p>
          </details>
          <details className="landing__faq-item">
            <summary>Bagaimana saya dibayar?</summary>
            <p>
              {/* ms */}Melalui pemindahan bank atau DuitNow selepas komisen
              diluluskan dan cukup jumlah pengeluaran minimum. Semua resit dan
              sejarah bayaran ada dalam dashboard.
            </p>
          </details>
        </div>
      </section>

      <section id="daftar" className="landing__cta" data-reveal>
        <h2>Sedia untuk mula jana pendapatan?</h2>
        <p>
          {/* ms */}Daftar sebagai affiliate MajlisMate.ai hari ini — percuma,
          tiada komitmen. Dapat kod rujukan anda dan mula kongsi.
        </p>
        <div className="landing__cta-actions">
          <Link href="/affiliate/apply" className="primary-action">
            {/* ms */}Daftar sebagai affiliate
          </Link>
          <Link href="/" className="utility-action">
            {/* ms */}Kembali ke utama
          </Link>
        </div>
      </section>

      <footer className="landing__footer">
        <div>
          <strong>MajlisMate.ai</strong>
          <p>© {new Date().getFullYear()} MajlisMate.ai — AI pembantu majlis.</p>
        </div>
        <div>
          <Link href="/">Utama</Link>
          <Link href="/affiliate">Program Affiliate</Link>
          <Link href="/chat">Buka app</Link>
        </div>
      </footer>

      <ScrollReveal />
    </main>
  );
}
