import type { PlannerProfile, ChecklistItem, BudgetItem, Appointment, Guest, ActiveTab } from './types';

export type RiskLevel = 'high' | 'medium' | 'info';

export type RiskAlert = {
  id: string;
  level: RiskLevel;
  titleMs: string;
  titleEn: string;
  detailMs: string;
  detailEn: string;
  tab?: ActiveTab;
};

type RiskInput = {
  plannerProfile: PlannerProfile;
  checklistItems: ChecklistItem[];
  budgetItems: BudgetItem[];
  appointments: Appointment[];
  guests: Guest[];
  pendingGuests: number;
  totalPlanned: number;
  totalPaid: number;
};

function daysUntilDate(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${dateStr}T00:00:00`);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const CRITICAL_CATEGORIES = /caterer|katering|photographer|fotografi|venue|dewan|hall|pelamin|bunga|baju|attire/i;

export function detectRisks(input: RiskInput): RiskAlert[] {
  const { plannerProfile, checklistItems, budgetItems, appointments, guests, pendingGuests, totalPlanned, totalPaid } = input;
  const alerts: RiskAlert[] = [];

  // ── No wedding date set ────────────────────────────
  if (!plannerProfile.majlisDate) {
    alerts.push({
      id: 'no-date',
      level: 'info',
      titleMs: 'Tarikh majlis belum ditetapkan',
      titleEn: 'Wedding date not set',
      detailMs: 'Tetapkan tarikh majlis untuk mendapatkan analisis risiko yang tepat.',
      detailEn: 'Set your wedding date to get accurate risk analysis.',
      tab: 'dashboard'
    });
    return alerts; // no date = can't calculate most other risks
  }

  const daysLeft = daysUntilDate(plannerProfile.majlisDate);

  // ── Wedding already passed ─────────────────────────
  if (daysLeft < 0) return alerts;

  // ── Overdue checklist items ────────────────────────
  const overdueItems = checklistItems.filter(
    (item) => item.deadline && item.status !== 'done' && !item.completed && daysUntilDate(item.deadline) < 0
  );
  if (overdueItems.length > 0) {
    alerts.push({
      id: 'overdue-checklist',
      level: 'high',
      titleMs: `${overdueItems.length} item checklist telah lepas tarikh`,
      titleEn: `${overdueItems.length} overdue checklist item${overdueItems.length > 1 ? 's' : ''}`,
      detailMs: `"${overdueItems[0].textMs || overdueItems[0].text}" dan lain-lain perlu diselesaikan segera.`,
      detailEn: `"${overdueItems[0].textEn || overdueItems[0].text}" and others need immediate attention.`,
      tab: 'checklist'
    });
  }

  // ── Checklist items due within 7 days ─────────────
  const soonItems = checklistItems.filter(
    (item) =>
      item.deadline &&
      item.status === 'not-started' &&
      !item.completed &&
      daysUntilDate(item.deadline) >= 0 &&
      daysUntilDate(item.deadline) <= 7
  );
  if (soonItems.length > 0 && !overdueItems.length) {
    alerts.push({
      id: 'soon-checklist',
      level: 'medium',
      titleMs: `${soonItems.length} item checklist perlu siap dalam 7 hari`,
      titleEn: `${soonItems.length} checklist item${soonItems.length > 1 ? 's' : ''} due within 7 days`,
      detailMs: `"${soonItems[0].textMs || soonItems[0].text}" belum dimulakan.`,
      detailEn: `"${soonItems[0].textEn || soonItems[0].text}" hasn't been started yet.`,
      tab: 'checklist'
    });
  }

  // ── Budget over-allocated ──────────────────────────
  if (plannerProfile.totalBudget > 0 && totalPlanned > plannerProfile.totalBudget) {
    const overBy = totalPlanned - plannerProfile.totalBudget;
    const fmt = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
    alerts.push({
      id: 'over-budget',
      level: 'high',
      titleMs: `Peruntukan melebihi bajet sebanyak ${fmt.format(overBy)}`,
      titleEn: `Allocations exceed budget by ${fmt.format(overBy)}`,
      detailMs: 'Semak semula kategori bajet dan kurangkan perancangan.',
      detailEn: 'Review budget categories and reduce planned spending.',
      tab: 'budget'
    });
  }

  // ── Budget items where actual > planned ───────────
  const overRunItems = budgetItems.filter((item) => item.actual > 0 && item.planned > 0 && item.actual > item.planned);
  if (overRunItems.length > 0) {
    alerts.push({
      id: 'cost-overrun',
      level: 'medium',
      titleMs: `${overRunItems.length} kategori melebihi kos yang dirancang`,
      titleEn: `${overRunItems.length} categor${overRunItems.length > 1 ? 'ies' : 'y'} over planned cost`,
      detailMs: `${overRunItems[0].category} melebihi bajet yang ditetapkan.`,
      detailEn: `${overRunItems[0].category} has exceeded its planned amount.`,
      tab: 'budget'
    });
  }

  // ── Critical vendor categories not started ─────────
  if (daysLeft <= 90) {
    const criticalUnstarted = budgetItems.filter(
      (item) => CRITICAL_CATEGORIES.test(item.category) && item.status === 'not-started'
    );
    if (criticalUnstarted.length > 0) {
      alerts.push({
        id: 'critical-vendor',
        level: daysLeft <= 60 ? 'high' : 'medium',
        titleMs: `${criticalUnstarted.length} vendor utama belum disahkan`,
        titleEn: `${criticalUnstarted.length} critical vendor${criticalUnstarted.length > 1 ? 's' : ''} unconfirmed`,
        detailMs: `${criticalUnstarted[0].category} belum ada vendor. Majlis tinggal ${daysLeft} hari lagi.`,
        detailEn: `${criticalUnstarted[0].category} has no vendor yet. ${daysLeft} days to go.`,
        tab: 'budget'
      });
    }
  }

  // ── Pending RSVP guests near wedding ──────────────
  if (pendingGuests > 0 && daysLeft <= 60 && daysLeft > 0) {
    alerts.push({
      id: 'pending-rsvp',
      level: 'medium',
      titleMs: `${pendingGuests} tetamu masih belum reply RSVP`,
      titleEn: `${pendingGuests} guest${pendingGuests > 1 ? 's' : ''} haven't replied RSVP`,
      detailMs: `Hubungi mereka sekarang — majlis ${daysLeft} hari lagi.`,
      detailEn: `Follow up now — only ${daysLeft} days away.`,
      tab: 'rsvp'
    });
  }

  // ── No upcoming appointments (wedding < 90 days) ──
  if (daysLeft > 0 && daysLeft <= 90) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingAppts = appointments.filter((a) => daysUntilDate(a.date) >= 0);
    if (upcomingAppts.length === 0) {
      alerts.push({
        id: 'no-appointments',
        level: 'info',
        titleMs: 'Tiada appointment yang dijadualkan',
        titleEn: 'No upcoming appointments scheduled',
        detailMs: 'Jadualkan temujanji dengan vendor untuk pastikan semuanya tersusun.',
        detailEn: 'Schedule vendor appointments to keep things on track.',
        tab: 'calendar'
      });
    }
  }

  // ── Reminder: unpaid balance with wedding approaching ──
  if (daysLeft <= 30 && daysLeft > 0 && totalPlanned > 0) {
    const unpaid = totalPlanned - totalPaid;
    if (unpaid > 0) {
      const fmt = new Intl.NumberFormat('ms-MY', { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });
      alerts.push({
        id: 'unpaid-balance',
        level: daysLeft <= 14 ? 'high' : 'medium',
        titleMs: `${fmt.format(unpaid)} belum dibayar — majlis ${daysLeft} hari lagi`,
        titleEn: `${fmt.format(unpaid)} unpaid — ${daysLeft} days to go`,
        detailMs: 'Semak pembayaran vendor dan pastikan tiada yang tertinggal.',
        detailEn: 'Verify vendor payments to avoid last-minute surprises.',
        tab: 'budget'
      });
    }
  }

  // Sort: high first, then medium, then info; max 5 shown
  const order: Record<RiskLevel, number> = { high: 0, medium: 1, info: 2 };
  return alerts.sort((a, b) => order[a.level] - order[b.level]).slice(0, 5);
}
