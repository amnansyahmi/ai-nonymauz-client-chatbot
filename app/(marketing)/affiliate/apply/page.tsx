'use client';

import { FormEvent, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { submitApplication } from './actions';

type FormState = {
  name: string;
  email: string;
  phone: string;
  social: string;
  accepted: boolean;
};

const EMPTY: FormState = { name: '', email: '', phone: '', social: '', accepted: false };

export default function AffiliateApplyPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [result, setResult] = useState<{ code: string; link: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submitted = result !== null;

  const canSubmit = form.name.trim().length > 1 && /.+@.+\..+/.test(form.email) && form.accepted;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await submitApplication(form);
      if (res.ok) {
        setResult({ code: res.code, link: res.link });
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <main id="main" className="landing affiliate-page">
      <header className="landing__nav">
        <Link href="/" className="landing__brand" aria-label="MajlisMate.ai home">
          <Image src="/logo-mark.svg" width={40} height={40} className="landing__brand-logo" alt="" aria-hidden="true" />
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav className="landing__nav-links" aria-label="Primary">
          <Link href="/affiliate">Program Affiliate</Link>
          <Link href="/" className="landing__nav-cta">Utama</Link>
        </nav>
      </header>

      <section className="landing__hero affiliate-page__hero affiliate-page__apply">
        {!submitted ? (
          <div className="affiliate-apply__card">
            <span className="eyebrow">{/* ms */}Daftar sebagai affiliate</span>
            <h1>Mohon sertai program affiliate</h1>
            <p>Isi maklumat ringkas di bawah. Permohonan akan disemak sebelum diluluskan.</p>

            <form className="affiliate-apply__form" onSubmit={handleSubmit}>
              <label className="affiliate-apply__field">
                <span>Nama penuh</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="cth. Amnan Syahmi"
                  required
                />
              </label>

              <label className="affiliate-apply__field">
                <span>E-mel</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="nama@email.com"
                  required
                />
              </label>

              <label className="affiliate-apply__field">
                <span>Nombor telefon</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="011-2345 6789"
                />
              </label>

              <label className="affiliate-apply__field">
                <span>Pautan media sosial</span>
                <input
                  type="url"
                  value={form.social}
                  onChange={(e) => setForm((f) => ({ ...f, social: e.target.value }))}
                  placeholder="https://instagram.com/anda"
                />
              </label>

              <label className="affiliate-apply__check">
                <input
                  type="checkbox"
                  checked={form.accepted}
                  onChange={(e) => setForm((f) => ({ ...f, accepted: e.target.checked }))}
                />
                <span>Saya bersetuju dengan terma & syarat program affiliate.</span>
              </label>

              {error && <p className="affiliate-apply__error" role="alert">{error}</p>}

              <button type="submit" className="primary-action" disabled={!canSubmit || pending}>
                {pending ? 'Menghantar…' : 'Hantar permohonan'}
              </button>
            </form>
          </div>
        ) : (
          <div className="affiliate-apply__card affiliate-apply__success">
            <span className="affiliate-apply__success-icon" aria-hidden="true">🎉</span>
            <h1>Permohonan diterima!</h1>
            <p>
              Terima kasih, {form.name.trim().split(/\s+/)[0]}. Permohonan anda kini
              <strong> menunggu kelulusan</strong>. Kami akan hubungi anda melalui {form.email}.
            </p>
            <div className="affiliate-apply__code-card">
              <span>Kod rujukan anda</span>
              <strong>{result?.code}</strong>
              <code>{result?.link}</code>
            </div>
            <div className="landing__cta-actions">
              <Link href="/affiliate/login" className="primary-action">Log masuk ke dashboard</Link>
              <Link href="/affiliate" className="utility-action">Kembali ke program</Link>
            </div>
          </div>
        )}
      </section>

      <footer className="landing__footer">
        <div>
          <strong>MajlisMate.ai</strong>
          <p>© {new Date().getFullYear()} MajlisMate.ai — AI pembantu majlis.</p>
        </div>
        <div>
          <Link href="/">Utama</Link>
          <Link href="/affiliate">Program Affiliate</Link>
        </div>
      </footer>
    </main>
  );
}
