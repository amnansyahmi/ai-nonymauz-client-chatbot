import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAffiliateDetail } from '@/lib/affiliate/admin';
import { rm, fmtDate, statusMeta } from '@/lib/affiliate/format';
import { Button, Badge, Card } from '@/components/ui';
import { setAffiliateStatusAction } from '../../actions';

export const metadata: Metadata = { title: 'Affiliate — Admin' };
export const dynamic = 'force-dynamic';

export default async function AdminAffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getAffiliateDetail(id);
  if (!detail) notFound();

  const a = detail.affiliate as Record<string, string | null>;
  const stats = detail.stats;
  const s = statusMeta(String(a.status));

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <Link href="/admin/affiliates" className="admin-back">← Affiliates</Link>
        <h1>{String(a.name)} <Badge variant={s.variant}>{s.label}</Badge></h1>
        <p><code>{String(a.code)}</code> · majlismate.ai/ref/{String(a.code).toLowerCase()}</p>
      </header>

      <div className="admin-detail-grid">
        <Card>
          <h2>Maklumat affiliate</h2>
          <dl className="admin-dl">
            <div><dt>E-mel</dt><dd>{String(a.email)}</dd></div>
            <div><dt>Telefon</dt><dd>{a.phone || '—'}</dd></div>
            <div><dt>Media sosial</dt><dd>{a.social || '—'}</dd></div>
            <div><dt>Peringkat</dt><dd>{String(a.tier)}</dd></div>
            <div><dt>Bank</dt><dd>{a.bank_name || '—'}</dd></div>
            <div><dt>No. akaun</dt><dd>{a.bank_account || '—'}</dd></div>
            <div><dt>Sertai</dt><dd>{fmtDate(a.created_at)}</dd></div>
          </dl>
          <div className="admin-actions">
            <form action={setAffiliateStatusAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="approved" />
              <Button type="submit" variant="ok" size="sm">Luluskan</Button>
            </form>
            <form action={setAffiliateStatusAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value="suspended" />
              <Button type="submit" variant="danger" size="sm">Gantung</Button>
            </form>
          </div>
        </Card>

        <Card>
          <h2>Statistik</h2>
          <div className="admin-kpi-grid">
            <article className="admin-kpi"><span className="admin-kpi__value">{stats.users}</span><span className="admin-kpi__label">Jumlah pengguna</span></article>
            <article className="admin-kpi"><span className="admin-kpi__value">{rm(stats.revenue)}</span><span className="admin-kpi__label">Jumlah hasil</span></article>
            <article className="admin-kpi"><span className="admin-kpi__value">{rm(stats.commission)}</span><span className="admin-kpi__label">Jumlah komisen</span></article>
          </div>
        </Card>
      </div>

      <Card>
        <h2>Pengguna dirujuk</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Pelanggan</th><th>Pakej</th><th>Nilai</th><th>Status</th><th>Komisen</th><th>Tarikh</th></tr>
            </thead>
            <tbody>
              {detail.users.length === 0 && (
                <tr><td colSpan={6} className="admin-table__empty">Belum ada pengguna dirujuk.</td></tr>
              )}
              {detail.users.map((u, i) => {
                const us = statusMeta(String(u.status));
                return (
                  <tr key={i}>
                    <td>{String(u.customer_name ?? 'Tanpa nama')}<span className="admin-sub">{String(u.customer_email ?? '')}</span></td>
                    <td>{String(u.package_name ?? '—')}</td>
                    <td>{rm(u.amount as number)}</td>
                    <td><Badge variant={us.variant}>{us.label}</Badge></td>
                    <td>{rm(u.commission as number)}</td>
                    <td>{fmtDate(u.created_at as string)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
