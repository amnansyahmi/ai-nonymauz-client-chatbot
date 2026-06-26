import type { Metadata } from 'next';
import { listCustomers } from '@/lib/affiliate/admin';
import { rm, fmtDate, statusMeta } from '@/lib/affiliate/format';
import { Badge } from '@/components/ui';

export const metadata: Metadata = { title: 'Pelanggan — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const rows = await listCustomers();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Pelanggan dirujuk</h1>
        <p>Pelanggan yang datang melalui pautan affiliate.</p>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Pakej</th>
              <th>Nilai</th>
              <th>Status</th>
              <th>Dirujuk oleh</th>
              <th>Tarikh</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="admin-table__empty">Tiada pelanggan dirujuk lagi.</td></tr>
            )}
            {rows.map((r, i) => {
              const s = statusMeta(String(r.status));
              return (
                <tr key={i}>
                  <td>
                    {String(r.customer_name ?? 'Tanpa nama')}
                    <span className="admin-sub">{String(r.customer_email ?? '')}</span>
                  </td>
                  <td>{String(r.package_name ?? '—')}</td>
                  <td>{rm(r.amount as number)}</td>
                  <td><Badge variant={s.variant}>{s.label}</Badge></td>
                  <td><code>{String(r.affiliate_code)}</code></td>
                  <td>{fmtDate(r.created_at as string)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="admin-note">
        Senarai ini menunjukkan pelanggan yang dirujuk affiliate. Pendaftaran organik (tanpa rujukan)
        belum disimpan dalam pangkalan data.
      </p>
    </div>
  );
}
