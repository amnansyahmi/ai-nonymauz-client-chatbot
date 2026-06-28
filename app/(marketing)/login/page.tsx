import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, isGoogleConfigured, isEmailConfigured } from '@/auth';
import AppAuthForm from '@/components/auth/AppAuthForm';

export const metadata: Metadata = {
  title: 'Log masuk — MajlisMate.ai',
  description: 'Log masuk untuk menyimpan rancangan majlis anda dalam awan.'
};

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/planner');

  return (
    <main id="main" className="landing affiliate-page">
      <header className="landing__nav">
        <Link href="/" className="landing__brand" aria-label="MajlisMate.ai home">
          <Image src="/logo-mark.svg" width={40} height={40} className="landing__brand-logo" alt="" aria-hidden="true" />
          <strong>MajlisMate.ai</strong>
        </Link>
        <nav className="landing__nav-links" aria-label="Primary">
          <Link href="/chat">Cuba percuma</Link>
          <Link href="/signup" className="landing__nav-cta">Daftar</Link>
        </nav>
      </header>

      <section className="landing__hero affiliate-page__hero affiliate-page__apply">
        <AppAuthForm mode="login" googleEnabled={isGoogleConfigured} emailConfigured={isEmailConfigured} />
      </section>

      <footer className="landing__footer">
        <div>
          <strong>MajlisMate.ai</strong>
          <p>© {new Date().getFullYear()} MajlisMate.ai — AI pembantu majlis.</p>
        </div>
        <div>
          <Link href="/">Utama</Link>
          <Link href="/chat">Cuba percuma</Link>
        </div>
      </footer>
    </main>
  );
}
