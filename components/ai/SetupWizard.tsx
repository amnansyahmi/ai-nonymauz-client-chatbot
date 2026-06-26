'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BudgetItem, ChecklistItem, PlannerProfile } from '../planner/types';
import { generatePersonalizedChecklist, type SurveyAnswers } from '@/lib/planner/checklistGenerator';
import { generateBudgetBreakdown } from '@/lib/planner/budgetGenerator';
import DatePicker from '../ui/DatePicker';

export type SetupCompletePayload = {
  items: ChecklistItem[];
  title: string;
  budgetItems: BudgetItem[];
  profileUpdate: Record<string, unknown>;
};

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'Kuala Lumpur', 'Putrajaya', 'Labuan'
];

const STEP_TITLES_MS = ['Tarikh majlis', 'Lokasi majlis', 'Asal pengantin', 'Format majlis', 'Saiz majlis', 'Bajet majlis'];
const STEP_TITLES_EN = ['Wedding date', 'Venue location', 'Couple origins', 'Majlis format', 'Guest count', 'Wedding budget'];

const TOTAL_STEPS = 6;
type Step = 1 | 2 | 3 | 4 | 5 | 6;

const BUDGET_QUICK_PICKS = [30000, 50000, 80000, 120000];

/** Sensible starting budget so the field is never empty: ~RM200/pax, min RM15k. */
function suggestBudget(guests: number): number {
  return Math.max(15000, Math.round((guests * 200) / 1000) * 1000);
}

