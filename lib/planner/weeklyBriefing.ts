import type { AppLanguage } from '../../components/planner/types';

export type BriefingTone = 'urgent' | 'info' | 'good';

export type BriefingItem = {
  key: string;
  tone: BriefingTone;
  text: string;
};

export type WeeklyBriefing = {
  greeting: string;
  headline: string;
  items: BriefingItem[];
  /** Single spoken paragraph for the free Web Speech TTS. Malay-first. */
  speech: string;
  isAllClear: boolean;
};

export type WeeklyBriefingInput = {
  partnerName?: string;
  daysLeft: number | null;
  urgentTaskTitles: string[];
  weekTaskTitles: string[];
  overBudget: Array<{ category: string; over: number }>;
  remainingToPay: number;
  nextAppointment?: { title: string; date: string } | null;
  pendingGuests: number;
  progressPct: number;
  doneCount: number;
  totalCount: number;
};

function ms(n: number): string {
  return `RM${Math.round(n).toLocaleString('en-MY')}`;
}

function formatDateLabel(dateKey: string, language: AppLanguage): string {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Builds a deterministic, locally-computed weekly briefing from planner data.
 * No network call — instant, free, and reliable. Malay is the primary language;
 * English is only used when the UI is switched to English.
 */
export function buildWeeklyBriefing(input: WeeklyBriefingInput, language: AppLanguage): WeeklyBriefing {
  const isMs = language === 'ms';
  const name = input.partnerName?.trim();

  const greeting = isMs
    ? name
      ? `Salam, ${name}!`
      : 'Salam!'
    : name
      ? `Hi, ${name}!`
      : 'Hi!';

  let headline: string;
  if (input.daysLeft === null) {
    headline = isMs
      ? 'Tetapkan tarikh majlis dulu supaya saya boleh susun fokus mingguan anda.'
      : 'Set your wedding date so I can plan your weekly focus.';
  } else if (input.daysLeft < 0) {
    headline = isMs ? 'Tahniah, majlis dah berlangsung! 🎉' : 'Congratulations, the big day has passed! 🎉';
  } else if (input.daysLeft === 0) {
    headline = isMs ? 'Hari ini hari majlis anda! 🎉' : "Today is your big day! 🎉";
  } else {
    headline = isMs
      ? `${input.daysLeft} hari lagi ke hari majlis.`
      : `${input.daysLeft} days to go until the big day.`;
  }

  const items: BriefingItem[] = [];
  const speechParts: string[] = [];

  // Urgent / overdue tasks
  if (input.urgentTaskTitles.length > 0) {
    const top = input.urgentTaskTitles.slice(0, 3);
    items.push({
      key: 'urgent',
      tone: 'urgent',
      text: isMs
        ? `${input.urgentTaskTitles.length} task perlu segera: ${top.join(', ')}${input.urgentTaskTitles.length > top.length ? ', dan lain-lain' : ''}.`
        : `${input.urgentTaskTitles.length} urgent task${input.urgentTaskTitles.length > 1 ? 's' : ''}: ${top.join(', ')}${input.urgentTaskTitles.length > top.length ? ', and more' : ''}.`
    });
    speechParts.push(
      isMs
        ? `Ada ${input.urgentTaskTitles.length} task yang perlu diuruskan segera. Yang paling penting, ${top.join(', ')}.`
        : `You have ${input.urgentTaskTitles.length} urgent tasks. The most important are ${top.join(', ')}.`
    );
  }

  // This-week tasks
  if (input.weekTaskTitles.length > 0) {
    const top = input.weekTaskTitles.slice(0, 2);
    items.push({
      key: 'week',
      tone: 'info',
      text: isMs
        ? `${input.weekTaskTitles.length} task untuk minggu ini, contohnya ${top.join(' dan ')}.`
        : `${input.weekTaskTitles.length} task${input.weekTaskTitles.length > 1 ? 's' : ''} for this week, e.g. ${top.join(' and ')}.`
    });
    speechParts.push(
      isMs
        ? `Untuk minggu ini, cuba selesaikan ${top.join(' dan ')}.`
        : `For this week, try to finish ${top.join(' and ')}.`
    );
  }

  // Budget warnings
  if (input.overBudget.length > 0) {
    const worst = [...input.overBudget].sort((a, b) => b.over - a.over)[0];
    items.push({
      key: 'over-budget',
      tone: 'urgent',
      text: isMs
        ? `${input.overBudget.length} kategori melebihi bajet — paling tinggi ${worst.category} (${ms(worst.over)} lebih).`
        : `${input.overBudget.length} categor${input.overBudget.length > 1 ? 'ies' : 'y'} over budget — biggest is ${worst.category} (${ms(worst.over)} over).`
    });
    speechParts.push(
      isMs
        ? `Hati-hati dengan bajet. Kategori ${worst.category} sudah melebihi sebanyak ${ms(worst.over)}.`
        : `Watch your budget. ${worst.category} is over by ${ms(worst.over)}.`
    );
  } else if (input.remainingToPay > 0) {
    items.push({
      key: 'to-pay',
      tone: 'info',
      text: isMs
        ? `Baki bayaran vendor: ${ms(input.remainingToPay)}.`
        : `Outstanding vendor payments: ${ms(input.remainingToPay)}.`
    });
  }

  // Next appointment
  if (input.nextAppointment) {
    const when = formatDateLabel(input.nextAppointment.date, language);
    items.push({
      key: 'appointment',
      tone: 'info',
      text: isMs
        ? `Appointment seterusnya: ${input.nextAppointment.title} pada ${when}.`
        : `Next appointment: ${input.nextAppointment.title} on ${when}.`
    });
    speechParts.push(
      isMs
        ? `Jangan lupa appointment ${input.nextAppointment.title} pada ${when}.`
        : `Don't forget your appointment ${input.nextAppointment.title} on ${when}.`
    );
  }

  // Pending RSVP
  if (input.pendingGuests > 0) {
    items.push({
      key: 'rsvp',
      tone: 'info',
      text: isMs
        ? `${input.pendingGuests} tetamu belum sahkan kehadiran (RSVP).`
        : `${input.pendingGuests} guest${input.pendingGuests > 1 ? 's' : ''} still pending RSVP.`
    });
  }

  const isAllClear = items.length === 0;

  if (isAllClear) {
    const progressNote =
      input.totalCount > 0
        ? isMs
          ? ` Setakat ini ${input.doneCount} daripada ${input.totalCount} task dah siap (${input.progressPct}%).`
          : ` So far ${input.doneCount} of ${input.totalCount} tasks are done (${input.progressPct}%).`
        : '';
    items.push({
      key: 'clear',
      tone: 'good',
      text: isMs
        ? `Semua terkawal — tiada task urgent atau isu bajet buat masa ini.${progressNote}`
        : `All clear — no urgent tasks or budget issues right now.${progressNote}`
    });
  }

  // Compose the spoken paragraph
  const intro = `${greeting} ${headline}`;
  const body = isAllClear
    ? isMs
      ? 'Setakat ini semuanya terkawal — tiada task mendesak atau isu bajet. Teruskan usaha yang baik!'
      : 'Everything looks on track — no urgent tasks or budget issues. Keep up the great work!'
    : speechParts.join(' ');
  const outro = isMs ? 'Nak saya cadangkan langkah seterusnya?' : 'Want me to suggest the next steps?';
  const speech = `${intro} ${body} ${isAllClear ? '' : outro}`.replace(/\s+/g, ' ').trim();

  return { greeting, headline, items, speech, isAllClear };
}
