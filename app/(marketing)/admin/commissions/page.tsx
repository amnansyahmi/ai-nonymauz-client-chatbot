import type { Metadata } from 'next';
import { listCommissions } from '../../../../lib/affiliate/admin';
import { rm, fmtDate, statusMeta } from '../../../../lib/affiliate/format';
import { setCommissionStatusAction } from '../actions';

export const metadata: Metadata = { title: 'Komisen — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminCommissionsPage() {
  const rows = await listCommissions();

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Komisen</h1>
        <p>Luluskan, tolak atau bayar komisen affiliate.</p>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Affiliate</th>
              <th>Jumlah</th>
              <th>Jenis</th>
              <th>Status</th>
              <th>Tarikh</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="admin-table__empty">Tiada komisen lagi.</td></tr>
            )}
            {rows.map((c) => {
              const id = String(c.id);
              const status = String(c.status);
              const s = statusMeta(status);
              return (
                <tr key={id}>
                  <td>{String(c.customer_name ?? '—')}</td>
                  <td><code>{String(c.affiliate_code)}</code><span className="admin-sub">{String(c.affiliate_name)}</span></td>
                  <td>{rm(c.amount as number)}</td>
                  <td>{String(c.type)}</td>
                  <td><span className={`admin-badge ${s.cls}`}>{s.label}</span></td>
                  <td>{fmtDate(c.created_at as string)}</td>
                  <td>
                    <div className="admin-actions">
                      {status === 'pending' && (
                        <>
                          <form action={setCommissionStatusAction}>
                            <input type="hidden" name="id" value={id} />
                            <input type="hidden" name="status" value="approved" />
                            <button className="ui-btn ui-btn--sm ui-btn--ok">Lulus</button>
                          </form>
                          <form action={setCommissionStatusAction}>
                            <input type="hidden" name="id" value={id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button className="ui-btn ui-btn--sm ui-btn--danger">Tolak</button>
                          </form>
                        </>
                      )}
                      {status === 'approved' && (
                        <form action={setCommissionStatusAction}>
                          <input type="hidden" name="id" value={id} />
                          <input type="hidden" name="status" value="paid" />
                          <button className="ui-btn ui-btn--sm ui-btn--ok">Tanda dibayar</button>
                        </form>
                      )}
                      {(status === 'paid' || status === 'rejected') && <span className="admin-sub">—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="admin-note">Bayaran berkelompok ikut affiliate boleh dibuat di halaman Bayaran.</p>
    </div>
  );
}