function daysUntil(dateIso: string): number | null {
  if (!dateIso) return null;
  const target = new Date(`${dateIso}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}

function formatRm(value: number): string {
  return `RM${value.toLocaleString('en-MY')}`;
}

type Summary = { taskCount: number; budgetTotal: number; categoryCount: number; daysToWedding: number | null };

export default function SetupWizard({
  initialProfile,
  language,
  onComplete,
  onClose
}: {
  initialProfile?: Partial<PlannerProfile>;
  language: 'ms' | 'en';
  onComplete?: (payload: SetupCompletePayload) => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const isMs = language === 'ms';
  const [step, setStep] = useState<Step>(1);
  const [draft, setDraft] = useState<SurveyAnswers>({
    weddingDate: initialProfile?.majlisDate ?? '',
    venueState: initialProfile?.negeri ?? '',
    brideOriginState: initialProfile?.brideOriginState ?? '',
    groomOriginState: initialProfile?.groomOriginState ?? '',
    hasNikah: initialProfile?.hasNikah ?? true,
    hasSanding: initialProfile?.hasSanding ?? true,
    estimatedGuests: initialProfile?.estimatedGuests ?? 200
  });
  const [budget, setBudget] = useState<number>(
    initialProfile?.totalBudget && initialProfile.totalBudget > 0
      ? initialProfile.totalBudget
      : suggestBudget(initialProfile?.estimatedGuests ?? 200)
  );
  const [budgetTouched, setBudgetTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const pendingPayloadRef = useRef<SetupCompletePayload | null>(null);
  const stepTitles = isMs ? STEP_TITLES_MS : STEP_TITLES_EN;

  function setField<K extends keyof SurveyAnswers>(key: K, value: SurveyAnswers[K]) {
    setDraft((d) => {
      const nextDraft = { ...d, [key]: value };
      // Keep the budget estimate in sync with guest count until the user edits it.
      if (key === 'estimatedGuests' && !budgetTouched) {
        setBudget(suggestBudget(Number(value) || 0));
      }
      return nextDraft;
    });
  }

  function canAdvance(): boolean {
    if (step === 1) return Boolean(draft.weddingDate);
    if (step === 2) return Boolean(draft.venueState);
    if (step === 3) return Boolean(draft.brideOriginState) && Boolean(draft.groomOriginState);
    if (step === 4) return draft.hasNikah || draft.hasSanding;
    if (step === 5) return draft.estimatedGuests > 0;
    if (step === 6) return budget >= 0;
    return false;
  }

  function next() { if (canAdvance()) setStep((s) => (Math.min(TOTAL_STEPS, s + 1) as Step)); }
  function back() { setStep((s) => (Math.max(1, s - 1) as Step)); }

  function finish() {
    if (!canAdvance()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = generatePersonalizedChecklist(draft);
      const budgetItems = generateBudgetBreakdown(budget, draft.estimatedGuests);
      const profileUpdate = {
        majlisDate: draft.weddingDate,
        brideOriginState: draft.brideOriginState,
        groomOriginState: draft.groomOriginState,
        negeri: draft.venueState,
        hasNikah: draft.hasNikah,
        hasSanding: draft.hasSanding,
        estimatedGuests: draft.estimatedGuests,
        guestTarget: draft.estimatedGuests,
        totalBudget: budget,
        checklistGeneratedAt: new Date().toISOString()
      };
      const title = isMs ? 'Checklist Majlis Saya' : 'My Wedding Checklist';
      try {
        const existing = JSON.parse(window.localStorage.getItem('majlismate.plannerProfile') ?? '{}');
        window.localStorage.setItem('majlismate.plannerProfile', JSON.stringify({ ...existing, ...profileUpdate }));
        window.localStorage.setItem('majlismate.checklistItems', JSON.stringify(result.items));
        window.localStorage.setItem('majlismate.checklistTitle', JSON.stringify(title));
        if (budgetItems.length > 0) {
          window.localStorage.setItem('majlismate.budgetItems', JSON.stringify(budgetItems));
        }
      } catch {
        throw new Error(isMs ? 'Gagal simpan. Cuba lagi.' : 'Save failed. Please try again.');
      }
      // Stash the payload so the summary CTA can apply/navigate, and show the
      // "here is what we set up for you" moment instead of jumping away.
      pendingPayloadRef.current = { items: result.items, title, budgetItems, profileUpdate };
      setSummary({
        taskCount: result.items.length,
        budgetTotal: budgetItems.reduce((sum, item) => sum + item.planned, 0),
        categoryCount: budgetItems.length,
        daysToWedding: daysUntil(draft.weddingDate)
      });
      setSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
  }

  function startPlanning() {
    const payload = pendingPayloadRef.current;
    if (onComplete && payload) {
      onComplete(payload);
      return;
    }
    router.push('/chat');
  }

  if (summary) {
    return (
      <main id="main" className="setup-wizard">
        <header className="setup-wizard__bar">
          <span />
          <strong>{isMs ? 'Planner anda dah sedia' : 'Your planner is ready'}</strong>
          <span />
        </header>
        <section className="setup-wizard__panel setup-wizard__summary">
          <span className="setup-wizard__summary-badge" aria-hidden="true">🎉</span>
          <h2>{isMs ? 'Kami dah sediakan untuk anda' : 'We set this up for you'}</h2>
          <ul className="setup-wizard__summary-list">
            <li>
              <strong>{summary.taskCount}</strong>
              <span>{isMs ? 'tugasan dalam checklist' : 'checklist tasks'}</span>
            </li>
            <li>
              <strong>{formatRm(summary.budgetTotal)}</strong>
              <span>{isMs ? `bajet across ${summary.categoryCount} kategori` : `budget across ${summary.categoryCount} categories`}</span>
            </li>
            {summary.daysToWedding !== null && summary.daysToWedding >= 0 ? (
              <li>
                <strong>{summary.daysToWedding}</strong>
                <span>{isMs ? 'hari ke majlis' : 'days to the wedding'}</span>
              </li>
            ) : null}
          </ul>
          <p className="setup-wizard__summary-note">
            {isMs
              ? 'Semua ini boleh diubah bila-bila masa. Tanya AI untuk langkah seterusnya.'
              : 'You can change all of this anytime. Ask the AI for your next step.'}
          </p>
          <div className="setup-wizard__actions">
            <span />
            <button type="button" className="primary-action" onClick={startPlanning} data-event="setup_summary_start">
              {isMs ? 'Mula rancang' : 'Start planning'}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main" className="setup-wizard">
      <header className="setup-wizard__bar">
        {onClose ? (
          <button type="button" className="utility-action" onClick={onClose}>{isMs ? 'Tutup' : 'Close'}</button>
        ) : (
          <Link href="/chat" className="utility-action">{isMs ? 'Tutup' : 'Close'}</Link>
        )}
        <strong>{isMs ? 'Setup Planner' : 'Planner Setup'}</strong>
        <span />
      </header>
      <div className="setup-wizard__progress" aria-label="Setup progress">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((n) => (
          <span key={n} className={'setup-wizard__dot ' + (n <= step ? 'is-done ' : '') + (n === step ? 'is-current' : '')} aria-current={n === step ? 'step' : undefined} />
        ))}
      </div>
      <section className="setup-wizard__panel">
        <p className="eyebrow">{isMs ? 'Langkah ' + step + ' / ' + TOTAL_STEPS : 'Step ' + step + ' / ' + TOTAL_STEPS}</p>
        <h2>{stepTitles[step - 1]}</h2>
        {step === 1 ? (
          <label className="setup-wizard__field">
            <span>{isMs ? 'Tarikh majlis' : 'Wedding date'}</span>
            <DatePicker
              value={draft.weddingDate}
              onChange={(v) => setField('weddingDate', v)}
              language={isMs ? 'ms' : 'en'}
              min={new Date().toISOString().slice(0, 10)}
              ariaLabel={isMs ? 'Tarikh majlis' : 'Wedding date'}
              placeholder={isMs ? 'Pilih tarikh majlis' : 'Pick your wedding date'}
            />
            <small>{isMs ? 'Kami akan susun checklist ikut tarikh ini.' : 'We will arrange your checklist around this date.'}</small>
          </label>
        ) : null}
        {step === 2 ? (
          <label className="setup-wizard__field">
            <span>{isMs ? 'Negeri majlis' : 'Wedding venue state'}</span>
            <select value={draft.venueState} onChange={(e) => setField('venueState', e.target.value)}>
              <option value="">{isMs ? 'Pilih negeri' : 'Select state'}</option>
              {MALAYSIAN_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </label>
        ) : null}
        {step === 3 ? (
          <>
            <label className="setup-wizard__field">
              <span>{isMs ? 'Pengantin perempuan dari' : 'Bride from'}</span>
              <select value={draft.brideOriginState} onChange={(e) => setField('brideOriginState', e.target.value)}>
                <option value="">{isMs ? 'Pilih' : 'Select'}</option>
                {MALAYSIAN_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
            <label className="setup-wizard__field">
              <span>{isMs ? 'Pengantin lelaki dari' : 'Groom from'}</span>
              <select value={draft.groomOriginState} onChange={(e) => setField('groomOriginState', e.target.value)}>
                <option value="">{isMs ? 'Pilih' : 'Select'}</option>
                {MALAYSIAN_STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </label>
          </>
        ) : null}
        {step === 4 ? (
          <>
            <label className="setup-wizard__field setup-wizard__field--checkbox">
              <input type="checkbox" checked={draft.hasNikah} onChange={(e) => setField('hasNikah', e.target.checked)} />
              <span>{isMs ? 'Ada majlis nikah (akad)' : 'Include nikah (solemnisation)'}</span>
            </label>
            <label className="setup-wizard__field setup-wizard__field--checkbox">
              <input type="checkbox" checked={draft.hasSanding} onChange={(e) => setField('hasSanding', e.target.checked)} />
              <span>{isMs ? 'Ada majlis sanding (resepsi)' : 'Include sanding (reception)'}</span>
            </label>
          </>
        ) : null}
        {step === 5 ? (
          <label className="setup-wizard__field">
            <span>{isMs ? 'Anggaran jumlah tetamu (pax)' : 'Estimated guest count (pax)'}</span>
            <input type="number" min={1} value={draft.estimatedGuests} onChange={(e) => setField('estimatedGuests', Math.max(1, Number(e.target.value) || 0))} />
            <small>{isMs ? 'Termasuk kanak-kanak.' : 'Include children.'}</small>
          </label>
        ) : null}
        {step === 6 ? (
          <label className="setup-wizard__field">
            <span>{isMs ? 'Anggaran bajet keseluruhan' : 'Estimated total budget'}</span>
            <input
              type="number"
              min={0}
              step={1000}
              value={budget}
              onChange={(e) => { setBudgetTouched(true); setBudget(Math.max(0, Number(e.target.value) || 0)); }}
            />
            <div className="setup-wizard__chips">
              {BUDGET_QUICK_PICKS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={'setup-wizard__chip' + (budget === amount ? ' is-active' : '')}
                  onClick={() => { setBudgetTouched(true); setBudget(amount); }}
                >
                  {formatRm(amount)}
                </button>
              ))}
            </div>
            <small>
              {isMs
                ? `Kami akan pecahkan bajet ini kepada kategori utama (≈${formatRm(Math.round(budget / Math.max(1, draft.estimatedGuests)))}/pax).`
                : `We will split this across the main categories (≈${formatRm(Math.round(budget / Math.max(1, draft.estimatedGuests)))}/pax).`}
            </small>
          </label>
        ) : null}
        {error ? <p className="setup-wizard__error" role="alert">{error}</p> : null}
        <div className="setup-wizard__actions">
          {step > 1 ? (
            <button type="button" className="utility-action" onClick={back} disabled={submitting}>{isMs ? 'Kembali' : 'Back'}</button>
          ) : (<span />)}
          {step < TOTAL_STEPS ? (
            <button type="button" className="primary-action" onClick={next} disabled={!canAdvance()}>{isMs ? 'Seterusnya' : 'Next'}</button>
          ) : (
            <button type="button" className="primary-action" onClick={finish} disabled={submitting || !canAdvance()} data-event="setup_finish">
              {submitting ? (isMs ? 'Menjana' : 'Generating') : (isMs ? 'Jana planner' : 'Generate planner')}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
