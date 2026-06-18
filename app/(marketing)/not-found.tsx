import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="app-not-found" role="status">
      <div className="app-not-found__card">
        <p className="eyebrow">404 · Halaman tidak dijumpai</p>
        <h1>Maaf, kami tak dapat jumpa halaman tu</h1>
        <p>
          Mungkin link tu dah tukar, atau halaman tu memang tak wujud. Jom kembali ke MajlisMate.ai.
        </p>
        <div className="app-not-found__actions">
          <Link className="primary-action" href="/chat">
            Buka Planner
          </Link>
          <Link className="utility-action" href="/">
            Halaman utama
          </Link>
        </div>
      </div>
    </div>
  );
}
