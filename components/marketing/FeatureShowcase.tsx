'use client';

import { useState } from 'react';

type TabId = 'checklist' | 'budget' | 'vendor';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'checklist', label: 'Checklist', icon: '📋' },
  { id: 'budget', label: 'Bajet', icon: '💰' },
  { id: 'vendor', label: 'Vendor', icon: '🏛️' }
];

const TASKS: [string, boolean][] = [
  ['Tentukan tarikh majlis', true],
  ['Tempah dewan', true],
  ['Cari jurugambar', false],
  ['Hantar jemputan WhatsApp', false]
];

const BUDGET: [string, string, string][] = [
  ['Dewan', 'RM 8,000', '72%'],
  ['Katering', 'RM 9,500', '60%'],
  ['Jurugambar', 'RM 3,500', '100%'],
  ['Andaman', 'RM 3,500', '40%']
];

const VENDORS: [string, string, string, string][] = [
  ['Studio Cahaya', 'Jurugambar', '4.9', 'RM 2,500–4,000'],
  ['Dewan Sri Impian', 'Dewan', '4.7', 'RM 6,000–9,000'],
  ['Katering Nikmat', 'Katering', '4.8', 'RM 25 / pax']
];

export default function FeatureShowcase() {
  const [active, setActive] = useState<TabId>('checklist');

  return (
    <div className="showcase">
      <div className="showcase__tabs" role="tablist" aria-label="Lihat dalam app">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`showcase__tab${active === tab.id ? ' is-active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            <span aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="showcase__panel" role="tabpanel">
        {active === 'checklist' ? (
          <div className="showcase__mock" key="checklist">
            <div className="showcase__mock-head">
              <strong>Checklist Majlis</strong>
              <span>8 / 24 selesai</span>
            </div>
            <div className="showcase__bar"><i style={{ width: '33%' }} /></div>
            {TASKS.map(([text, done], i) => (
              <div className={`showcase__task${done ? ' is-done' : ''}`} key={i}>
                <span className="showcase__check" aria-hidden="true">{done ? '✓' : ''}</span>
                {text}
              </div>
            ))}
          </div>
        ) : null}

        {active === 'budget' ? (
          <div className="showcase__mock" key="budget">
            <div className="showcase__mock-head">
              <strong>Bajet Majlis</strong>
              <span>RM 24,500 / RM 30,000</span>
            </div>
            {BUDGET.map(([cat, amt, pct], i) => (
              <div className="showcase__brow" key={i}>
                <span className="showcase__brow-name">{cat}</span>
                <span className="showcase__brow-bar"><i style={{ width: pct }} /></span>
                <strong>{amt}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {active === 'vendor' ? (
          <div className="showcase__mock" key="vendor">
            <div className="showcase__mock-head">
              <strong>Vendor berdekatan</strong>
              <span>Selangor</span>
            </div>
            {VENDORS.map(([name, cat, rating, price], i) => (
              <div className="showcase__vcard" key={i}>
                <div className="showcase__vinfo">
                  <strong>{name}</strong>
                  <span>{cat} · ★ {rating}</span>
                </div>
                <div className="showcase__vside">
                  <em>{price}</em>
                  <span className="showcase__vsave">Simpan</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
