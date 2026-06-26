import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../lib/admin/session';
import { adminLogin } from './actions';

export const metadata: Metadata = { title: 'Log masuk Admin — MajlisMate.ai' };
export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getAdminSession();
  if (session) redirect('/admin');
  const { error } = await searchParams;

  return (
    <main id="main" className="landing affiliate-page">
      <header className="landing__nav">
        <Link href="/" className="landing__brand" aria-label="MajlisMate.ai home">
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav className="landing__nav-links" aria-label="Primary">
          <Link href="/">Utama</Link>
        </nav>
      </header>

      <section className="landing__hero affiliate-page__hero affiliate-page__apply">
        <div className="affiliate-apply__card affiliate-login__card">
          <span className="eyebrow">{/* ms */}Panel Admin</span>
          <h1>Log masuk admin</h1>
          <p>Akses panel pentadbiran MajlisMate.ai.</p>

          {error && (
            <p className="affiliate-apply__error" role="alert">
              E-mel ini tiada akses admin.
            </p>
          )}

          <form className="affiliate-apply__form" action={adminLogin}>
            <label className="affiliate-apply__field">
              <span>E-mel admin</span>
              <input type="email" name="email" placeholder="admin@majlismate.ai" autoComplete="email" required />
            </label>
            <label className="affiliate-apply__field">
              <span>Kata laluan</span>
              <input type="password" name="password" placeholder="••••••••" autoComplete="current-password" />
            </label>
            <button type="submit" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block">Log masuk</button>
          </form>

          <p className="affiliate-login__demo-note">
            Mod sementara: mana-mana kata laluan diterima untuk e-mel admin yang berdaftar.
          </p>
        </div>
      </section>
    </main>
  );
}
