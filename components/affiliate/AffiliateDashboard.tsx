'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { AFFILIATE_ASSETS, AFFILIATE_BADGES } from '../../lib/affiliate/constants';
import type { AffiliateDashboardData } from '../../lib/affiliate/queries';

const STATUS_CLASS: Record<string, string> = {
  registered: 'is-registered',
  trial: 'is-trial',
  active: 'is-active'
};

const STATUS_LABEL: Record<string, string> = {
  registered: 'Berdaftar',
  trial: 'Percubaan',
  active: 'Pelanggan aktif'
};

const APPROVAL_LABEL: Record<string, string> = {
  pending: 'Menunggu kelulusan',
  approved: 'Diluluskan',
  suspended: 'Digantung',
  rejected: 'Ditolak'
};

type Props = {
  user: { name: string; email: string };
  data: AffiliateDashboardData;
};

export default function AffiliateDashboard({ user, data }: Props) {
  const { profile, metrics, today, referrals, payouts } = data;
  const [copied, setCopied] = useState(false);
  const fullLink = `https://${profile.link}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — non-fatal */
    }
  }

  const whatsappShare = `https://wa.me/?text=${encodeURIComponent(
    `Rancang majlis kahwin anda dengan MajlisMate.ai! Daftar di sini: ${fullLink}`
  )}`;

  const tierPct = Math.min(
    100,
    profile.tierProgress.next > 0
      ? Math.round((profile.tierProgress.current / profile.tierProgress.next) * 100)
      : 0
  );

  return (
    <div className="aff-dash">
      <header className="aff-dash__topbar">
        <div className="aff-dash__brand">
          <strong>MajlisMate.ai</strong>
          <span className="aff-dash__badge">Affiliate</span>
        </div>
        <div className="aff-dash__user">
          <div className="aff-dash__user-meta">
            <span className="aff-dash__user-name">{user.name}</span>
            <span className="aff-dash__user-email">{user.email}</span>
          </div>
          <button
            type="button"
            className="aff-dash__signout"
            onClick={() => signOut({ callbackUrl: '/affiliate' })}
          >
            Log keluar
          </button>
        </div>
      </header>

      <main className="aff-dash__body">
        <div className="aff-dash__greeting">
          <h1>Hai, {user.name.split(' ')[0]} 👋</h1>
          <p>
            Ini ringkasan prestasi affiliate anda.
            <span className={`aff-dash__approval is-${profile.status}`}>
              {APPROVAL_LABEL[profile.status] ?? profile.status}
            </span>
          </p>
        </div>

        {/* Referral link + code */}
        <section className="aff-dash__refcard" aria-label="Link rujukan">
          <div className="aff-dash__refcard-main">
            <span className="aff-dash__refcard-label">Kod rujukan anda</span>
            <strong className="aff-dash__refcard-code">{profile.code}</strong>
            <code className="aff-dash__refcard-link">{profile.link}</code>
          </div>
          <div className="aff-dash__refcard-actions">
            <button type="button" className="primary-action" onClick={copyLink}>
              {copied ? 'Disalin ✓' : 'Salin link'}
            </button>
            <a className="utility-action" href={whatsappShare} target="_blank" rel="noopener noreferrer">
              Kongsi WhatsApp
            </a>
          </div>
        </section>

        {/* KPI metric grid */}
        <section className="aff-dash__metrics" aria-label="Statistik">
          {metrics.map((metric) => (
            <article key={metric.key} className="aff-dash__metric">
              <span className="aff-dash__metric-icon" aria-hidden="true">{metric.icon}</span>
              <span className="aff-dash__metric-value">{metric.value}</span>
              <span className="aff-dash__metric-label">{metric.label}</span>
              {metric.trend && <span className="aff-dash__metric-trend">{metric.trend}</span>}
            </article>
          ))}
        </section>

        <div className="aff-dash__grid">
          {/* Recent referrals / lead management */}
          <section className="aff-dash__panel aff-dash__panel--wide" aria-label="Rujukan terkini">
            <div className="aff-dash__panel-head">
              <h2>Rujukan terkini</h2>
              <span className="aff-dash__panel-hint">Maklumat peribadi & pembayaran disembunyikan</span>
            </div>
            {referrals.length > 0 ? (
              <div className="aff-dash__table-wrap">
                <table className="aff-dash__table">
                  <thead>
                    <tr>
                      <th>Pelanggan</th>
                      <th>Status</th>
                      <th>Pakej</th>
                      <th>Tarikh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((ref, i) => (
                      <tr key={`${ref.name}-${i}`}>
                        <td>{ref.name}</td>
                        <td>
                          <span className={`aff-dash__status ${STATUS_CLASS[ref.status] ?? ''}`}>
                            {STATUS_LABEL[ref.status] ?? ref.status}
                          </span>
                        </td>
                        <td>{ref.packageName}</td>
                        <td>{ref.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="aff-dash__empty">
                Belum ada rujukan lagi. Kongsi link anda untuk mula menjana rujukan.
              </p>
            )}
          </section>

          {/* Side column */}
          <div className="aff-dash__side">
            <section className="aff-dash__panel" aria-label="Statistik hari ini">
              <div className="aff-dash__panel-head"><h2>Hari ini</h2></div>
              <ul className="aff-dash__today">
                {today.map((item) => (
                  <li key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="aff-dash__panel" aria-label="Bayaran akan datang">
              <div className="aff-dash__panel-head"><h2>Bayaran akan datang</h2></div>
              {payouts.length > 0 ? (
                <ul className="aff-dash__payouts">
                  {payouts.map((payout, i) => (
                    <li key={i}>
                      <div>
                        <strong>RM {payout.amount.toLocaleString('ms-MY')}</strong>
                        <span>{payout.method} · {payout.date}</span>
                      </div>
                      <span className="aff-dash__payout-status">{payout.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="aff-dash__empty">Tiada bayaran dijadualkan.</p>
              )}
            </section>

            <section className="aff-dash__panel" aria-label="Peringkat">
              <div className="aff-dash__panel-head"><h2>Peringkat anda</h2></div>
              <div className="aff-dash__tier">
                <div className="aff-dash__tier-badges">
                  {AFFILIATE_BADGES.map((badge) => (
                    <span
                      key={badge}
                      className={`aff-dash__tier-badge ${badge === profile.tier ? 'is-current' : ''}`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
                <div className="aff-dash__tier-bar" aria-hidden="true">
                  <span style={{ width: `${tierPct}%` }} />
                </div>
                <p className="aff-dash__tier-note">
                  {profile.tierProgress.current}/{profile.tierProgress.next} jualan ke{' '}
                  {profile.tierProgress.nextTier}
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Marketing materials */}
        <section className="aff-dash__panel" aria-label="Bahan pemasaran">
          <div className="aff-dash__panel-head">
            <h2>Bahan pemasaran</h2>
            <span className="aff-dash__panel-hint">Muat turun & kongsi</span>
          </div>
          <div className="aff-dash__assets">
            {AFFILIATE_ASSETS.map((asset) => (
              <article key={asset.title} className="aff-dash__asset">
                <span className="aff-dash__asset-icon" aria-hidden="true">{asset.icon}</span>
                <div>
                  <strong>{asset.title}</strong>
                  <span>{asset.type}</span>
                </div>
                <button type="button" className="aff-dash__asset-btn">Muat turun</button>
              </article>
            ))}
          </div>
        </section>

        <p className="aff-dash__demo-banner">
          Statistik klik, enjin komisen dan pembayaran sebenar akan diisi apabila
          penjejakan rujukan diaktifkan. Profil & link rujukan anda sudah disimpan dalam pangkalan data.{' '}
          <Link href="/affiliate">Tentang program</Link>
        </p>
      </main>
    </div>
  );
}
