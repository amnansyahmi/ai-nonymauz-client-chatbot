import type { Appointment, BudgetItem, ChecklistItem, Guest, PlannerProfile } from './types';
import { dateKey, daysUntil, money, sortAppointments } from './utils';
import { vendorDirectory } from './data';

export type PlannerContextInput = {
  profile: PlannerProfile;
  checklistItems: ChecklistItem[];
  budgetItems: BudgetItem[];
  guests: Guest[];
  savedVendors: string[];
  appointments: Appointment[];
  completedCount: number;
};

/**
 * Derive the planner context sent to the chat API: a checklist digest plus a
 * compact "planner state summary" (days left, urgent tasks, budget risk, guest
 * status, vendor shortlist) the AI reads before replying. Pure given its inputs.
 */
export function derivePlannerContext({
  profile,
  checklistItems,
  budgetItems,
  guests,
  savedVendors,
  appointments,
  completedCount
}: PlannerContextInput) {
  const openChecklistForContext = checklistItems
    .filter((item) => !(item.completed || item.status === 'done'))
    .map((item) => {
      const text = item.textMs || item.text;
      const status = item.status || 'not-started';
      const d = item.deadline ? daysUntil(item.deadline) : null;
      const when = d !== null
        ? d < 0 ? `overdue ${Math.abs(d)} hari`
        : d === 0 ? 'due HARI INI'
        : d <= 7 ? `due dalam ${d} hari`
        : d <= 30 ? `due dalam ${d} hari`
        : `due ${item.deadline}`
        : 'tiada tarikh';
      const phase = item.phase ? ` [${item.phase}]` : '';
      const score = (d !== null ? (d < 0 ? d - 1000 : d) : 9999) + (status === 'in-progress' ? -0.5 : 0);
      return { text, status, d, when, phase, score };
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, 20);

  const overdueCount = openChecklistForContext.filter((i) => i.d !== null && i.d < 0).length;
  const weekCount = openChecklistForContext.filter((i) => i.d !== null && i.d !== null && i.d >= 0 && i.d <= 7).length;
  const itemLines = openChecklistForContext
    .map((i) => `• ${i.text}${i.phase} — ${i.status}, ${i.when}`)
    .join('\n');

  const checklistSummary = `${completedCount}/${checklistItems.length} selesai | ${overdueCount} overdue | ${weekCount} due minggu ini\nTask terbuka (ikut keutamaan):\n${itemLines}`;

  const daysLeft = profile.majlisDate ? daysUntil(profile.majlisDate) : null;

  const totalPlanned = budgetItems.reduce((sum, item) => sum + (item.planned || 0), 0);
  const totalPaid = budgetItems.reduce((sum, item) => sum + (item.paid || 0), 0);
  const budgetCap = profile.totalBudget || 0;
  const budgetRisk = budgetCap > 0
    ? totalPlanned > budgetCap
      ? `RISIKO: planned ${money(totalPlanned)} melebihi bajet ${money(budgetCap)}`
      : `OK: planned ${money(totalPlanned)}/${money(budgetCap)} (${Math.round((totalPlanned / budgetCap) * 100)}%), paid ${money(totalPaid)}`
    : 'bajet belum diset';

  const confirmedPax = guests.filter((g) => g.status === 'confirmed').reduce((sum, g) => sum + (g.pax || 1), 0);
  const pendingGuests = guests.filter((g) => g.status === 'pending').length;
  const declinedGuests = guests.filter((g) => g.status === 'declined').length;
  const guestStatus = guests.length > 0
    ? `${confirmedPax} pax confirm, ${pendingGuests} pending, ${declinedGuests} decline${profile.guestTarget ? ` (target ${profile.guestTarget})` : ''}`
    : profile.guestTarget ? `belum ada senarai tetamu (target ${profile.guestTarget})` : 'belum ada tetamu / target';

  const shortlist = savedVendors
    .map((id) => vendorDirectory.find((vendor) => vendor.id === id)?.name)
    .filter((name): name is string => Boolean(name));
  const vendorShortlist = shortlist.length > 0 ? shortlist.join(', ') : 'belum ada shortlist vendor';

  const urgentTasks = openChecklistForContext.filter((i) => i.d !== null && i.d <= 14).slice(0, 5).map((i) => `${i.text} (${i.when})`);
  const urgentLine = urgentTasks.length > 0 ? urgentTasks.join('; ') : 'tiada task mendesak';

  const stateSummary = [
    `Tarikh majlis: ${profile.majlisDate || 'belum set'}${daysLeft !== null ? ` (${daysLeft} hari lagi)` : ''}`,
    `Negeri: ${profile.negeri || 'belum set'}`,
    `Task mendesak (<=14 hari): ${urgentLine}`,
    `Bajet: ${budgetRisk}`,
    `Tetamu: ${guestStatus}`,
    `Shortlist vendor: ${vendorShortlist}`
  ].join('\n');

  return {
    majlisDate: profile.majlisDate,
    groomName: profile.groomName,
    brideName: profile.brideName,
    negeri: profile.negeri,
    totalBudget: profile.totalBudget,
    guestTarget: profile.guestTarget,
    daysLeft: daysLeft ?? undefined,
    stateSummary: stateSummary.slice(0, 1500),
    checklistSummary: checklistSummary.slice(0, 3500),
    budgetSummary: budgetItems.map((item) => `${item.category}: planned ${money(item.planned)}, actual ${money(item.actual)}, paid ${money(item.paid)}`).slice(0, 10),
    upcomingAppointments: appointments.filter((appointment) => appointment.date >= dateKey(new Date())).sort(sortAppointments).slice(0, 5)
  };
}
