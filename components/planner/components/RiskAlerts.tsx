'use client';

import { useState } from 'react';
import type { AppLanguage, ActiveTab } from '../types';
import type { RiskAlert } from '../riskDetector';

type Props = {
  alerts: RiskAlert[];
  language: AppLanguage;
  onNavigate: (tab: ActiveTab) => void;
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

const LEVEL_LABEL: Record<RiskAlert['level'], { ms: string; en: string }> = {
  high: { ms: 'Kritikal', en: 'Critical' },
  medium: { ms: 'Perhatian', en: 'Warning' },
  info: { ms: 'Info', en: 'Info' }
};

export default function RiskAlerts({ alerts, language, onNavigate }: Props) {
  const [open, setOpen] = useState(true);

  if (alerts.length === 0) return null;

  const highCount = alerts.filter((a) => a.level === 'high').length;
  const badgeLevel = highCount > 0 ? 'high' : alerts.some((a) => a.level === 'medium') ? 'medium' : 'info';

  return (
    <div className="risk-alerts">
      <button
        type="button"
        className="risk-alerts__header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="risk-alerts__icon"><ShieldIcon /></span>
        <span className="risk-alerts__title">
          {language === 'ms' ? 'AI Risk Scan' : 'AI Risk Scan'}
        </span>
        <span className={`risk-alerts__badge risk-alerts__badge--${badgeLevel}`}>
          {alerts.length}
        </span>
        <span className="risk-alerts__chevron"><ChevronIcon open={open} /></span>
      </button>

      {open ? (
        <ul className="risk-alerts__list" role="list">
          {alerts.map((alert) => (
            <li key={alert.id} className={`risk-alert risk-alert--${alert.level}`}>
              <span className="risk-alert__dot" aria-hidden="true" />
              <div className="risk-alert__body">
                <span className="risk-alert__level">
                  {LEVEL_LABEL[alert.level][language]}
                </span>
                <p className="risk-alert__title">
                  {language === 'ms' ? alert.titleMs : alert.titleEn}
                </p>
                <p className="risk-alert__detail">
                  {language === 'ms' ? alert.detailMs : alert.detailEn}
                </p>
                {alert.tab ? (
                  <button
                    type="button"
                    className="risk-alert__action"
                    onClick={() => onNavigate(alert.tab!)}
                  >
                    {language === 'ms' ? 'Lihat →' : 'View →'}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
