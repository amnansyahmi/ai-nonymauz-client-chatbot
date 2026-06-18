'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ChecklistItem, PlannerProfile } from '../planner/types';
import { generatePersonalizedChecklist, type SurveyAnswers } from '../../lib/planner/checklistGenerator';

export type SetupCompletePayload = {
  items: ChecklistItem[];
  title: string;
  profileUpdate: Record<string, unknown>;
};

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'Kuala Lumpur', 'Putrajaya', 'Labuan'
];

const STEP_TITLES_MS = ['Tarikh majlis', 'Lokasi majlis', 'Asal pengantin', 'Format majlis', 'Saiz majlis'];
const STEP_TITLES_EN = ['Wedding date', 'Venue location', 'Couple origins', 'Majlis format', 'Guest count'];

type Step = 1 | 2 | 3 | 4 | 5;

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const stepTitles = isMs ? STEP_TITLES_MS : STEP_TITLES_EN;

  function setField<K extends keyof SurveyAnswers>(key: K, value: SurveyAnswers[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 1) return Boolean(draft.weddingDate);
    if (step === 2) return Boolean(draft.venueState);
    if (step === 3) return Boolean(draft.brideOriginState) && Boolean(draft.groomOriginState);
    if (step === 4) return draft.hasNikah || draft.hasSanding;
    if (step === 5) return draft.estimatedGuests > 0;
    return false;
  }

  function next() { if (canAdvance()) setStep((s) => (Math.min(5, s + 1) as Step)); }
  function back() { setStep((s) => (Math.max(1, s - 1) as Step)); }

  async function finish() {
    if (!canAdvance()) return;
    setSubmitting(true);
    setError('');
    try {
      const result = generatePersonalizedChecklist(draft);
      const profileUpdate = {
        majlisDate: draft.weddingDate,
        brideOriginState: draft.brideOriginState,
        groomOriginState: draft.groomOriginState,
        negeri: draft.venueState,
        hasNikah: draft.hasNikah,
        hasSanding: draft.hasSanding,
        estimatedGuests: draft.estimatedGuests,
        checklistGeneratedAt: new Date().toISOString()
      };
      const title = isMs ? 'Checklist Majlis Saya' : 'My Wedding Checklist';
      try {
        const existing = JSON.parse(window.localStorage.getItem('majlismate.plannerProfile') ?? '{}');
        window.localStorage.setItem('majlismate.plannerProfile', JSON.stringify({ ...existing, ...profileUpdate }));
        window.localStorage.setItem('majlismate.checklistItems', JSON.stringify(result.items));
        window.localStorage.setItem('majlismate.checklistTitle', JSON.stringify(title));
      } catch {
        throw new Error(isMs ? 'Gagal simpan. Cuba lagi.' : 'Save failed. Please try again.');
      }
      // When embedded in the workspace, apply live instead of navigating
      // (router.push('/chat') is a no-op when already on /chat).
      if (onComplete) {
        onComplete({ items: result.items, title, profileUpdate });
        return;
      }
      router.push('/chat');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setSubmitting(false);
    }
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
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={'setup-wizard__dot ' + (n <= step ? 'is-done ' : '') + (n === step ? 'is-current' : '')} aria-current={n === step ? 'step' : undefined} />
        ))}
      </div>
      <section className="setup-wizard__panel">
        <p className="eyebrow">{isMs ? 'Langkah ' + step + ' / 5' : 'Step ' + step + ' / 5'}</p>
        <h2>{stepTitles[step - 1]}</h2>
        {step === 1 ? (
          <label className="setup-wizard__field">
            <span>{isMs ? 'Tarikh majlis' : 'Wedding date'}</span>
            <input type="date" min={new Date().toISOString().slice(0, 10)} value={draft.weddingDate} onChange={(e) => setField('weddingDate', e.target.value)} />
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
        {error ? <p className="setup-wizard__error" role="alert">{error}</p> : null}
        <div className="setup-wizard__actions">
          {step > 1 ? (
            <button type="button" className="utility-action" onClick={back} disabled={submitting}>{isMs ? 'Kembali' : 'Back'}</button>
          ) : (<span />)}
          {step < 5 ? (
            <button type="button" className="primary-action" onClick={next} disabled={!canAdvance()}>{isMs ? 'Seterusnya' : 'Next'}</button>
          ) : (
            <button type="button" className="primary-action" onClick={finish} disabled={submitting || !canAdvance()} data-event="setup_finish">
              {submitting ? (isMs ? 'Menjana' : 'Generating') : (isMs ? 'Jana checklist' : 'Generate checklist')}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}