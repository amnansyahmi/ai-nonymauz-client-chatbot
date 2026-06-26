import type { Metadata } from 'next';
import Link from 'next/link';
import { listAffiliates } from '../../../../lib/affiliate/admin';
import { rm, fmtDate, statusMeta } from '../../../../lib/affiliate/format';
import { setAffiliateStatusAction } from '../actions';

export const metadata: Metadata = { title: 'Affiliates — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminAffiliatesPage() {
  const rows = await listAffiliates();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Affiliates</h1>
        <p>{rows.length} affiliate berdaftar.</p>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Affiliate</th>
              <th>Kod</th>
              <th>Pengguna</th>
              <th>Hasil</th>
              <th>Komisen</th>
              <th>Status</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="admin-table__empty">Tiada affiliate lagi.</td></tr>
            )}
            {rows.map((a) => {
              const s = statusMeta(a.status);
              return (
                <tr key={a.id}>
                  <td>
                    <Link href={`/admin/affiliates/${a.id}`} className="admin-link">{a.name}</Link>
                    <span className="admin-sub">{fmtDate(a.created_at)}</span>
                  </td>
                  <td><code>{a.code}</code></td>
                  <td>{a.users}</td>
                  <td>{rm(a.revenue)}</td>
                  <td>{rm(a.commission)}</td>
                  <td><span className={`admin-badge ${s.cls}`}>{s.label}</span></td>
                  <td>
                    <div className="admin-actions">
                      {a.status !== 'approved' && (
                        <form action={setAffiliateStatusAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="approved" />
                          <button className="ui-btn ui-btn--sm ui-btn--ok">Lulus</button>
                        </form>
                      )}
                      {a.status !== 'suspended' && (
                        <form action={setAffiliateStatusAction}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value="suspended" />
                          <button className="ui-btn ui-btn--sm ui-btn--danger">Gantung</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
