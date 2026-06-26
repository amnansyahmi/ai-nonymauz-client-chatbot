'use client';

import { PLANS } from '@/lib/payments/plans';
import type { AppLanguage } from '../planner/types';
import { getPreviewStrings } from '@/lib/preview/i18n';

type Props = {
  taskCount: number;
  lockedCount: number;
  language: AppLanguage;
  onDismiss: () => void;
  onGoToCheckout: () => void;
  onViewAllPlans: () => void;
};

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function PaywallOverlay({ taskCount, lockedCount, language, onDismiss, onGoToCheckout, onViewAllPlans }: Props) {
  const t = getPreviewStrings(language);
  const featuredPlan = PLANS.find((p) => p.id === 'sehari-hari');
  const isEn = language === 'en';

  return (
    <div className="preview-paywall" role="dialog" aria-modal="true" aria-label={t.paywallAriaLabel}>
      <button
        type="button"
        className="preview-paywall__backdrop"
        onClick={onDismiss}
        aria-label={t.closeAria}
      />
      <div className="preview-paywall__panel">
        <button
          type="button"
          className="preview-paywall__close"
          onClick={onDismiss}
          aria-label={t.closeAria}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="preview-paywall__header">
          <div className="preview-paywall__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2>{t.paywallTitle} {taskCount} {t.paywallTitleSuffix}</h2>
          <p>{t.paywallSubtitle}</p>
          {lockedCount > 0 ? (
            <p className="preview-paywall__locked">+{lockedCount} {t.taskCount} {t.lockedSuffix}</p>
          ) : null}
        </div>

        <div className="preview-paywall__features">
          {t.paywallFeatures.map((feature) => (
            <div key={feature} className="preview-paywall__feature">
              <span className="preview-paywall__feature-icon"><CheckIcon /></span>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {featuredPlan && (
          <div className="preview-paywall__plan">
            <div className="preview-paywall__plan-header">
              <span className="preview-paywall__plan-badge">{t.paywallBadge}</span>
              <h3>{isEn ? featuredPlan.nameEn : featuredPlan.nameMs}</h3>
              <p>{isEn ? featuredPlan.taglineEn : featuredPlan.taglineMs}</p>
            </div>
            <div className="preview-paywall__plan-price">
              <span className="preview-paywall__plan-currency">RM</span>
              <span className="preview-paywall__plan-amount">{featuredPlan.priceMonthly}</span>
              <span className="preview-paywall__plan-period">{t.paywallPeriod}</span>
            </div>
            <button
              type="button"
              className="preview-paywall__cta"
              onClick={onGoToCheckout}
            >
              {t.paywallCta}
            </button>
          </div>
        )}

        <div className="preview-paywall__footer">
          <button type="button" className="preview-paywall__link" onClick={onViewAllPlans}>
            {t.paywallViewAll}
          </button>
          <span className="preview-paywall__divider">·</span>
          <button type="button" className="preview-paywall__link" onClick={onDismiss}>
            {t.paywallBack}
          </button>
        </div>
      </div>
    </div>
  );
}
