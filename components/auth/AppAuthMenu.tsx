'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

/**
 * Auth strip for the planner sidebar footer.
 *
 * Signed out: Log masuk / Daftar entries that route to the cloud planner.
 * Signed in:  shows the email and a sign-out action. Data on /planner is saved
 *             under the signed-in email.
 */
export default function AppAuthMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="gpt-auth-menu gpt-auth-menu--loading" aria-hidden="true" />;
  }

  if (session?.user) {
    const label = session.user.email || session.user.name || 'Akaun';
    return (
      <div className="gpt-auth-menu">
        <div className="gpt-auth-account">
          <span className="gpt-auth-account__dot" aria-hidden="true" />
          <span className="gpt-auth-account__email" title={label}>{label}</span>
        </div>
        <button
          type="button"
          className="gpt-auth-link gpt-auth-link--ghost"
          onClick={() => void signOut({ callbackUrl: '/chat' })}
        >
          Log keluar
        </button>
      </div>
    );
  }

  return (
    <div className="gpt-auth-menu">
      <Link href="/login" className="gpt-auth-link gpt-auth-link--ghost">Log masuk</Link>
      <Link href="/signup" className="gpt-auth-link gpt-auth-link--solid">Daftar &amp; simpan</Link>
    </div>
  );
}
