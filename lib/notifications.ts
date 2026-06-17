import type { AppLanguage, Appointment, ChecklistItem } from '../components/planner/types';

export type DueReminder = {
  tag: string;
  title: string;
  body: string;
};

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysBetween(targetKey: string, today: Date): number | null {
  const target = new Date(`${targetKey}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

/**
 * Collect time-sensitive reminders from planner data: overdue / due-today tasks
 * and imminent appointments. Tags are stable per item+day so we can de-dupe.
 */
export function collectDueReminders(
  checklistItems: ChecklistItem[],
  appointments: Appointment[],
  language: AppLanguage,
  now: Date = new Date()
): DueReminder[] {
  const isMs = language === 'ms';
  const today = dateKey(now);
  const reminders: DueReminder[] = [];

  const openTasks = checklistItems.filter(
    (item) => !item.completed && item.status !== 'done' && item.deadline
  );
  const overdue = openTasks.filter((item) => {
    const d = daysBetween(item.deadline as string, now);
    return d !== null && d < 0;
  });
  const dueToday = openTasks.filter((item) => daysBetween(item.deadline as string, now) === 0);

  if (overdue.length > 0) {
    reminders.push({
      tag: `overdue-${today}-${overdue.length}`,
      title: isMs ? '⏰ Task dah lewat tarikh' : '⏰ Overdue tasks',
      body: isMs
        ? `${overdue.length} task melepasi tarikh akhir. Semak checklist anda.`
        : `${overdue.length} task${overdue.length > 1 ? 's are' : ' is'} past due. Check your checklist.`
    });
  }
  if (dueToday.length > 0) {
    reminders.push({
      tag: `due-today-${today}`,
      title: isMs ? '📋 Task untuk hari ini' : '📋 Tasks due today',
      body: isMs
        ? `${dueToday.length} task perlu disiapkan hari ini.`
        : `${dueToday.length} task${dueToday.length > 1 ? 's' : ''} due today.`
    });
  }

  for (const appointment of appointments) {
    if (appointment.status === 'done') continue;
    const d = daysBetween(appointment.date, now);
    if (d === 0 || d === 1) {
      reminders.push({
        tag: `appt-${appointment.id}-${today}`,
        title: d === 0
          ? (isMs ? '📅 Appointment hari ini' : '📅 Appointment today')
          : (isMs ? '📅 Appointment esok' : '📅 Appointment tomorrow'),
        body: `${appointment.title}${appointment.time ? ` · ${appointment.time}` : ''}`
      });
    }
  }

  return reminders;
}

const SHOWN_KEY = 'mm-notify-shown';

function loadShownTags(): Record<string, true> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(SHOWN_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveShownTags(tags: Record<string, true>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHOWN_KEY, JSON.stringify(tags));
  } catch {}
}

/** Fire any reminders not already shown (deduped by tag). Returns count fired. */
export function fireReminders(reminders: DueReminder[]): number {
  if (notificationPermission() !== 'granted') return 0;
  const shown = loadShownTags();
  let fired = 0;
  for (const reminder of reminders) {
    if (shown[reminder.tag]) continue;
    try {
      new Notification(reminder.title, { body: reminder.body, tag: reminder.tag });
      shown[reminder.tag] = true;
      fired += 1;
    } catch {}
  }
  if (fired > 0) saveShownTags(shown);
  return fired;
}
