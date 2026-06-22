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
  language?: AppLanguage;
};

const budgetCopy = {
  ms: {
    eyebrow: 'Bajet majlis',
    ofPlanned: (planned: string) => ` / ${planned} dirancang`,
    paidMeta: (paid: string, left: string) => `${paid} dibayar · ${left} baki`,
    planned: 'Dirancang',
    paid: 'Dibayar',
    toPay: 'Perlu bayar',
    categories: 'Kategori',
    add: 'Tambah',
    more: 'Lagi pilihan',
    applySplit: 'Guna pecahan dicadang',
    exportCsv: 'Eksport CSV',
    categoryPh: 'Kategori (cth. Cenderahati)',
    plannedPh: 'Dirancang (RM)',
    actualPh: 'Sebenar (RM)',
    paidPh: 'Dibayar (RM)',
    addItem: 'Tambah kategori',
    emptyTitle: 'Tiada kategori dalam paparan ini.',
    emptyHint: 'Tukar ke "Semua" atau tambah kategori baharu.',
    views: { all: 'Semua', attention: 'Perlu perhatian', unpaid: 'Perlu bayar', done: 'Selesai' },
    health: { over: (n: number) => `${n} melebihi bajet`, onTrack: 'Terkawal', ready: 'Sedia merancang' },
    aiCheck: 'Semakan bajet AI',
    suggestedSplit: 'Pecahan dicadang',
    splitGuide: (base: string) => `Panduan ${base} — guna sebagai titik mula, kemudian laraskan ikut gaya dewan & jumlah tetamu.`,
    commonCosts: 'Kos yang sering terlupa',
    commonHint: 'Tambah bila relevan dengan majlis anda. Anda boleh edit anggaran kemudian.',
    largest: (amt: string) => `${amt} ialah kos sebenar paling tinggi sekarang.`,
    riskBalanced: 'Bajet nampak seimbang'
  },
  en: {
    eyebrow: 'Wedding budget',
    ofPlanned: (planned: string) => ` / ${planned} planned`,
    paidMeta: (paid: string, left: string) => `${paid} paid · ${left} left`,
    planned: 'Planned',
    paid: 'Paid',
    toPay: 'To pay',
    categories: 'Categories',
    add: 'Add',
    more: 'More options',
    applySplit: 'Apply suggested split',
    exportCsv: 'Export CSV',
    categoryPh: 'Category (e.g. Door gift)',
    plannedPh: 'Planned (RM)',
    actualPh: 'Actual (RM)',
    paidPh: 'Paid (RM)',
    addItem: 'Add category',
    emptyTitle: 'No categories in this view.',
    emptyHint: 'Switch to "All" or add a new category.',
    views: { all: 'All', attention: 'Needs attention', unpaid: 'To pay', done: 'Done' },
    health: { over: (n: number) => `${n} over budget`, onTrack: 'On track', ready: 'Ready to plan' },
    aiCheck: 'AI budget check',
    suggestedSplit: 'Suggested split',
    splitGuide: (base: string) => `${base} guide — use as a starting point, then adjust for venue style and guest count.`,
    commonCosts: 'Commonly forgotten costs',
    commonHint: 'Add these when they apply to your wedding. You can edit the estimate later.',
    largest: (amt: string) => `${amt} is currently the largest actual cost.`,
    riskBalanced: 'Budget looks balanced'
  }
} as const;

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
  totalPaid,
  language = 'ms'
}: BudgetPanelProps) {
  const t = budgetCopy[language];
  const [budgetView, setBudgetView] = useState<'all' | 'attention' | 'unpaid' | 'done'>('all');
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);
  const [isBudgetAddOpen, setIsBudgetAddOpen] = useState(false);
  const remainingToPay = Math.max(totalActual - totalPaid, 0);
  const paidProgress = totalActual > 0 ? Math.min(100, Math.round((totalPaid / totalActual) * 100)) : 0;
  const overBudgetItems = budgetItems.filter((item) => item.actual > item.planned && item.planned > 0);
  const unpaidItems = budgetItems.filter((item) => Math.max(item.actual - item.paid, 0) > 0);
  const completedBudgetItems = budgetItems.filter((item) => item.status === 'done');
  const budgetViewOptions = [
    { value: 'all' as const, label: t.views.all, count: budgetItems.length },
    { value: 'attention' as const, label: t.views.attention, count: overBudgetItems.length },
    { value: 'unpaid' as const, label: t.views.unpaid, count: unpaidItems.length },
    { value: 'done' as const, label: t.views.done, count: completedBudgetItems.length }
  ];
  const filteredBudgetItems = budgetItems.filter((item) => {
    if (budgetView === 'attention') return item.actual > item.planned && item.planned > 0;
    if (budgetView === 'unpaid') return Math.max(item.actual - item.paid, 0) > 0;
    if (budgetView === 'done') return item.status === 'done';
    return true;
  });
  const budgetHealth = overBudgetItems.length > 0
    ? t.health.over(overBudgetItems.length)
    : totalActual > 0
      ? t.health.onTrack
      : t.health.ready;
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
    <div className="planner-panel budget-panel mm-budget">
      <header className="mm-bg__header">
        <div className="mm-bg__heading">
          <span className="mm-bg__eyebrow">{t.eyebrow}</span>
          <h2 className="mm-bg__amount">
            {money(totalActual)}
            <em>{t.ofPlanned(money(totalPlanned))}</em>
          </h2>
          <span className={`mm-bg__health${overBudgetItems.length > 0 ? ' is-warn' : ''}`}>{budgetHealth}</span>
        </div>
        <div className="mm-bg__progress" aria-label={`${paidProgress}% ${t.paid}`}>
          <div className="mm-bg__progress-meta">
            <strong>{paidProgress}%</strong>
            <span>{t.paidMeta(money(totalPaid), money(remainingToPay))}</span>
          </div>
          <div className="mm-bg__bar"><span style={{ width: `${paidBarWidth}%` }} /></div>
        </div>
      </header>

      <div className="mm-bg__toolbar">
        <div className="mm-bg__views" role="tablist" aria-label="Budget views">
          {budgetViewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={budgetView === option.value}
              className={budgetView === option.value ? 'is-active' : ''}
              onClick={() => setBudgetView(option.value)}
            >
              {option.label}
              <span className="mm-bg__view-count">{option.count}</span>
            </button>
          ))}
        </div>
        <div className="mm-bg__tools">
          <button
            type="button"
            className={`mm-bg__add${isBudgetAddOpen ? ' is-open' : ''}`}
            aria-expanded={isBudgetAddOpen}
            onClick={() => setIsBudgetAddOpen((v) => !v)}
          >
            <span className="mm-bg__add-plus" aria-hidden="true">+</span>
            <span className="mm-bg__add-label">{t.add}</span>
          </button>
          <details className="mm-bg__menu">
            <summary aria-label={t.more}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
            </summary>
            <div className="mm-bg__menu-pop">
              <button type="button" onClick={applyBudgetAllocation}>{t.applySplit}</button>
              <button type="button" onClick={exportBudgetCsv} disabled={budgetItems.length === 0}>{t.exportCsv}</button>
            </div>
          </details>
        </div>
      </div>

      {isBudgetAddOpen ? (
        <form
          className="mm-bg__addform"
          onSubmit={(event) => {
            const shouldClose = budgetDraft.category.trim().length > 0;
            addBudgetItem(event);
            if (shouldClose) setIsBudgetAddOpen(false);
          }}
        >
          <input value={budgetDraft.category} onChange={(event) => setBudgetDraft((current) => ({ ...current, category: event.target.value }))} placeholder={t.categoryPh} aria-label="Budget category" />
          <div className="mm-bg__addform-row">
            <input type="number" value={budgetDraft.planned || ''} onChange={(event) => setBudgetDraft((current) => ({ ...current, planned: Number(event.target.value) }))} placeholder={t.plannedPh} aria-label="Planned budget" />
            <input type="number" value={budgetDraft.actual || ''} onChange={(event) => setBudgetDraft((current) => ({ ...current, actual: Number(event.target.value) }))} placeholder={t.actualPh} aria-label="Actual cost" />
            <input type="number" value={budgetDraft.paid || ''} onChange={(event) => setBudgetDraft((current) => ({ ...current, paid: Number(event.target.value) }))} placeholder={t.paidPh} aria-label="Paid amount" />
          </div>
          <button type="submit" disabled={!budgetDraft.category.trim()}>{t.addItem}</button>
        </form>
      ) : null}

      <div className="budget-list-modern mm-bg__list">
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

                  {isExpanded ? (
                    <div className="budget-edit-panel">
                      <label>
                        <span>{language === 'ms' ? 'Kategori' : 'Category'}</span>
                        <input value={item.category} onChange={(event) => updateBudgetItem(item.id, { category: event.target.value })} aria-label="Budget category" />
                      </label>
                      <label>
                        <span>{language === 'ms' ? 'Dirancang' : 'Planned'}</span>
                        <input type="number" value={item.planned} onChange={(event) => updateBudgetItem(item.id, { planned: Number(event.target.value) })} aria-label="Planned budget" />
                      </label>
                      <label>
                        <span>{language === 'ms' ? 'Sebenar' : 'Actual'}</span>
                        <input type="number" value={item.actual} onChange={(event) => updateBudgetItem(item.id, { actual: Number(event.target.value) })} aria-label="Actual cost" />
                      </label>
                      <label>
                        <span>{language === 'ms' ? 'Dibayar' : 'Paid'}</span>
                        <input type="number" value={item.paid} onChange={(event) => updateBudgetItem(item.id, { paid: Number(event.target.value) })} aria-label="Paid amount" />
                      </label>
                      <label>
                        <span>Status</span>
                        <select value={item.status} onChange={(event) => updateBudgetItem(item.id, { status: event.target.value as BudgetItem['status'] })} aria-label="Budget status">
                          <option value="not-started">{language === 'ms' ? 'Belum Mula' : 'Not started'}</option>
                          <option value="in-progress">{language === 'ms' ? 'Sedang Diurus' : 'In progress'}</option>
                          <option value="done">{language === 'ms' ? 'Selesai' : 'Done'}</option>
                        </select>
                      </label>
                      <label className="budget-note-field">
                        <span>{language === 'ms' ? 'Nota' : 'Note'}</span>
                        <input value={item.note} onChange={(event) => updateBudgetItem(item.id, { note: event.target.value })} placeholder={language === 'ms' ? 'Vendor, tarikh akhir, atau nota bayaran...' : 'Vendor, due date, or payment note...'} aria-label="Budget note" />
                      </label>
                      {isOverBudget ? <p className="budget-warning-text">{language === 'ms' ? 'Melebihi bajet sebanyak' : 'Over budget by'} {money(item.actual - item.planned)}</p> : null}
                      {!isFullyPaid && (hasActual || item.planned > 0) ? (
                        <div className="mm-bg__quickpay">
                          {item.paid < depositAmount ? (
                            <button type="button" className="mm-bg__pay-deposit" onClick={() => updateBudgetItem(item.id, { paid: depositAmount, status: 'in-progress' })}>
                              {language === 'ms' ? 'Bayar deposit' : 'Pay deposit'} ({money(depositAmount)})
                            </button>
                          ) : null}
                          <button type="button" className="mm-bg__pay-full" onClick={() => updateBudgetItem(item.id, { paid: item.actual || item.planned, status: 'done' })}>
                            {language === 'ms' ? 'Bayar penuh' : 'Pay in full'}
                          </button>
                        </div>
                      ) : null}
                      <div className="budget-edit-actions">
                        <button type="button" onClick={() => setExpandedBudgetId(null)}>{language === 'ms' ? 'Selesai edit' : 'Done editing'}</button>
                        <button type="button" className="danger" onClick={() => removeBudgetItem(item.id)}>{language === 'ms' ? 'Buang' : 'Remove'}</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            }) : (
              <div className="empty-state action-empty">
                <strong>{t.emptyTitle}</strong>
                <span>{t.emptyHint}</span>
                <button type="button" onClick={() => setIsBudgetAddOpen(true)}>{t.add}</button>
              </div>
            )}
      </div>

      <details className="mm-bg__panel">
        <summary>
          <span className="mm-bg__panel-title">{t.aiCheck}</span>
          <span className="mm-bg__panel-caret" aria-hidden="true" />
        </summary>
        <div className="mm-bg__panel-body">
          <strong className="mm-bg__panel-lead">{budgetRisk}</strong>
          <p>
            {largestActualItem && largestActualItem.actual > 0 && budgetRisk === 'Budget looks balanced'
              ? t.largest(money(largestActualItem.actual))
              : budgetRiskDetail}
          </p>
        </div>
      </details>

      <details className="mm-bg__panel">
        <summary>
          <span className="mm-bg__panel-title">{t.suggestedSplit}</span>
          <span className="mm-bg__panel-caret" aria-hidden="true" />
        </summary>
        <div className="mm-bg__panel-body">
          <p>{t.splitGuide(money(suggestionBase))}</p>
          <div className="mm-bg__alloc">
            {budgetAllocation.map((allocation) => (
              <div key={allocation.label} className="mm-bg__alloc-row">
                <span>
                  <strong>{allocation.label}</strong>
                  <small>{allocation.hint}</small>
                </span>
                <em>{money(Math.round(suggestionBase * allocation.percent))}</em>
              </div>
            ))}
          </div>
          <button type="button" className="mm-bg__panel-cta" onClick={applyBudgetAllocation}>{t.applySplit}</button>
        </div>
      </details>

      {missingSuggestions.length > 0 ? (
        <details className="mm-bg__panel">
          <summary>
            <span className="mm-bg__panel-title">{t.commonCosts}</span>
            <span className="mm-bg__panel-count">{missingSuggestions.length}</span>
            <span className="mm-bg__panel-caret" aria-hidden="true" />
          </summary>
          <div className="mm-bg__panel-body">
            <p>{t.commonHint}</p>
            <div className="mm-bg__suggestions">
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
          </div>
        </details>
      ) : null}
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
    { value: 'all' as const, label: language === 'ms' ? 'Semua' : 'All', count: guests.length },
    { value: 'pending' as const, label: language === 'ms' ? 'Pending' : 'Pending', count: guests.filter((guest) => guest.status === 'pending').length },
    { value: 'confirmed' as const, label: language === 'ms' ? 'Hadir' : 'Confirmed', count: guests.filter((guest) => guest.status === 'confirmed').length },
    { value: 'declined' as const, label: language === 'ms' ? 'Tak hadir' : 'Declined', count: guests.filter((guest) => guest.status === 'declined').length }
  ];
  const topGroup = guestGroups
    .map((group) => ({
      group,
      pax: guests.filter((guest) => guest.group === group).reduce((sum, guest) => sum + guest.pax, 0)
    }))
    .sort((first, second) => second.pax - first.pax)[0];

  return (
    <div className="planner-panel guest-command-center mm-guest">
      <header className="mm-gs__header">
        <div className="mm-gs__heading">
          <span className="mm-gs__eyebrow">{language === 'ms' ? 'Senarai tetamu' : 'Guest list'}</span>
          <h2 className="mm-gs__amount">
            {totalPax}
            <em>{language === 'ms' ? ` pax · ${guests.length} rekod` : ` pax · ${guests.length} record${guests.length === 1 ? '' : 's'}`}</em>
          </h2>
        </div>
        <div className="mm-gs__breakdown">
          <span className="is-confirmed">{confirmedGuests} {language === 'ms' ? 'hadir' : 'going'}</span>
          <span className="mm-gs__breakdown-sep">·</span>
          <span>{pendingGuests} pending</span>
          <span className="mm-gs__breakdown-sep">·</span>
          <span>{declinedGuests} {language === 'ms' ? 'tak hadir' : 'declined'}</span>
        </div>
      </header>

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

      <div className="mm-gs__toolbar">
        <div className="mm-gs__views" role="tablist" aria-label="Guest views">
          {guestViewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={guestView === option.value}
              className={guestView === option.value ? 'is-active' : ''}
              onClick={() => setGuestView(option.value)}
            >
              {option.label}
              <span className="mm-gs__view-count">{option.count}</span>
            </button>
          ))}
        </div>
        <div className="mm-gs__tools">
          <button
            type="button"
            className={`mm-gs__add${isGuestAddOpen ? ' is-open' : ''}`}
            aria-expanded={isGuestAddOpen}
            onClick={() => setIsGuestAddOpen((v) => !v)}
          >
            <span className="mm-gs__add-plus" aria-hidden="true">+</span>
            <span className="mm-gs__add-label">{language === 'ms' ? 'Tambah' : 'Add'}</span>
          </button>
          <details className="mm-gs__menu">
            <summary aria-label={language === 'ms' ? 'Lagi pilihan' : 'More options'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
            </summary>
            <div className="mm-gs__menu-pop">
              <button type="button" onClick={() => { setRsvpUrlDraft(rsvpFormUrl); setIsRsvpShareOpen((open) => !open); }}>{language === 'ms' ? 'Kongsi RSVP' : 'Share RSVP'}</button>
              <button type="button" onClick={() => guestImportRef.current?.click()}>{language === 'ms' ? 'Import CSV' : 'Import CSV'}</button>
              <button type="button" onClick={exportGuestsCsv} disabled={guests.length === 0}>{language === 'ms' ? 'Eksport CSV' : 'Export CSV'}</button>
            </div>
          </details>
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

      {isGuestAddOpen ? (
        <form
          className="mm-gs__addform"
          onSubmit={(event) => {
            const shouldClose = guestDraft.name.trim().length > 0;
            addGuest(event);
            if (shouldClose) setIsGuestAddOpen(false);
          }}
        >
          <input value={guestDraft.name} onChange={(event) => setGuestDraft((current) => ({ ...current, name: event.target.value }))} placeholder={language === 'ms' ? 'Nama tetamu' : 'Guest name'} aria-label="Guest name" />
          <div className="mm-gs__addform-row">
            <input value={guestDraft.phone} onChange={(event) => setGuestDraft((current) => ({ ...current, phone: event.target.value }))} placeholder={language === 'ms' ? 'Telefon' : 'Phone'} aria-label="Guest phone" />
            <input type="number" min="1" value={guestDraft.pax} onChange={(event) => setGuestDraft((current) => ({ ...current, pax: Number(event.target.value) || 1 }))} placeholder="Pax" aria-label="Guest pax" />
          </div>
          <div className="mm-gs__addform-row">
            <select value={guestDraft.group} onChange={(event) => setGuestDraft((current) => ({ ...current, group: event.target.value }))} aria-label="Guest group">
              <option>Tetamu Ayah</option>
              <option>Tetamu Ibu</option>
              <option>Adik Beradik</option>
              <option>Kawan-kawan</option>
              <option>Rakan Sekerja</option>
              <option>VIP</option>
            </select>
            <select value={guestDraft.status} onChange={(event) => setGuestDraft((current) => ({ ...current, status: event.target.value as Guest['status'] }))} aria-label="RSVP status">
              <option value="pending">{language === 'ms' ? 'Belum Reply' : 'Pending'}</option>
              <option value="confirmed">{language === 'ms' ? 'Confirm Hadir' : 'Confirmed'}</option>
              <option value="declined">{language === 'ms' ? 'Tidak Hadir' : 'Declined'}</option>
            </select>
          </div>
          <button type="submit" disabled={!guestDraft.name.trim()}>{language === 'ms' ? 'Tambah tetamu' : 'Add guest'}</button>
        </form>
      ) : null}

      <div className="guest-list-modern mm-gs__list">
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
                      <small>{guest.phone || (language === 'ms' ? 'Tiada telefon' : 'No phone')} · {guest.group}</small>
                    </span>
                    <span className="guest-pax">{guest.pax} pax</span>
                    <span className={`guest-status ${guest.status}`}>{rsvpLabel(guest.status)}</span>
                  </button>

                  {isExpanded ? (
                    <div className="guest-edit-panel">
                      <label>
                        <span>{language === 'ms' ? 'Nama' : 'Name'}</span>
                        <input value={guest.name} onChange={(event) => updateGuest(guest.id, { name: event.target.value })} aria-label="Guest name" />
                      </label>
                      <label>
                        <span>{language === 'ms' ? 'Telefon' : 'Phone'}</span>
                        <input value={guest.phone} onChange={(event) => updateGuest(guest.id, { phone: event.target.value })} aria-label="Guest phone" />
                      </label>
                      <label>
                        <span>{language === 'ms' ? 'Kumpulan' : 'Group'}</span>
                        <input value={guest.group} onChange={(event) => updateGuest(guest.id, { group: event.target.value })} aria-label="Guest group" />
                      </label>
                      <label>
                        <span>Pax</span>
                        <input type="number" min="1" value={guest.pax} onChange={(event) => updateGuest(guest.id, { pax: Number(event.target.value) || 1 })} aria-label="Guest pax" />
                      </label>
                      <label>
                        <span>Status</span>
                        <select value={guest.status} onChange={(event) => updateGuest(guest.id, { status: event.target.value as Guest['status'] })} aria-label={`RSVP status for ${guest.name}`}>
                          <option value="pending">{language === 'ms' ? 'Belum Reply' : 'Pending'}</option>
                          <option value="confirmed">{language === 'ms' ? 'Confirm Hadir' : 'Confirmed'}</option>
                          <option value="declined">{language === 'ms' ? 'Tidak Hadir' : 'Declined'}</option>
                        </select>
                      </label>
                      <div className="guest-edit-actions">
                        <button type="button" onClick={() => setExpandedGuestId(null)}>{language === 'ms' ? 'Selesai edit' : 'Done editing'}</button>
                        <button type="button" className="danger" onClick={() => removeGuest(guest.id)}>{language === 'ms' ? 'Buang' : 'Remove'}</button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            }) : (
              <div className="empty-state action-empty">
                <strong>{language === 'ms' ? 'Tiada tetamu dalam paparan ini.' : 'No guests in this view.'}</strong>
                <span>{language === 'ms' ? 'Tukar tab atau tambah tetamu baharu.' : 'Switch tabs or add a new guest.'}</span>
                <button type="button" onClick={() => setIsGuestAddOpen(true)}>{language === 'ms' ? 'Tambah tetamu' : 'Add guest'}</button>
              </div>
            )}
      </div>

      {topGroup ? (
        <details className="mm-gs__panel">
          <summary>
            <span className="mm-gs__panel-title">{language === 'ms' ? 'Kumpulan terbesar' : 'Largest group'}</span>
            <span className="mm-gs__panel-caret" aria-hidden="true" />
          </summary>
          <div className="mm-gs__panel-body">
            <strong className="mm-gs__panel-lead">{topGroup.group}</strong>
            <p>{language === 'ms' ? `${topGroup.pax} pax dalam kumpulan ini.` : `${topGroup.pax} pax in this group.`}</p>
          </div>
        </details>
      ) : null}
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
    <div className="planner-panel vendor-discovery-panel mm-vendor">
      <header className="mm-vd__header">
        <div className="mm-vd__heading">
          <span className="mm-vd__eyebrow">{language === 'ms' ? 'Direktori vendor' : 'Vendor directory'}</span>
          <h2 className="mm-vd__title">{language === 'ms' ? 'Senarai vendor majlis' : 'Wedding vendor shortlist'}</h2>
        </div>
        <div className="mm-vd__stats">
          <span>{savedVendors.length} {language === 'ms' ? 'disimpan' : 'shortlisted'}</span>
          {compareVendorIds.length > 0 ? <span className="is-compare">{compareVendorIds.length}/3 {language === 'ms' ? 'banding' : 'comparing'}</span> : null}
        </div>
      </header>

      <div className="mm-vd__filter">
        <select value={vendorFilter.negeri} onChange={(event) => setVendorFilter((current) => ({ ...current, negeri: event.target.value }))} aria-label="Filter vendor negeri">
          <option value="All">{language === 'ms' ? 'Semua negeri' : 'All states'}</option>
          {vendorStates.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select value={vendorFilter.category} onChange={(event) => setVendorFilter((current) => ({ ...current, category: event.target.value }))} aria-label="Filter vendor category">
          <option value="All">{language === 'ms' ? 'Semua kategori' : 'All categories'}</option>
          {vendorCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <span className="mm-vd__count">{filteredVendors.length} {language === 'ms' ? 'hasil' : `result${filteredVendors.length === 1 ? '' : 's'}`}</span>
        <a className="mm-vd__maps" href={browseMapsUrl} target="_blank" rel="noreferrer">
          {language === 'ms' ? '🗺️ Cari di Google Maps' : '🗺️ Find on Google Maps'}
        </a>
        {onSearchNearby ? (
          <button
            type="button"
            className="mm-vd__import"
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

      {comparedVendors.length > 0 ? (
        <section className="vendor-compare-panel" aria-label="Vendor comparison">
          <div className="vendor-compare-header">
            <div>
              <p className="eyebrow">{language === 'ms' ? 'Banding' : 'Compare'}</p>
              <h4>{language === 'ms' ? 'Banding sebelah-menyebelah' : 'Shortlist side by side'}</h4>
            </div>
            <div className="vendor-compare-actions">
              {comparedVendors.length >= 2 ? (
                <button type="button" className="primary" onClick={() => askVendorComparison(comparedVendors)}>{language === 'ms' ? 'Tanya AI' : 'Ask AI'}</button>
              ) : null}
              <button type="button" onClick={() => setCompareVendorIds([])}>{language === 'ms' ? 'Kosongkan' : 'Clear'}</button>
            </div>
          </div>
          <div className="vendor-compare-grid">
            {comparedVendors.map((vendor) => (
              <article key={vendor.id}>
                <strong>{vendor.name}</strong>
                <span>{vendor.category} · {vendor.negeri}</span>
                <dl>
                  <div>
                    <dt>{language === 'ms' ? 'Harga' : 'Price'}</dt>
                    <dd>{money(vendor.minPrice)} - {money(vendor.maxPrice)}</dd>
                  </div>
                  <div>
                    <dt>{language === 'ms' ? 'Penilaian' : 'Rating'}</dt>
                    <dd>{vendor.rating.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>{language === 'ms' ? 'Hubungi' : 'Contact'}</dt>
                    <dd>{vendor.contact}</dd>
                  </div>
                </dl>
                <button type="button" onClick={() => setSelectedVendor(vendor)}>{language === 'ms' ? 'Buka butiran' : 'Open details'}</button>
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
                <span>{vendor.category} · {vendor.negeri}</span>
              </div>
              <span className="vendor-rating">★ {vendor.rating.toFixed(1)}</span>
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
            <div className="vendor-actions mm-vd__actions">
              <button type="button" className={`mm-vd__save${savedVendors.includes(vendor.id) ? ' is-saved' : ''}`} onClick={() => toggleSavedVendor(vendor.id)}>
                {savedVendors.includes(vendor.id) ? (language === 'ms' ? '✓ Disimpan' : '✓ Saved') : (language === 'ms' ? 'Simpan' : 'Shortlist')}
              </button>
              <button type="button" className={compareVendorIds.includes(vendor.id) ? 'is-saved' : ''} onClick={() => toggleCompareVendor(vendor.id)}>
                {compareVendorIds.includes(vendor.id) ? (language === 'ms' ? '✓ Banding' : '✓ Comparing') : (language === 'ms' ? 'Banding' : 'Compare')}
              </button>
              <button type="button" className="primary" onClick={() => askVendorMessage(vendor)}>{language === 'ms' ? 'Draf WhatsApp' : 'Draft WhatsApp'}</button>
              <button type="button" onClick={() => setSelectedVendor(vendor)}>{language === 'ms' ? 'Butiran' : 'Details'}</button>
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
                <span>{selectedVendor.negeri} · ★ {selectedVendor.rating.toFixed(1)}</span>
              </div>
              <button type="button" onClick={() => setSelectedVendor(null)}>{language === 'ms' ? 'Tutup' : 'Close'}</button>
            </div>
            <iframe
              title={`Google Maps detail for ${selectedVendor.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${mapQueryBase(selectedVendor)}&output=embed`}
            />
            <div className="vendor-detail-body">
              <article>
                <span>{language === 'ms' ? 'Julat harga' : 'Price range'}</span>
                <strong>{money(selectedVendor.minPrice)} - {money(selectedVendor.maxPrice)}</strong>
              </article>
              <article>
                <span>{language === 'ms' ? 'Hubungi' : 'Contact'}</span>
                <strong>{selectedVendor.contact}</strong>
                {selectedVendor.instagram ? <p>{selectedVendor.instagram}</p> : null}
              </article>
              <article>
                <span>{language === 'ms' ? 'Nota' : 'Notes'}</span>
                <p>{selectedVendor.note}</p>
              </article>
            </div>
            <div className="vendor-detail-actions">
              <button type="button" className="primary" onClick={() => askVendorMessage(selectedVendor)}>{language === 'ms' ? 'Draf WhatsApp' : 'Draft WhatsApp'}</button>
              <button type="button" onClick={() => askVendorQuestions(selectedVendor)}>{language === 'ms' ? 'Soalan' : 'Questions'}</button>
              <button type="button" onClick={() => addVendorToBudget(selectedVendor)}>{language === 'ms' ? 'Tambah ke bajet' : 'Add to budget'}</button>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapQueryBase(selectedVendor)}`} target="_blank" rel="noreferrer">
                {language === 'ms' ? 'Arah' : 'Directions'}
              </a>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
