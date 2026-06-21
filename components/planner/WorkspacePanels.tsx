import { useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import type { ActivityItem, AppLanguage, BudgetItem, Guest, PlannerProfile, Vendor } from './types';
import { money, rsvpLabel, statusLabel } from './utils';
import {
  buildRsvpInviteMessage,
  buildWhatsAppShareUrl,
  isValidFormUrl,
  normalizeFormUrl
} from '../../lib/planner/rsvpShare';
import { buildRsvpPageUrl } from '../../lib/planner/rsvpLink';
import type { WeeklyBriefing as Briefing, BriefingTone } from '../../lib/planner/weeklyBriefing';

type DashboardPanelProps = {
  plannerProfile: PlannerProfile;
  daysLeft: number | null;
  planningProgress: number;
  completedCount: number;
  totalChecklistItems: number;
  totalPlanned: number;
  totalActual: number;
  totalPaid: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  createDefaultChecklist: () => void;
  urgentChecklist: Array<{ id: string; text: string; deadline?: string; phase?: string }>;
  onViewAllTasks: () => void;
  activity: ActivityItem[];
  onAskToday: () => void;
  language?: AppLanguage;
  briefing: Briefing;
  isSpeaking: boolean;
  canSpeak: boolean;
  onSpeak: () => void;
  onStopSpeak: () => void;
};

const dashboardCopy = {
  ms: {
    todayEyebrow: 'Hari ini',
    todayTitle: 'Apa perlu perhatian',
    todayLead: 'Mula dengan task, appointment, dan bajet sebelum buka menu lain.',
    askToday: 'Tanya MajlisMate hari ini',
    nextTask: 'Task seterusnya',
    nextTaskNone: 'Tiada task mendesak',
    due: (date: string) => `Tarikh akhir ${date}`,
    recommendedNow: 'Disyorkan sekarang',
    nextAppointment: 'Appointment seterusnya',
    noAppointment: 'Belum ada appointment',
    noAppointmentHint: 'Jadualkan follow-up vendor atau peringatan bayaran.',
    at: (time: string) => ` jam ${time}`,
    budgetSignal: 'Isyarat bajet',
    budgetHint: 'Semak anggaran, sebenar, bayaran, dan baki.',
    planningPhaseLabel: 'Fasa perancangan',
    setDateHint: 'Set tarikh majlis dalam tetapan.',
    smartEyebrow: 'Peringatan pintar',
    smartTitle: 'Fokus disyorkan',
    smartSub: 'Dicadangkan berdasarkan data planner semasa',
    countdown: 'Kira detik',
    setDate: 'Set tarikh',
    days: (n: number) => `${n} hari`,
    majlisPassed: 'Majlis berlalu',
    countdownHint: 'Tambah tarikh majlis untuk buka alert timeline.',
    progress: 'Kemajuan',
    itemsDone: (done: number, total: number) => `${done}/${total} item checklist selesai`,
    budget: 'Bajet',
    budgetMeta: (planned: string, actual: string) => `${planned} dirancang, ${actual} sebenar`,
    rsvp: 'RSVP',
    rsvpMeta: (pending: number, declined: number) => `${pending} pending, ${declined} tidak hadir`,
    urgentEyebrow: 'Ikut tarikh akhir',
    urgentTitle: 'Tindakan mendesak',
    generateChecklist: 'Jana checklist asas',
    planning: 'Perancangan',
    activityEyebrow: 'Aktiviti terkini',
    activityTitle: 'Perubahan terbaru',
    activityEmpty: 'Kemaskini planner terbaru anda akan dipaparkan di sini.'
  },
  en: {
    todayEyebrow: 'Today',
    todayTitle: 'What needs attention',
    todayLead: 'Start with your next task, appointment, and budget before the detailed menus.',
    askToday: 'Ask MajlisMate today',
    nextTask: 'Next task',
    nextTaskNone: 'No urgent task',
    due: (date: string) => `Due ${date}`,
    recommendedNow: 'Recommended now',
    nextAppointment: 'Next appointment',
    noAppointment: 'No appointment yet',
    noAppointmentHint: 'Schedule vendor follow-ups or payment reminders.',
    at: (time: string) => ` at ${time}`,
    budgetSignal: 'Budget signal',
    budgetHint: 'Review planned, actual, paid, and balance.',
    planningPhaseLabel: 'Planning phase',
    setDateHint: 'Set wedding date in settings.',
    smartEyebrow: 'Smart reminders',
    smartTitle: 'Recommended focus',
    smartSub: 'Suggested by current planner data',
    countdown: 'Countdown',
    setDate: 'Set date',
    days: (n: number) => `${n} days`,
    majlisPassed: 'Majlis passed',
    countdownHint: 'Add your majlis date to unlock timeline alerts.',
    progress: 'Progress',
    itemsDone: (done: number, total: number) => `${done}/${total} checklist items done`,
    budget: 'Budget',
    budgetMeta: (planned: string, actual: string) => `${planned} planned, ${actual} actual`,
    rsvp: 'RSVP',
    rsvpMeta: (pending: number, declined: number) => `${pending} pending, ${declined} declined`,
    urgentEyebrow: 'Deadline-aware',
    urgentTitle: 'Urgent actions',
    generateChecklist: 'Generate default checklist',
    planning: 'Planning',
    activityEyebrow: 'Recent activity',
    activityTitle: 'Latest changes',
    activityEmpty: 'Your latest planner updates will appear here.'
  }
} as const;

export function DashboardPanel({
  plannerProfile,
  daysLeft,
  planningProgress,
  completedCount,
  totalChecklistItems,
  totalPlanned,
  totalActual,
  totalPaid,
  confirmedGuests,
  pendingGuests,
  declinedGuests,
  createDefaultChecklist,
  urgentChecklist,
  onViewAllTasks,
  activity,
  onAskToday,
  language = 'ms',
  briefing,
  isSpeaking,
  canSpeak,
  onSpeak,
  onStopSpeak
}: DashboardPanelProps) {
  const t = dashboardCopy[language];
  const isMs = language === 'ms';
  const locale = isMs ? 'ms-MY' : 'en-MY';

  // Live ticking clock for the countdown tile — keeps the delightful
  // seconds-level countdown without a separate oversized card.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const target = plannerProfile.majlisDate ? new Date(`${plannerProfile.majlisDate}T08:00:00`) : null;
  const validTarget = target && !Number.isNaN(target.getTime()) ? target : null;
  let clock: { h: string; m: string; s: string } | null = null;
  if (validTarget && now) {
    const diff = validTarget.getTime() - now.getTime();
    if (diff > 0) {
      clock = {
        h: String(Math.floor((diff / 3_600_000) % 24)).padStart(2, '0'),
        m: String(Math.floor((diff / 60_000) % 60)).padStart(2, '0'),
        s: String(Math.floor((diff / 1000) % 60)).padStart(2, '0')
      };
    }
  }
  const weddingDateLabel = validTarget
    ? validTarget.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : t.setDateHint;

  const hasChecklist = totalChecklistItems > 0;

  return (
    <div className="mm-dash">
      <header className="mm-dash__header">
        <div className="mm-dash__intro">
          <span className="mm-dash__eyebrow">{t.todayEyebrow}</span>
          <h2 className="mm-dash__greeting">{briefing.greeting}</h2>
          <p className="mm-dash__headline">{briefing.headline}</p>
        </div>
        <div className="mm-dash__actions">
          {canSpeak ? (
            isSpeaking ? (
              <button type="button" className="mm-dash__btn" onClick={onStopSpeak}>
                <span className="mm-dash__pulse" aria-hidden="true" />
                {isMs ? 'Berhenti' : 'Stop'}
              </button>
            ) : (
              <button type="button" className="mm-dash__btn" onClick={onSpeak}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 5 6 9H2v6h4l5 4z" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
                </svg>
                {isMs ? 'Dengar' : 'Listen'}
              </button>
            )
          ) : null}
          <button type="button" className="mm-dash__btn mm-dash__btn--primary" onClick={onAskToday}>
            {t.askToday}
          </button>
        </div>
      </header>

      <div className="mm-dash__stats">
        <article className="mm-stat mm-stat--accent">
          <span className="mm-stat__label">{t.countdown}</span>
          <span className="mm-stat__value">
            {daysLeft === null ? '—' : daysLeft >= 0 ? daysLeft : 0}
            <em>{daysLeft === null ? t.setDate : daysLeft >= 0 ? (isMs ? 'hari' : 'days') : t.majlisPassed}</em>
          </span>
          {clock ? (
            <span className="mm-stat__clock" title={isMs ? 'Masa berbaki ke hari majlis' : 'Time left until the big day'}>
              <span><b>{clock.h}</b>{isMs ? 'j' : 'h'}</span>
              <span><b>{clock.m}</b>m</span>
              <span><b>{clock.s}</b>s</span>
            </span>
          ) : null}
          <span className="mm-stat__meta">{weddingDateLabel}</span>
        </article>

        <article className="mm-stat">
          <span className="mm-stat__label">{t.progress}</span>
          <span className="mm-stat__value">{planningProgress}<em>%</em></span>
          <div className="mm-stat__bar"><span style={{ width: `${planningProgress}%` }} /></div>
          <span className="mm-stat__meta">{t.itemsDone(completedCount, totalChecklistItems)}</span>
        </article>

        <article className="mm-stat">
          <span className="mm-stat__label">{t.budget}</span>
          <span className="mm-stat__value mm-stat__value--money">{money(totalPaid)}</span>
          <span className="mm-stat__meta">{t.budgetMeta(money(totalPlanned), money(totalActual))}</span>
        </article>

        <article className="mm-stat">
          <span className="mm-stat__label">{t.rsvp}</span>
          <span className="mm-stat__value">{confirmedGuests}<em>{isMs ? 'sah' : 'going'}</em></span>
          <span className="mm-stat__meta">{t.rsvpMeta(pendingGuests, declinedGuests)}</span>
        </article>
      </div>

      <div className="mm-dash__cols">
        <section className="mm-dash__card mm-dash__focus">
          <header className="mm-dash__card-head">
            <h3>{t.urgentTitle}</h3>
            {!hasChecklist ? (
              <button type="button" className="mm-dash__link" onClick={createDefaultChecklist}>
                {t.generateChecklist}
              </button>
            ) : urgentChecklist.length > 5 ? (
              <button type="button" className="mm-dash__link" onClick={onViewAllTasks}>
                {isMs ? `Lihat semua (${urgentChecklist.length})` : `View all (${urgentChecklist.length})`}
              </button>
            ) : null}
          </header>
          {urgentChecklist.length > 0 ? (
            <ul className="mm-focus-list">
              {urgentChecklist.slice(0, 5).map((item) => (
                <li key={item.id} className="mm-focus-item tone-urgent">
                  <span className="mm-focus-item__icon" aria-hidden="true">
                    <ToneIcon tone="urgent" />
                  </span>
                  <span className="mm-focus-item__text">
                    {item.text}
                    <small className="mm-focus-item__meta">
                      {item.deadline ? t.due(item.deadline) : item.phase || t.recommendedNow}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mm-focus-list">
              {briefing.items.map((item) => (
                <li key={item.key} className={`mm-focus-item tone-${item.tone}`}>
                  <span className="mm-focus-item__icon" aria-hidden="true">
                    <ToneIcon tone={item.tone} />
                  </span>
                  <span className="mm-focus-item__text">{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mm-dash__card">
          <header className="mm-dash__card-head">
            <h3>{t.activityTitle}</h3>
          </header>
          {activity.length > 0 ? (
            <ul className="mm-activity-list">
              {activity.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <span className="mm-activity__time">
                    {new Date(item.time).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className="mm-activity__text">{item.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mm-dash__empty">{t.activityEmpty}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function ToneIcon({ tone }: { tone: BriefingTone }) {
  if (tone === 'urgent') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z" />
      </svg>
    );
  }
  if (tone === 'good') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

type BudgetPanelProps = {
  budgetItems: BudgetItem[];
  budgetSuggestions: BudgetItem[];
  plannerProfile: PlannerProfile;
  budgetDraft: BudgetItem;
  setBudgetDraft: Dispatch<SetStateAction<BudgetItem>>;
  addBudgetItem: (event: FormEvent) => void;
  addSuggestedBudgetItem: (item: BudgetItem) => void;
  updateBudgetItem: (id: string, patch: Partial<BudgetItem>) => void;
  removeBudgetItem: (id: string) => void;
  exportBudgetCsv: () => void;
  totalPlanned: number;
  totalActual: number;
  totalPaid: number;
};

export function BudgetPanel({
  budgetItems,
  budgetSuggestions,
  plannerProfile,
  budgetDraft,
  setBudgetDraft,
  addBudgetItem,
  addSuggestedBudgetItem,
  updateBudgetItem,
  removeBudgetItem,
  exportBudgetCsv,
  totalPlanned,
  totalActual,
  totalPaid
}: BudgetPanelProps) {
  const [budgetView, setBudgetView] = useState<'all' | 'attention' | 'unpaid' | 'done'>('all');
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
  const [isBudgetAddOpen, setIsBudgetAddOpen] = useState(false);
  const remainingToPay = Math.max(totalActual - totalPaid, 0);
  const plannedBalance = totalPlanned - totalActual;
  const paidProgress = totalActual > 0 ? Math.min(100, Math.round((totalPaid / totalActual) * 100)) : 0;
  const overBudgetItems = budgetItems.filter((item) => item.actual > item.planned && item.planned > 0);
  const activeBudgetItems = budgetItems.filter((item) => item.status !== 'done').length;
  const unpaidItems = budgetItems.filter((item) => Math.max(item.actual - item.paid, 0) > 0);
  const completedBudgetItems = budgetItems.filter((item) => item.status === 'done');
  const budgetViewOptions = [
    { value: 'all' as const, label: 'All', count: budgetItems.length },
    { value: 'attention' as const, label: 'Needs attention', count: overBudgetItems.length },
    { value: 'unpaid' as const, label: 'To pay', count: unpaidItems.length },
    { value: 'done' as const, label: 'Done', count: completedBudgetItems.length }
  ];
  const filteredBudgetItems = budgetItems.filter((item) => {
    if (budgetView === 'attention') return item.actual > item.planned && item.planned > 0;
    if (budgetView === 'unpaid') return Math.max(item.actual - item.paid, 0) > 0;
    if (budgetView === 'done') return item.status === 'done';
    return true;
  });
  const budgetHealth = overBudgetItems.length > 0
    ? `${overBudgetItems.length} over budget`
    : totalActual > 0
      ? 'On track'
      : 'Ready to plan';
  const largestActualItem = [...budgetItems].sort((first, second) => second.actual - first.actual)[0];
  const paidBarWidth = totalActual > 0 ? paidProgress : 0;
  const normalizedBudgetCategories = budgetItems.map((item) => item.category.trim().toLowerCase());
  const missingSuggestions = budgetSuggestions.filter((item) => !normalizedBudgetCategories.includes(item.category.trim().toLowerCase())).slice(0, 6);
  const suggestionBase = Math.max(plannerProfile.totalBudget, totalPlanned, totalActual, 30000);
  const cateringItem = budgetItems.find((item) => /cater|katering|catering/i.test(item.category));
  const contingencyItem = budgetItems.find((item) => /contingency|kecemasan|buffer/i.test(item.category));
  const cateringBudget = cateringItem ? Math.max(cateringItem.actual, cateringItem.planned) : 0;
  const cateringPerPax = plannerProfile.guestTarget > 0 && cateringBudget > 0 ? Math.round(cateringBudget / plannerProfile.guestTarget) : 0;
  const budgetPerPax = plannerProfile.guestTarget > 0 && suggestionBase > 0 ? Math.round(suggestionBase / plannerProfile.guestTarget) : 0;
  const budgetRisk = !plannerProfile.guestTarget
    ? 'Add guest target for better budget checks'
    : !cateringItem
      ? 'Catering category missing'
      : cateringPerPax > 0 && cateringPerPax < 18
        ? `Catering looks low at ${money(cateringPerPax)} per pax`
        : budgetPerPax > 0 && budgetPerPax < 80
          ? `Overall budget is tight at ${money(budgetPerPax)} per pax`
          : !contingencyItem || contingencyItem.planned === 0
            ? 'Add a contingency buffer'
            : overBudgetItems.length > 0
              ? `${overBudgetItems.length} category needs review`
              : 'Budget looks balanced';
  const budgetRiskDetail = budgetRisk === 'Budget looks balanced'
    ? 'No obvious risk from current totals. Keep actual costs updated.'
    : 'Use this as a planning signal, then adjust based on your real vendor quotes.';
  const budgetAllocation = [
    { label: 'Venue / Dewan', percent: 0.24, hint: 'Hall, room, basic facilities, parking' },
    { label: 'Catering', percent: 0.34, hint: 'Food usually scales with guest count' },
    { label: 'Pelamin & Dekorasi', percent: 0.1, hint: 'Backdrop, florals, walkway, ambience' },
    { label: 'Baju / Andaman', percent: 0.1, hint: 'Attire, makeup, fitting, accessories' },
    { label: 'Photo & Video', percent: 0.1, hint: 'Coverage, editing, album, highlight video' },
    { label: 'Contingency', percent: 0.07, hint: 'Buffer for last-minute changes' },
    { label: 'Others', percent: 0.05, hint: 'Door gifts, transport, stationery, crew meals' }
  ];
  const findBudgetByAllocation = (label: string) => {
    const normalizedLabel = label.toLowerCase();
    return budgetItems.find((item) => {
      const category = item.category.toLowerCase();
      if (normalizedLabel.includes('baju')) return category.includes('baju') || category.includes('andaman') || category.includes('mua');
      if (normalizedLabel.includes('photo')) return category.includes('photo') || category.includes('video') || category.includes('foto');
      if (normalizedLabel.includes('others')) return category.includes('cenderahati') || category.includes('hantaran') || category.includes('transport');
      return normalizedLabel.split('/')[0].trim().split(' ')[0] && category.includes(normalizedLabel.split('/')[0].trim().toLowerCase());
    });
  };
  const applyBudgetAllocation = () => {
    budgetAllocation.forEach((allocation) => {
      const matchedItem = findBudgetByAllocation(allocation.label);
      if (matchedItem) {
        updateBudgetItem(matchedItem.id, { planned: Math.round(suggestionBase * allocation.percent) });
      }
    });
  };

  return (
    <div className="planner-panel budget-panel budget-command-center">
      <div className="planner-panel-header budget-hero-modern">
        <div>
          <p className="eyebrow">Budget tracker</p>
          <h3>Wedding budget overview</h3>
          <p>See what is planned, what has changed, and what still needs payment without editing every row at once.</p>
        </div>
        <div className="budget-hero-actions">
          <span className={overBudgetItems.length > 0 ? 'budget-health warning' : 'budget-health'}>{budgetHealth}</span>
          <button type="button" className="primary-action" onClick={() => setIsBudgetAddOpen(true)}>Add category</button>
          <button type="button" className="utility-action" onClick={exportBudgetCsv} disabled={budgetItems.length === 0}>Export CSV</button>
        </div>
      </div>

      <div className="budget-focus-grid" aria-label="Budget summary">
        <article className="budget-focus-card">
          <span>Total actual</span>
          <strong>{money(totalActual)}</strong>
          <p>{plannedBalance >= 0 ? `${money(plannedBalance)} within plan` : `${money(Math.abs(plannedBalance))} over planned budget`}</p>
          <div className="budget-meter" aria-label={`${paidProgress}% paid`}>
            <span style={{ width: `${paidBarWidth}%` }} />
          </div>
          <small>{paidProgress}% paid</small>
        </article>

        <article>
          <span>Planned</span>
          <strong>{money(totalPlanned)}</strong>
          <p>{budgetItems.length} categories</p>
        </article>

        <article>
          <span>Paid</span>
          <strong>{money(totalPaid)}</strong>
          <p>{completedBudgetItems.length} completed</p>
        </article>

        <article>
          <span>To pay</span>
          <strong>{money(remainingToPay)}</strong>
          <p>{activeBudgetItems} active categor{activeBudgetItems === 1 ? 'y' : 'ies'}</p>
        </article>
      </div>

      <div className="budget-workspace">
        <section className="budget-main">
          <div className="budget-toolbar">
            <div className="budget-view-tabs" role="tablist" aria-label="Budget views">
              {budgetViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={budgetView === option.value}
                  className={budgetView === option.value ? 'active' : ''}
                  onClick={() => setBudgetView(option.value)}
                >
                  {option.label}
                  <span>{option.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="budget-list-modern">
            {filteredBudgetItems.length > 0 ? filteredBudgetItems.map((item) => {
              const remaining = Math.max(item.actual - item.paid, 0);
              const isExpanded = expandedBudgetId === item.id;
              const isOverBudget = item.actual > item.planned && item.planned > 0;
              const itemProgress = item.actual > 0 ? Math.min(100, Math.round((item.paid / item.actual) * 100)) : 0;
              const depositAmount = Math.round((item.actual || item.planned) * 0.5);
              const isFullyPaid = item.actual > 0 && item.paid >= item.actual;
              const hasActual = item.actual > 0;
              const actualDiffersFromPlanned = item.actual > 0 && item.actual !== item.planned;

              return (
                <article key={item.id} className={`budget-row-card ${isExpanded ? 'expanded' : ''} ${isOverBudget ? 'warning' : ''} ${isFullyPaid ? 'fully-paid' : ''}`}>
                  <button
                    type="button"
                    className="budget-row-summary"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedBudgetId(isExpanded ? null : item.id)}
                  >
                    <span className="budget-category-dot" aria-hidden="true" />
                    <span className="budget-row-title">
                      <strong>{item.category}</strong>
                      <small>{item.note || (remaining > 0 ? `${money(remaining)} lagi belum bayar` : isFullyPaid ? 'Sudah bayar penuh' : 'Belum ada nota')}</small>
                    </span>
                    <span className="budget-row-amount">
                      {actualDiffersFromPlanned ? (
                        <>
                          <strong>{money(item.actual)}</strong>
                          <small className="budget-planned-hint">Anggaran {money(item.planned)}</small>
                        </>
                      ) : (
                        <>
                          <strong>{money(item.actual || item.planned)}</strong>
                          <small>{itemProgress}% bayar</small>
                        </>
                      )}
                    </span>
                    <span className={`budget-status ${item.status}`}>{statusLabel(item.status)}</span>
                  </button>

                  <div className="budget-row-meter">
                    <span style={{ width: `${itemProgress}%` }} />
                  </div>

                  {!isExpanded && !isFullyPaid && (hasActual || item.planned > 0) ? (
                    <div className="budget-quick-pay">
                      {item.paid < depositAmount ? (
                        <button
                          type="button"
                          className="budget-pay-deposit"
                          onClick={(e) => { e.stopPropagation(); updateBudgetItem(item.id, { paid: depositAmount, status: 'in-progress' }); }}
                        >
                          Bayar deposit ({money(depositAmount)})
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="budget-pay-full"
                        onClick={(e) => { e.stopPropagation(); updateBudgetItem(item.id, { paid: item.actual || item.planned, status: 'done' }); }}
                      >
                        Bayar penuh
                      </button>
                    </div>
                  ) : null}

                  {isExpanded ? (
                    <div className="budget-edit-panel">
                      <label>
                        <span>Category</span>
                        <input value={item.category} onChange={(event) => updateBudgetItem(item.id, { category: event.target.value })} aria-label="Budget category" />
                      </label>
                      <label>
                        <span>Planned</span>
                        <input type="number" value={item.planned} onChange={(event) => updateBudgetItem(item.id, { planned: Number(event.target.value) })} aria-label="Planned budget" />
                      </label>
                      <label>
                        <span>Actual</span>
                        <input type="number" value={item.actual} onChange={(event) => updateBudgetItem(item.id, { actual: Number(event.target.value) })} aria-label="Actual cost" />
                      </label>
                      <label>
                        <span>Paid</span>
                        <input type="number" value={item.paid} onChange={(event) => updateBudgetItem(item.id, { paid: Number(event.target.value) })} aria-label="Paid amount" />
                      </label>
                      <label>
                        <span>Status</span>
                        <select value={item.status} onChange={(event) => updateBudgetItem(item.id, { status: event.target.value as BudgetItem['status'] })} aria-label="Budget status">
                          <option value="not-started">Belum Mula</option>
                          <option value="in-progress">Sedang Diurus</option>
                          <option value="done">Selesai</option>
                        </select>
                      </label>
                      <label className="budget-note-field">
                        <span>Note</span>
                        <input value={item.note} onChange={(event) => updateBudgetItem(item.id, { note: event.target.value })} placeholder="Vendor, due date, or payment note..." aria-label="Budget note" />
                      </label>
                      {isOverBudget ? <p className="budget-warning-text">Over budget by {money(item.actual - item.planned)}</p> : null}
                      <div className="budget-edit-actions">
                        <button type="button" onClick={() => setExpandedBudgetId(null)}>Done editing</button>
                        <button type="button" className="danger" onClick={() => removeBudgetItem(item.id)}>Remove</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            }) : (
              <div className="empty-state action-empty">
                <strong>No budget items in this view.</strong>
                <span>Switch to All or add a new category.</span>
                <button type="button" onClick={() => setIsBudgetAddOpen(true)}>Add category</button>
              </div>
            )}
          </div>
        </section>

        <aside className={`budget-side-panel ${isBudgetAddOpen ? 'add-open' : ''}`}>
          {isBudgetAddOpen ? (
          <form
            className="budget-add-card budget-add-modern"
            onSubmit={(event) => {
              const shouldClose = budgetDraft.category.trim().length > 0;
              addBudgetItem(event);
              if (shouldClose) setIsBudgetAddOpen(false);
            }}
          >
            <div>
              <p className="eyebrow">New category</p>
              <h4>Add budget item</h4>
            </div>
        <label>
          <span>Category</span>
          <input value={budgetDraft.category} onChange={(event) => setBudgetDraft((current) => ({ ...current, category: event.target.value }))} placeholder="e.g. Door gift" aria-label="Budget category" />
        </label>
        <label>
          <span>Planned</span>
          <input type="number" value={budgetDraft.planned} onChange={(event) => setBudgetDraft((current) => ({ ...current, planned: Number(event.target.value) }))} placeholder="RM" aria-label="Planned budget" />
        </label>
        <label>
          <span>Actual</span>
          <input type="number" value={budgetDraft.actual} onChange={(event) => setBudgetDraft((current) => ({ ...current, actual: Number(event.target.value) }))} placeholder="RM" aria-label="Actual cost" />
        </label>
        <label>
          <span>Paid</span>
          <input type="number" value={budgetDraft.paid} onChange={(event) => setBudgetDraft((current) => ({ ...current, paid: Number(event.target.value) }))} placeholder="RM" aria-label="Paid amount" />
        </label>
        <div className="budget-edit-actions">
          <button type="submit" disabled={!budgetDraft.category.trim()}>Add item</button>
          <button type="button" className="danger" onClick={() => setIsBudgetAddOpen(false)}>Cancel</button>
        </div>
          </form>
          ) : null}

          <div className="budget-insight-card">
            <span>AI budget check</span>
            <strong>{budgetRisk}</strong>
            <p>
              {largestActualItem && largestActualItem.actual > 0 && budgetRisk === 'Budget looks balanced'
                ? `${money(largestActualItem.actual)} is currently the largest actual cost.`
                : budgetRiskDetail}
            </p>
          </div>

          <div className="budget-allocation-card">
            <span>Suggested split</span>
            <strong>{money(suggestionBase)} planning guide</strong>
            <p>Use this as a starting point, then adjust based on venue style and guest count.</p>
            <div className="budget-allocation-list">
              {budgetAllocation.map((allocation) => (
                <div key={allocation.label}>
                  <span>
                    <strong>{allocation.label}</strong>
                    <small>{allocation.hint}</small>
                  </span>
                  <em>{money(Math.round(suggestionBase * allocation.percent))}</em>
                </div>
              ))}
            </div>
            <button type="button" onClick={applyBudgetAllocation}>Apply suggested split</button>
          </div>

          <div className="budget-suggestion-card">
            <span>Budget suggestions</span>
            <strong>Common costs couples forget</strong>
            <p>Add these when they apply to your majlis. You can edit the estimate later.</p>
            {missingSuggestions.length > 0 ? (
              <div className="budget-suggestion-list">
                {missingSuggestions.map((item) => (
                  <button key={item.id} type="button" onClick={() => addSuggestedBudgetItem(item)}>
                    <span>
                      <strong>{item.category}</strong>
                      <small>{item.note}</small>
                    </span>
                    <em>{money(item.planned)}</em>
                  </button>
                ))}
              </div>
            ) : (
              <small>Nice, you already covered the common suggestion list.</small>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

type RsvpPanelProps = {
  guests: Guest[];
  guestDraft: Guest;
  setGuestDraft: Dispatch<SetStateAction<Guest>>;
  addGuest: (event: FormEvent) => void;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  removeGuest: (id: string) => void;
  exportGuestsCsv: () => void;
  importGuestsCsv: (file: File | undefined) => void;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  language: AppLanguage;
  coupleNames: string;
  weddingDate: string;
  venue: string;
  time: string;
  location: string;
  contact: string;
  rsvpFormUrl: string;
  onChangeRsvpFormUrl: (url: string) => void;
};

export function RsvpPanel({
  guests,
  guestDraft,
  setGuestDraft,
  addGuest,
  updateGuest,
  removeGuest,
  exportGuestsCsv,
  importGuestsCsv,
  confirmedGuests,
  pendingGuests,
  declinedGuests,
  language,
  coupleNames,
  weddingDate,
  venue,
  time,
  location,
  contact,
  rsvpFormUrl,
  onChangeRsvpFormUrl
}: RsvpPanelProps) {
  const [guestView, setGuestView] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('all');
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>(null);
  const [isGuestAddOpen, setIsGuestAddOpen] = useState(false);
  const [isRsvpShareOpen, setIsRsvpShareOpen] = useState(false);
  const [isOwnFormOpen, setIsOwnFormOpen] = useState(false);
  const [rsvpUrlDraft, setRsvpUrlDraft] = useState(rsvpFormUrl);
  const [rsvpCopied, setRsvpCopied] = useState(false);
  // Resolved on the client only, to avoid an SSR/CSR hydration mismatch.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const guestImportRef = useRef<HTMLInputElement | null>(null);
  // Native in-app RSVP page is the default share target; a couple's own hosted
  // form (if set) overrides it.
  const nativeRsvpUrl = buildRsvpPageUrl(origin, {
    couple: coupleNames,
    date: weddingDate,
    time,
    venue,
    location,
    contact,
    lang: language
  });
  const effectiveRsvpUrl = rsvpFormUrl.trim() ? normalizeFormUrl(rsvpFormUrl) : nativeRsvpUrl;
  const usingOwnForm = Boolean(rsvpFormUrl.trim());
  const totalPax = guests.reduce((sum, guest) => sum + guest.pax, 0);
  const guestGroups = Array.from(new Set(guests.map((guest) => guest.group).filter(Boolean)));
  const filteredGuests = guests.filter((guest) => guestView === 'all' || guest.status === guestView);
  const guestViewOptions = [
    { value: 'all' as const, label: 'All', count: guests.length },
    { value: 'pending' as const, label: 'Pending', count: guests.filter((guest) => guest.status === 'pending').length },
    { value: 'confirmed' as const, label: 'Confirmed', count: guests.filter((guest) => guest.status === 'confirmed').length },
    { value: 'declined' as const, label: 'Declined', count: guests.filter((guest) => guest.status === 'declined').length }
  ];
  const topGroup = guestGroups
    .map((group) => ({
      group,
      pax: guests.filter((guest) => guest.group === group).reduce((sum, guest) => sum + guest.pax, 0)
    }))
    .sort((first, second) => second.pax - first.pax)[0];

  return (
    <div className="planner-panel guest-command-center">
      <div className="planner-panel-header guest-hero-modern">
        <div>
          <p className="eyebrow">RSVP manager</p>
          <h3>Guest list and headcount</h3>
          <p>Track attendance by household, group, and pax without turning the page into a spreadsheet.</p>
        </div>
        <div className="guest-header-actions">
          <button type="button" className="primary-action" onClick={() => setIsGuestAddOpen(true)}>Add guest</button>
          <button
            type="button"
            className="utility-action"
            onClick={() => {
              setRsvpUrlDraft(rsvpFormUrl);
              setIsRsvpShareOpen((open) => !open);
            }}
            aria-expanded={isRsvpShareOpen}
          >
            {language === 'ms' ? 'Kongsi RSVP' : 'Share RSVP'}
          </button>
          <button type="button" className="utility-action" onClick={() => guestImportRef.current?.click()}>Import CSV</button>
          <button type="button" className="utility-action" onClick={exportGuestsCsv} disabled={guests.length === 0}>Export CSV</button>
          <input
            ref={guestImportRef}
            className="visually-hidden"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              importGuestsCsv(event.target.files?.[0]);
              event.currentTarget.value = '';
            }}
          />
        </div>
      </div>

      {isRsvpShareOpen ? (
        <div className="rsvp-share-card">
          <div className="rsvp-share-head">
            <div>
              <strong>{language === 'ms' ? 'Pautan RSVP anda' : 'Your RSVP link'}</strong>
              <p>
                {usingOwnForm
                  ? language === 'ms'
                    ? 'Menggunakan borang anda sendiri. Kongsi pautan dengan tetamu; import respons melalui "Import CSV".'
                    : 'Using your own form. Share the link with guests; import responses via "Import CSV".'
                  : language === 'ms'
                    ? 'Halaman RSVP siap sedia dari butiran majlis anda. Kongsi dengan tetamu — jawapan mereka dihantar kepada anda melalui WhatsApp.'
                    : 'A ready-made RSVP page from your wedding details. Share it with guests — their replies come to you via WhatsApp.'}
              </p>
            </div>
            <button type="button" className="rsvp-share-close" aria-label={language === 'ms' ? 'Tutup' : 'Close'} onClick={() => setIsRsvpShareOpen(false)}>×</button>
          </div>

          <div className="rsvp-link-display" title={effectiveRsvpUrl}>{effectiveRsvpUrl || '…'}</div>

          <div className="rsvp-share-actions">
            <a className="utility-action" href={effectiveRsvpUrl || '#'} target="_blank" rel="noopener noreferrer">
              {language === 'ms' ? 'Buka' : 'Open'}
            </a>
            <button
              type="button"
              className="utility-action"
              disabled={!effectiveRsvpUrl}
              onClick={() => {
                navigator.clipboard?.writeText(effectiveRsvpUrl).then(() => {
                  setRsvpCopied(true);
                  window.setTimeout(() => setRsvpCopied(false), 1800);
                });
              }}
            >
              {rsvpCopied ? (language === 'ms' ? 'Disalin ✓' : 'Copied ✓') : (language === 'ms' ? 'Salin pautan' : 'Copy link')}
            </button>
            <a
              className="primary-action"
              href={buildWhatsAppShareUrl(buildRsvpInviteMessage({ coupleNames, weddingDate, venue, formUrl: effectiveRsvpUrl, language }))}
              target="_blank"
              rel="noopener noreferrer"
            >
              {language === 'ms' ? 'Kongsi WhatsApp' : 'Share on WhatsApp'}
            </a>
          </div>

          <button
            type="button"
            className="rsvp-ownform-toggle"
            aria-expanded={isOwnFormOpen}
            onClick={() => { setRsvpUrlDraft(rsvpFormUrl); setIsOwnFormOpen((open) => !open); }}
          >
            {language === 'ms' ? 'Guna borang sendiri (pilihan)' : 'Use your own form (optional)'}
          </button>

          {isOwnFormOpen ? (
            <>
              <div className="rsvp-share-row">
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://forms.gle/..."
                  value={rsvpUrlDraft}
                  onChange={(event) => setRsvpUrlDraft(event.target.value)}
                  aria-label={language === 'ms' ? 'Pautan borang RSVP' : 'RSVP form link'}
                />
                <button
                  type="button"
                  className="primary-action"
                  disabled={!isValidFormUrl(rsvpUrlDraft) || normalizeFormUrl(rsvpUrlDraft) === rsvpFormUrl}
                  onClick={() => onChangeRsvpFormUrl(normalizeFormUrl(rsvpUrlDraft))}
                >
                  {language === 'ms' ? 'Simpan' : 'Save'}
                </button>
              </div>
              {rsvpUrlDraft.trim() && !isValidFormUrl(rsvpUrlDraft) ? (
                <p className="rsvp-share-error">{language === 'ms' ? 'Pautan tidak sah.' : 'That link looks invalid.'}</p>
              ) : null}
              {usingOwnForm ? (
                <button
                  type="button"
                  className="rsvp-ownform-toggle"
                  onClick={() => { onChangeRsvpFormUrl(''); setRsvpUrlDraft(''); }}
                >
                  {language === 'ms' ? 'Kembali ke halaman lalai' : 'Back to the default page'}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      <div className="guest-focus-grid" aria-label="Guest headcount summary">
        <article className="guest-focus-card">
          <span>Total pax</span>
          <strong>{totalPax}</strong>
          <p>{guests.length} guest record{guests.length === 1 ? '' : 's'}</p>
        </article>
        <article><span>Confirmed</span><strong>{confirmedGuests}</strong><p>ready for caterer</p></article>
        <article><span>Pending</span><strong>{pendingGuests}</strong><p>need follow-up</p></article>
        <article><span>Declined</span><strong>{declinedGuests}</strong><p>not attending</p></article>
      </div>

      <div className="guest-workspace">
        <section className="guest-main">
          <div className="guest-toolbar">
            <div className="guest-view-tabs" role="tablist" aria-label="Guest views">
              {guestViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={guestView === option.value}
                  className={guestView === option.value ? 'active' : ''}
                  onClick={() => setGuestView(option.value)}
                >
                  {option.label}
                  <span>{option.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="guest-list-modern">
            {filteredGuests.length > 0 ? filteredGuests.map((guest) => {
              const isExpanded = expandedGuestId === guest.id;

              return (
                <article key={guest.id} className={`guest-row-card ${isExpanded ? 'expanded' : ''}`}>
                  <button
                    type="button"
                    className="guest-row-summary"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedGuestId(isExpanded ? null : guest.id)}
                  >
                    <span className="guest-avatar" aria-hidden="true">{guest.name.slice(0, 1).toUpperCase()}</span>
                    <span className="guest-row-title">
                      <strong>{guest.name}</strong>
                      <small>{guest.phone || 'No phone'} - {guest.group}</small>
                    </span>
                    <span className="guest-pax">{guest.pax} pax</span>
                    <span className={`guest-status ${guest.status}`}>{rsvpLabel(guest.status)}</span>
                  </button>

                  {isExpanded ? (
                    <div className="guest-edit-panel">
                      <label>
                        <span>Name</span>
                        <input value={guest.name} onChange={(event) => updateGuest(guest.id, { name: event.target.value })} aria-label="Guest name" />
                      </label>
                      <label>
                        <span>Phone</span>
                        <input value={guest.phone} onChange={(event) => updateGuest(guest.id, { phone: event.target.value })} aria-label="Guest phone" />
                      </label>
                      <label>
                        <span>Group</span>
                        <input value={guest.group} onChange={(event) => updateGuest(guest.id, { group: event.target.value })} aria-label="Guest group" />
                      </label>
                      <label>
                        <span>Pax</span>
                        <input type="number" min="1" value={guest.pax} onChange={(event) => updateGuest(guest.id, { pax: Number(event.target.value) || 1 })} aria-label="Guest pax" />
                      </label>
                      <label>
                        <span>Status</span>
                        <select value={guest.status} onChange={(event) => updateGuest(guest.id, { status: event.target.value as Guest['status'] })} aria-label={`RSVP status for ${guest.name}`}>
                          <option value="pending">Belum Reply</option>
                          <option value="confirmed">Confirm Hadir</option>
                          <option value="declined">Tidak Hadir</option>
                        </select>
                      </label>
                      <div className="guest-edit-actions">
                        <button type="button" onClick={() => setExpandedGuestId(null)}>Done editing</button>
                        <button type="button" className="danger" onClick={() => removeGuest(guest.id)}>Remove</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            }) : (
              <div className="empty-state action-empty">
                <strong>No guests in this view.</strong>
                <span>Switch tabs or add a guest from the side panel.</span>
                <button type="button" onClick={() => setIsGuestAddOpen(true)}>Add guest</button>
              </div>
            )}
          </div>
        </section>

        <aside className={`guest-side-panel ${isGuestAddOpen ? 'add-open' : ''}`}>
          {isGuestAddOpen ? (
          <form
            className="guest-add-card"
            onSubmit={(event) => {
              const shouldClose = guestDraft.name.trim().length > 0;
              addGuest(event);
              if (shouldClose) setIsGuestAddOpen(false);
            }}
          >
            <div>
              <p className="eyebrow">New guest</p>
              <h4>Add guest</h4>
            </div>
            <input value={guestDraft.name} onChange={(event) => setGuestDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Guest name" aria-label="Guest name" />
            <input value={guestDraft.phone} onChange={(event) => setGuestDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" aria-label="Guest phone" />
            <select value={guestDraft.group} onChange={(event) => setGuestDraft((current) => ({ ...current, group: event.target.value }))} aria-label="Guest group">
              <option>Tetamu Ayah</option>
              <option>Tetamu Ibu</option>
              <option>Adik Beradik</option>
              <option>Kawan-kawan</option>
              <option>Rakan Sekerja</option>
              <option>VIP</option>
            </select>
            <input type="number" min="1" value={guestDraft.pax} onChange={(event) => setGuestDraft((current) => ({ ...current, pax: Number(event.target.value) || 1 }))} aria-label="Guest pax" />
            <select value={guestDraft.status} onChange={(event) => setGuestDraft((current) => ({ ...current, status: event.target.value as Guest['status'] }))} aria-label="RSVP status">
              <option value="pending">Belum Reply</option>
              <option value="confirmed">Confirm Hadir</option>
              <option value="declined">Tidak Hadir</option>
            </select>
            <div className="guest-edit-actions">
              <button type="submit" disabled={!guestDraft.name.trim()}>Add guest</button>
              <button type="button" className="danger" onClick={() => setIsGuestAddOpen(false)}>Cancel</button>
            </div>
          </form>
          ) : null}

          <div className="guest-insight-card">
            <span>Headcount insight</span>
            <strong>{topGroup ? topGroup.group : 'No groups yet'}</strong>
            <p>{topGroup ? `${topGroup.pax} pax in this group.` : 'Add guests to see the largest guest group.'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

type VendorsPanelProps = {
  filteredVendors: Vendor[];
  vendorStates: string[];
  vendorCategories: string[];
  vendorFilter: { negeri: string; category: string };
  setVendorFilter: Dispatch<SetStateAction<{ negeri: string; category: string }>>;
  savedVendors: string[];
  toggleSavedVendor: (id: string) => void;
  askVendorMessage: (vendor: Vendor) => void;
  askVendorQuestions: (vendor: Vendor) => void;
  askVendorComparison: (vendors: Vendor[]) => void;
  addVendorToBudget: (vendor: Vendor) => void;
  language?: AppLanguage;
  defaultNegeri?: string;
  onSearchNearby?: () => void;
  searchLoading?: boolean;
  searchInfo?: string;
};

export function VendorsPanel({
  filteredVendors,
  vendorStates,
  vendorCategories,
  vendorFilter,
  setVendorFilter,
  savedVendors,
  toggleSavedVendor,
  askVendorMessage,
  askVendorQuestions,
  askVendorComparison,
  addVendorToBudget,
  language = 'ms',
  defaultNegeri = '',
  onSearchNearby,
  searchLoading = false,
  searchInfo = ''
}: VendorsPanelProps) {
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [compareVendorIds, setCompareVendorIds] = useState<string[]>([]);
  const mapQueryBase = (vendor: Vendor) => encodeURIComponent(`${vendor.name} ${vendor.category} ${vendor.negeri} Malaysia`);
  // Free, no-key way to surface real nearby vendors: open Google Maps search.
  // Maps centres on the user's location automatically, so results are "nearby".
  const browseNegeri = vendorFilter.negeri !== 'All' ? vendorFilter.negeri : defaultNegeri;
  const browseTerm = vendorFilter.category !== 'All' ? vendorFilter.category : (language === 'ms' ? 'vendor kahwin' : 'wedding vendor');
  const browseMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${browseTerm} kahwin ${browseNegeri} Malaysia`.replace(/\s+/g, ' ').trim()
  )}`;
  const selectedMapVendor = filteredVendors.find((vendor) => savedVendors.includes(vendor.id)) || filteredVendors[0];
  const comparedVendors = compareVendorIds
    .map((id) => filteredVendors.find((vendor) => vendor.id === id))
    .filter((vendor): vendor is Vendor => Boolean(vendor));
  const toggleCompareVendor = (id: string) => {
    setCompareVendorIds((current) => {
      if (current.includes(id)) return current.filter((vendorId) => vendorId !== id);
      return [...current, id].slice(-3);
    });
  };

  return (
    <div className="planner-panel vendor-discovery-panel">
      <div className="planner-panel-header vendor-page-header">
        <div>
          <p className="eyebrow">Vendor directory</p>
          <h3>Curated Malaysia vendor shortlist</h3>
          <p>Explore vendors by location, compare price ranges, and draft outreach messages faster.</p>
        </div>
        <div className="vendor-header-actions">
          <span className="status-pill">{savedVendors.length} shortlisted</span>
          {compareVendorIds.length > 0 ? <span className="status-pill">{compareVendorIds.length}/3 comparing</span> : null}
        </div>
      </div>

      <div className="vendor-filter-bar">
        <label>
          <span>Negeri</span>
          <select value={vendorFilter.negeri} onChange={(event) => setVendorFilter((current) => ({ ...current, negeri: event.target.value }))} aria-label="Filter vendor negeri">
            <option value="All">All negeri</option>
            {vendorStates.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <label>
          <span>Category</span>
          <select value={vendorFilter.category} onChange={(event) => setVendorFilter((current) => ({ ...current, category: event.target.value }))} aria-label="Filter vendor category">
            <option value="All">All categories</option>
            {vendorCategories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <span className="vendor-result-count">{filteredVendors.length} result{filteredVendors.length === 1 ? '' : 's'}</span>
        <a
          className="vendor-search-nearby"
          href={browseMapsUrl}
          target="_blank"
          rel="noreferrer"
        >
          {language === 'ms' ? '🗺️ Cari berdekatan di Google Maps' : '🗺️ Find nearby on Google Maps'}
        </a>
        {onSearchNearby ? (
          <button
            type="button"
            className="vendor-search-import"
            onClick={onSearchNearby}
            disabled={searchLoading}
            title={language === 'ms' ? 'Import hasil ke dalam app (perlu API key)' : 'Import results into the app (needs API key)'}
          >
            {searchLoading
              ? (language === 'ms' ? 'Mengimport…' : 'Importing…')
              : (language === 'ms' ? 'Import ke app' : 'Import to app')}
          </button>
        ) : null}
      </div>
      {searchInfo ? <p className="vendor-search-info">{searchInfo}</p> : null}
      <p className="vendor-search-hint">
        {language === 'ms'
          ? 'Butang Google Maps adalah percuma — ia buka carian vendor sebenar berhampiran anda.'
          : 'The Google Maps button is free — it opens a real nearby vendor search.'}
      </p>

      {selectedMapVendor ? (
        <section className="vendor-map-panel" aria-label="Google Maps vendor preview">
          <div className="vendor-map-info">
            <p className="eyebrow">Map preview</p>
            <h4>{selectedMapVendor.name}</h4>
            <span>{selectedMapVendor.category} in {selectedMapVendor.negeri}</span>
            <p>{money(selectedMapVendor.minPrice)} - {money(selectedMapVendor.maxPrice)}</p>
            <div className="vendor-map-actions">
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapQueryBase(selectedMapVendor)}`} target="_blank" rel="noreferrer">
                View map
              </a>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQueryBase(selectedMapVendor)}`} target="_blank" rel="noreferrer">
                Directions
              </a>
            </div>
          </div>
          <iframe
            title={`Google Maps preview for ${selectedMapVendor.name}`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${mapQueryBase(selectedMapVendor)}&output=embed`}
          />
        </section>
      ) : null}

      {comparedVendors.length > 0 ? (
        <section className="vendor-compare-panel" aria-label="Vendor comparison">
          <div className="vendor-compare-header">
            <div>
              <p className="eyebrow">Compare</p>
              <h4>Shortlist side by side</h4>
            </div>
            <div className="vendor-compare-actions">
              {comparedVendors.length >= 2 ? (
                <button type="button" className="primary" onClick={() => askVendorComparison(comparedVendors)}>Ask AI</button>
              ) : null}
              <button type="button" onClick={() => setCompareVendorIds([])}>Clear</button>
            </div>
          </div>
          <div className="vendor-compare-grid">
            {comparedVendors.map((vendor) => (
              <article key={vendor.id}>
                <strong>{vendor.name}</strong>
                <span>{vendor.category} - {vendor.negeri}</span>
                <dl>
                  <div>
                    <dt>Price</dt>
                    <dd>{money(vendor.minPrice)} - {money(vendor.maxPrice)}</dd>
                  </div>
                  <div>
                    <dt>Rating</dt>
                    <dd>{vendor.rating.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>Contact</dt>
                    <dd>{vendor.contact}</dd>
                  </div>
                </dl>
                <button type="button" onClick={() => setSelectedVendor(vendor)}>Open details</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="vendor-grid">
        {filteredVendors.map((vendor) => (
          <article key={vendor.id} className="vendor-card">
            <div className="vendor-top">
              <div>
                <strong>{vendor.name}</strong>
                <span>{vendor.category} - {vendor.negeri}</span>
              </div>
              <span className="vendor-rating">{vendor.rating.toFixed(1)}</span>
            </div>
            <p>{vendor.note}</p>
            <div className="vendor-meta-row">
              <span>
                {vendor.minPrice > 0 || vendor.maxPrice > 0
                  ? `${money(vendor.minPrice)} - ${money(vendor.maxPrice)}`
                  : (language === 'ms' ? 'Harga: tanya vendor' : 'Price: ask vendor')}
              </span>
              {vendor.contact ? <span>{vendor.contact}</span> : null}
              {vendor.instagram ? <span>{vendor.instagram}</span> : null}
              {typeof vendor.ratingCount === 'number' && vendor.ratingCount > 0 ? (
                <span>{vendor.ratingCount} {language === 'ms' ? 'ulasan' : 'reviews'}</span>
              ) : null}
            </div>
            {vendor.source === 'google' ? (
              <div className="vendor-live-links">
                <span className="vendor-live-badge">{language === 'ms' ? 'Live · Google Maps' : 'Live · Google Maps'}</span>
                {vendor.mapsUri ? (
                  <a href={vendor.mapsUri} target="_blank" rel="noreferrer">{language === 'ms' ? 'Lihat di Maps' : 'View on Maps'}</a>
                ) : null}
                {vendor.website ? (
                  <a href={vendor.website} target="_blank" rel="noreferrer">{language === 'ms' ? 'Laman web' : 'Website'}</a>
                ) : null}
              </div>
            ) : null}
            <div className="vendor-actions">
              <button type="button" className={savedVendors.includes(vendor.id) ? 'is-saved' : ''} onClick={() => toggleSavedVendor(vendor.id)}>
                {savedVendors.includes(vendor.id) ? 'Shortlisted' : 'Shortlist'}
              </button>
              <button type="button" className={compareVendorIds.includes(vendor.id) ? 'is-saved' : ''} onClick={() => toggleCompareVendor(vendor.id)}>
                {compareVendorIds.includes(vendor.id) ? 'Comparing' : 'Compare'}
              </button>
              <button type="button" className="primary" onClick={() => askVendorMessage(vendor)}>Draft WhatsApp</button>
              <button type="button" onClick={() => setSelectedVendor(vendor)}>Details</button>
              <button type="button" onClick={() => askVendorQuestions(vendor)}>Questions</button>
              <button type="button" onClick={() => addVendorToBudget(vendor)}>Add to budget</button>
              <a href={`https://www.google.com/maps/search/?api=1&query=${mapQueryBase(vendor)}`} target="_blank" rel="noreferrer">
                View map
              </a>
            </div>
          </article>
        ))}
      </div>

      {selectedVendor ? (
        <>
          <button
            type="button"
            className="vendor-detail-backdrop"
            aria-label="Close vendor details"
            onClick={() => setSelectedVendor(null)}
          />
          <aside className="vendor-detail-drawer" aria-label={`${selectedVendor.name} vendor details`}>
            <div className="vendor-detail-header">
              <div>
                <p className="eyebrow">{selectedVendor.category}</p>
                <h3>{selectedVendor.name}</h3>
                <span>{selectedVendor.negeri} - {selectedVendor.rating.toFixed(1)} rating</span>
              </div>
              <button type="button" onClick={() => setSelectedVendor(null)}>Close</button>
            </div>
            <iframe
              title={`Google Maps detail for ${selectedVendor.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${mapQueryBase(selectedVendor)}&output=embed`}
            />
            <div className="vendor-detail-body">
              <article>
                <span>Price range</span>
                <strong>{money(selectedVendor.minPrice)} - {money(selectedVendor.maxPrice)}</strong>
              </article>
              <article>
                <span>Contact</span>
                <strong>{selectedVendor.contact}</strong>
                {selectedVendor.instagram ? <p>{selectedVendor.instagram}</p> : null}
              </article>
              <article>
                <span>Notes</span>
                <p>{selectedVendor.note}</p>
              </article>
            </div>
            <div className="vendor-detail-actions">
              <button type="button" className="primary" onClick={() => askVendorMessage(selectedVendor)}>Draft WhatsApp</button>
              <button type="button" onClick={() => askVendorQuestions(selectedVendor)}>Questions</button>
              <button type="button" onClick={() => addVendorToBudget(selectedVendor)}>Add to budget</button>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQueryBase(selectedVendor)}`} target="_blank" rel="noreferrer">
                Directions
              </a>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
