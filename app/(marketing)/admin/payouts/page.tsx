import type { Metadata } from 'next';
import { getPayableAffiliates, listPayouts } from '../../../../lib/affiliate/admin';
import { rm, fmtDate, statusMeta } from '../../../../lib/affiliate/format';
import { payAffiliateAction } from '../actions';

export const metadata: Metadata = { title: 'Bayaran — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminPayoutsPage() {
  const [payable, history] = await Promise.all([getPayableAffiliates(), listPayouts()]);

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h1>Bayaran</h1>
        <p>Bayar komisen affiliate yang telah diluluskan.</p>
      </header>

      <section className="admin-card">
        <h2>Sedia untuk dibayar</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Affiliate</th><th>Akaun bank</th><th>Komisen diluluskan</th><th>Jumlah</th><th>Bayar</th></tr>
            </thead>
            <tbody>
              {payable.length === 0 && (
                <tr><td colSpan={5} className="admin-table__empty">Tiada komisen diluluskan menunggu bayaran.</td></tr>
              )}
              {payable.map((p) => {
                const id = String(p.id);
                return (
                  <tr key={id}>
                    <td><code>{String(p.code)}</code><span className="admin-sub">{String(p.name)}</span></td>
                    <td>{p.bank_name ? `${String(p.bank_name)} · ${String(p.bank_account ?? '')}` : '—'}</td>
                    <td>{String(p.commission_count)}</td>
                    <td><strong>{rm(p.owed as number)}</strong></td>
                    <td>
                      <div className="admin-actions">
                        <form action={payAffiliateAction}>
                          <input type="hidden" name="affiliateId" value={id} />
                          <input type="hidden" name="method" value="duitnow" />
                          <button className="ui-btn ui-btn--sm ui-btn--ok">DuitNow</button>
                        </form>
                        <form action={payAffiliateAction}>
                          <input type="hidden" name="affiliateId" value={id} />
                          <input type="hidden" name="method" value="bank" />
                          <button className="ui-btn ui-btn--sm">Bank</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>Sejarah bayaran</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Affiliate</th><th>Jumlah</th><th>Kaedah</th><th>Status</th><th>Tarikh</th></tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={5} className="admin-table__empty">Tiada bayaran direkodkan lagi.</td></tr>
              )}
              {history.map((p) => {
                const s = statusMeta(String(p.status));
                return (
                  <tr key={String(p.id)}>
                    <td><code>{String(p.affiliate_code)}</code></td>
                    <td>{rm(p.amount as number)}</td>
                    <td>{String(p.method) === 'bank' ? 'Bank' : 'DuitNow'}</td>
                    <td><span className={`admin-badge ${s.cls}`}>{s.label}</span></td>
                    <td>{fmtDate((p.paid_at ?? p.created_at) as string)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
