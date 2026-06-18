'use client';

import { useEffect } from 'react';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('MajlisMate.ai crashed:', error);
  }, [error]);

  return (
    <div className="app-error" role="alert">
      <div className="app-error__card">
        <p className="eyebrow">Something went wrong</p>
        <h1>Maaf, ada masalah teknikal</h1>
        <p>
          Planner kami menghadapi ralat yang tidak dijangka. Cuba semula, atau kembali ke halaman
          utama.
        </p>
        {error.digest ? (
          <p className="app-error__digest">
            <span>Error ID:</span>
            <code>{error.digest}</code>
          </p>
        ) : null}
        <div className="app-error__actions">
          <button type="button" className="primary-action" onClick={reset}>
            Cuba lagi
          </button>
          <a className="utility-action" href="/chat">
            Buka chat
          </a>
        </div>
      </div>
    </div>
  );
}
