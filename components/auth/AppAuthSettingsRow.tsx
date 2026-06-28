'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

/**
 * Account row for the settings / couple-profile drawer.
 * Signed in: shows the email + a log-out button.
 * Signed out: nudges to log in so data is saved to the cloud.
 */
export default function AppAuthSettingsRow({ language }: { language: 'ms' | 'en' }) {
  const { data: session, status } = useSession();
  const isMs = language === 'ms';

  if (status === 'loading') return null;

  if (session?.user) {
    const email = session.user.email || session.user.name || (isMs ? 'Akaun' : 'Account');
    return (
      <div className="settings-auth-row">
        <div className="settings-auth-row__info">
          <span className="settings-auth-row__label">{isMs ? 'Log masuk sebagai' : 'Signed in as'}</span>
          <strong className="settings-auth-row__email" title={email}>{email}</strong>
        </div>
        <button
          type="button"
          className="settings-logout-btn"
          onClick={() => void signOut({ callbackUrl: '/chat' })}
        >
          {isMs ? 'Log keluar' : 'Log out'}
        </button>
      </div>
    );
  }

  return (
    <div className="settings-auth-row">
      <div className="settings-auth-row__info">
        <span className="settings-auth-row__label">{isMs ? 'Belum log masuk' : 'Not signed in'}</span>
        <span className="settings-auth-row__hint">
          {isMs ? 'Log masuk untuk simpan data dalam awan.' : 'Log in to save your data to the cloud.'}
        </span>
      </div>
      <Link href="/login" className="settings-login-link">
        {isMs ? 'Log masuk' : 'Log in'}
      </Link>
    </div>
  );
}
