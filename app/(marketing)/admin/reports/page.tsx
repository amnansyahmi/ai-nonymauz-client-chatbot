import type { Metadata } from 'next';
import { getReports } from '../../../../lib/affiliate/admin';
import { rm } from '../../../../lib/affiliate/format';

export const metadata: Metadata = { title: 'Laporan — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminReportsPage() {
  const { topAffiliates, totals } = await getReports();
  const profit = totals.revenue - totals.commission;

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Laporan</h1>
        <p>Ringkasan kewangan dan prestasi affiliate.</p>
      </header>

      <section className="admin-kpi-group">
        <h2>Kewangan</h2>
        <div className="admin-kpi-grid">
          <article className="admin-kpi"><span className="admin-kpi__value">{rm(totals.revenue)}</span><span className="admin-kpi__label">Hasil langganan</span></article>
          <article className="admin-kpi"><span className="admin-kpi__value">{rm(totals.commission)}</span><span className="admin-kpi__label">Jumlah komisen</span></article>
          <article className="admin-kpi admin-kpi--ok"><span className="admin-kpi__value">{rm(profit)}</span><span className="admin-kpi__label">Untung kasar</span></article>
        </div>
      </section>

      <section className="admin-kpi-group">
        <h2>Pengguna</h2>
        <div className="admin-kpi-grid">
          <article className="admin-kpi"><span className="admin-kpi__value">{totals.registrations.toLocaleString('ms-MY')}</span><span className="admin-kpi__label">Jumlah pendaftaran</span></article>
          <article className="admin-kpi"><span className="admin-kpi__value">{totals.active_subs.toLocaleString('ms-MY')}</span><span className="admin-kpi__label">Langganan aktif</span></article>
        </div>
      </section>

      <section className="admin-card">
        <h2>Affiliate teratas</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>#</th><th>Affiliate</th><th>Kod</th><th>Rujukan</th><th>Hasil</th></tr>
            </thead>
            <tbody>
              {topAffiliates.length === 0 && (
                <tr><td colSpan={5} className="admin-table__empty">Tiada data lagi.</td></tr>
              )}
              {topAffiliates.map((a, i) => (
                <tr key={String(a.code)}>
                  <td>{i + 1}</td>
                  <td>{String(a.name)}</td>
                  <td><code>{String(a.code)}</code></td>
                  <td>{String(a.referrals)}</td>
                  <td>{rm(a.revenue as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
