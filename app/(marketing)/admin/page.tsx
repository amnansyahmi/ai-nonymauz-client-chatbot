import type { Metadata } from 'next';
import { getAdminSession } from '@/lib/admin/session';
import { getAdminDashboard } from '@/lib/affiliate/admin';
import { rm } from '@/lib/affiliate/format';

export const metadata: Metadata = { title: 'Admin Dashboard — MajlisMate.ai' };
export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [session, k] = await Promise.all([getAdminSession(), getAdminDashboard()]);
  const firstName = (session?.name ?? 'Admin').split(' ')[0];

  const groups = [
    {
      title: 'Pengguna',
      cards: [
        { label: 'Jumlah pelanggan dirujuk', value: k.total_customers.toLocaleString('ms-MY'), icon: '👥' },
        { label: 'Langganan aktif', value: k.active_subs.toLocaleString('ms-MY'), icon: '⭐' },
        { label: 'Pendaftaran bulan ini', value: k.new_this_month.toLocaleString('ms-MY'), icon: '🆕' }
      ]
    },
    {
      title: 'Affiliate',
      cards: [
        { label: 'Jumlah affiliate', value: k.total_affiliates.toLocaleString('ms-MY'), icon: '🤝' },
        { label: 'Affiliate aktif', value: k.active_affiliates.toLocaleString('ms-MY'), icon: '✅' }
      ]
    },
    {
      title: 'Kewangan',
      cards: [
        { label: 'Hasil langganan', value: rm(k.revenue), icon: '💵' },
        { label: 'Liabiliti komisen', value: rm(k.liability), icon: '⏳', variant: 'warn' },
        { label: 'Komisen dibayar', value: rm(k.paid), icon: '💸' }
      ]
    }
  ] as const;

  return (
    <div className="admin-page">
      <section className="admin-hello">
        <h1>Hai, {firstName} 👋</h1>
        <p>Ringkasan keseluruhan sistem affiliate MajlisMate.ai.</p>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="admin-kpi-group">
          <h2>{group.title}</h2>
          <div className="admin-kpi-grid">
            {group.cards.map((card) => {
              const variant = 'variant' in card ? card.variant : null;
              return (
                <article key={card.label} className={`admin-kpi${variant ? ` admin-kpi--${variant}` : ''}`}>
                  <span className="admin-kpi__icon" aria-hidden="true">{card.icon}</span>
                  <span className="admin-kpi__value">{card.value}</span>
                  <span className="admin-kpi__label">{card.label}</span>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <p className="admin-note">
        Hasil = jumlah nilai langganan aktif. Liabiliti komisen = komisen tertunggak + diluluskan
        yang belum dibayar. Untung kasar dilihat di Laporan.
      </p>
    </div>
  );
}
