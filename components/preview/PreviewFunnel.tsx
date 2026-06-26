'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SetupWizard from '../ai/SetupWizard';
import type { SetupCompletePayload } from '../ai/SetupWizard';
import ChecklistPreview, { MAX_VISIBLE_ITEMS } from './ChecklistPreview';
import PaywallOverlay from './PaywallOverlay';
import DraftingAnimation from './DraftingAnimation';
import { seedPlannerFromPreview } from './seedPlanner';
import type { AppLanguage, ChecklistItem } from '../planner/types';
import { getPreviewStrings } from '@/lib/preview/i18n';
import { daysUntil } from '../planner/utils';
import { trackEvent } from '@/lib/analytics';

type FunnelState = 'wizard' | 'drafting' | 'preview' | 'paywall';

const DRAFTING_DURATION_MS = 3500;

export default function PreviewFunnel() {
  const router = useRouter();
  const [language, setLanguage] = useState<AppLanguage>('ms');
  const [state, setState] = useState<FunnelState>('wizard');
  const [prevStates, setPrevStates] = useState<FunnelState[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistTitle, setChecklistTitle] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const paywallTriggeredRef = useRef(false);
  const previewShownRef = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('majlismate.language');
      if (stored === 'ms' || stored === 'en') setLanguage(stored);
    } catch {
      // ignore
    }
    trackEvent('preview_wizard_started');
  }, []);

  // Funnel-stage instrumentation: preview shown once, paywall each time it opens.
  useEffect(() => {
    if (state === 'preview' && !previewShownRef.current) {
      previewShownRef.current = true;
      trackEvent('preview_shown', { tasks: checklistItems.length });
    }
    if (state === 'paywall') {
      trackEvent('preview_paywall_shown', { tasks: checklistItems.length });
    }
  }, [state, checklistItems.length]);

  const t = getPreviewStrings(language);
  const daysLeft = weddingDate ? daysUntil(weddingDate) : null;
  const lockedCount = Math.max(0, checklistItems.length - MAX_VISIBLE_ITEMS);

  const transitionTo = useCallback((next: FunnelState) => {
    setPrevStates((prev) => [...prev, state]);
    setState(next);
  }, [state]);

  const handleSetupComplete = useCallback((payload: SetupCompletePayload) => {
    setChecklistItems(payload.items);
    setChecklistTitle(payload.title);
    const date = typeof payload.profileUpdate?.majlisDate === 'string' ? payload.profileUpdate.majlisDate : '';
    setWeddingDate(date);
    // Carry the generated plan into the real planner so the app is pre-filled
    // after signup/checkout (no clobber if a plan already exists).
    seedPlannerFromPreview(payload);
    trackEvent('preview_wizard_completed', { tasks: payload.items.length });
    transitionTo('drafting');
  }, [transitionTo]);

  useEffect(() => {
    if (state !== 'drafting') return;
    const timer = setTimeout(() => transitionTo('preview'), DRAFTING_DURATION_MS);
    return () => clearTimeout(timer);
  }, [state, transitionTo]);

  const handleScroll = useCallback(() => {
    if (paywallTriggeredRef.current || state !== 'preview') return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 100;

    if (scrolledToBottom) {
      paywallTriggeredRef.current = true;
      transitionTo('paywall');
    }
  }, [state, transitionTo]);

  const handlePaywallDismiss = useCallback(() => {
    trackEvent('preview_paywall_dismissed');
    setState('preview');
    setPrevStates((prev) => prev.slice(0, -1));
  }, []);

  const handleGoToCheckout = useCallback(() => {
    trackEvent('preview_checkout_clicked', { tasks: checklistItems.length });
    router.push('/checkout?plan=sehari-hari');
  }, [router, checklistItems.length]);

  const handleViewAllPlans = useCallback(() => {
    trackEvent('preview_view_all_plans');
    router.push('/pricing');
  }, [router]);

  const handleGoHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'ms' ? 'en' : 'ms';
      try {
        window.localStorage.setItem('majlismate.language', next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const getTransitionClass = (viewState: FunnelState) => {
    if (state === viewState) return 'preview-view preview-view--active';
    if (prevStates.includes(viewState) && state !== viewState) return 'preview-view preview-view--exiting';
    return 'preview-view preview-view--hidden';
  };

  return (
    <div className="preview-shell">
      {state !== 'paywall' && (
        <button
          type="button"
          className="preview-lang-toggle"
          onClick={toggleLanguage}
          aria-label={language === 'ms' ? 'Switch to English' : 'Tukar ke Bahasa Melayu'}
        >
          {language === 'ms' ? 'EN' : 'BM'}
        </button>
      )}

      <div className={getTransitionClass('wizard')}>
        {state === 'wizard' && (
          <SetupWizard
            language={language}
            onComplete={handleSetupComplete}
            onClose={handleGoHome}
          />
        )}
      </div>

      <div className={getTransitionClass('drafting')}>
        {state === 'drafting' && <DraftingAnimation language={language} />}
      </div>

      <div className={`${getTransitionClass('preview')} preview-view--full`}>
        {(state === 'preview' || state === 'paywall') && (
          <div className="preview-checklist">
            <header className="preview-checklist__header">
              <button type="button" className="preview-checklist__back" onClick={handleGoHome}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="preview-checklist__header-info">
                <strong>{checklistTitle || t.defaultTitle}</strong>
                <span className="preview-checklist__count">
                  {daysLeft !== null && daysLeft >= 0 ? `${daysLeft} ${t.daysToGo} · ` : ''}
                  {checklistItems.length} {t.taskCount}
                </span>
              </div>
            </header>

            <div
              className="preview-checklist__scroll"
              ref={scrollContainerRef}
              onScroll={handleScroll}
            >
              <ChecklistPreview items={checklistItems} language={language} />

              <div className="preview-checklist__cta">
                <div className="preview-checklist__cta-inner">
                  <div className="preview-checklist__cta-icon preview-checklist__cta-icon--pulse">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <p>{t.ctaLocked} {checklistItems.length} {t.taskCount}</p>
                  <button type="button" className="preview-btn preview-btn--primary" onClick={() => transitionTo('paywall')}>
                    {t.ctaButton}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={getTransitionClass('paywall')}>
        {state === 'paywall' && (
          <PaywallOverlay
            taskCount={checklistItems.length}
            lockedCount={lockedCount}
            language={language}
            onDismiss={handlePaywallDismiss}
            onGoToCheckout={handleGoToCheckout}
            onViewAllPlans={handleViewAllPlans}
          />
        )}
      </div>
    </div>
  );
}
