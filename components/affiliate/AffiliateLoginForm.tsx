'use client';

import { FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

const DASHBOARD = '/affiliate/dashboard';

type Props = {
  googleEnabled: boolean;
};

export default function AffiliateLoginForm({ googleEnabled }: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const validEmail = /.+@.+\..+/.test(email);

  function handleGoogle() {
    setBusy(true);
    if (googleEnabled) {
      void signIn('google', { callbackUrl: DASHBOARD });
    } else {
      // Demo fallback: no Google credentials configured, so onboard a mock
      // Google identity through the email/credentials provider.
      void signIn('email', {
        email: 'demo.google@majlismate.ai',
        name: 'Google Demo',
        callbackUrl: DASHBOARD
      });
    }
  }

  function handleEmail(event: FormEvent) {
    event.preventDefault();
    if (!validEmail) return;
    setBusy(true);
    void signIn('email', {
      email: email.trim(),
      name: email.trim().split('@')[0],
      callbackUrl: DASHBOARD
    });
  }

  return (
    <div className="affiliate-apply__card affiliate-login__card">
      <span className="eyebrow">{/* ms */}Log masuk affiliate</span>
      <h1>Selamat kembali</h1>
      <p>Log masuk untuk lihat dashboard, komisen dan link rujukan anda.</p>

      <button
        type="button"
        className="affiliate-login__google"
        onClick={handleGoogle}
        disabled={busy}
      >
        <span className="affiliate-login__google-icon" aria-hidden="true">G</span>
        Teruskan dengan Google
      </button>

      <div className="affiliate-login__divider"><span>atau</span></div>

      <form className="affiliate-apply__form" onSubmit={handleEmail}>
        <label className="affiliate-apply__field">
          <span>E-mel</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@email.com"
            autoComplete="email"
            required
          />
        </label>
        <button type="submit" className="primary-action" disabled={!validEmail || busy}>
          Log masuk dengan e-mel
        </button>
      </form>

      {!googleEnabled && (
        <p className="affiliate-login__demo-note">
          Mod demo: log masuk tanpa kata laluan. Sambungkan Google OAuth dalam
          <code> .env</code> untuk pengesahan sebenar.
        </p>
      )}
    </div>
  );
}
