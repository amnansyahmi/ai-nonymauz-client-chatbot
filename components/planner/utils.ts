import { defaultChecklistTemplate, type LocalizedText } from './data';
import type { Appointment, BudgetItem, CalendarDay, ChecklistItem, Guest, StreamEvent } from './types';

export function parseSseEvents(buffer: string) {
  const events: StreamEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remaining = blocks.pop() || '';

  for (const block of blocks) {
    const dataLines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s*/, ''));

    if (dataLines.length === 0) continue;

    const payload = dataLines.join('\n').trim();
    if (!payload || payload === '[DONE]') continue;

    try {
      events.push(JSON.parse(payload));
    } catch {
      events.push({ type: 'delta', text: payload });
    }
  }

  return { events, remaining };
}

export function wantsChecklist(text: string) {
  return /\b(checklist|check list|todo|to-do|task list|senarai semak)\b/i.test(text);
}

export function wantsAppointment(text: string) {
  const hasAction = /\b(add|create|make|set|schedule|book)\b/i.test(text);
  const hasCalendarTarget = /\b(appointment|meeting|calendar|janji temu|temujanji)\b/i.test(text);

  return hasAction && (hasCalendarTarget || Boolean(parseAppointmentDate(text)));
}

export function wantsVendorMessage(text: string) {
  return /\b(draft|write|create|buat|karang)\b/i.test(text) && /\b(message|mesej|whatsapp|vendor|katerer|photographer|andaman|mua|dewan)\b/i.test(text);
}

function cleanChecklistLine(line: string) {
  return line
    .replace(/^\s*(?:[-*]|\d+[.)]|\[[ xX]\])\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
}

export function checklistFromAnswer(answer: string) {
  const items = answer
    .split('\n')
    .map(cleanChecklistLine)
    .filter((line) => line.length > 3)
    .filter((line) => !/^demo mode aktif/i.test(line))
    .filter((line) => !/^sources?:/i.test(line))
    .slice(0, 12);

  return items.map((text, index) => ({
    id: `${Date.now()}-${index}`,
    text,
    completed: false
  }));
}

export function fallbackChecklist(prompt: string): ChecklistItem[] {
  const lowerPrompt = prompt.toLowerCase();
  const vendorItems = [
    'Confirm wedding date, venue, guest count, and planning priority',
    'Shortlist the vendor, venue, or service to review',
    'Prepare budget range and package questions',
    'Choose preferred appointment date and time',
    'Collect notes, photos, moodboard, or references if needed',
    'Confirm deposit, package inclusions, and next deadline',
    'Save the meeting or follow-up in the calendar'
  ];
  const supportItems = [
    'Confirm the wedding date and event type',
    'List the planning decisions still pending',
    'Prepare guest count, budget, and family requirements',
    'Confirm the next action and expected timeline',
    'Save any important appointment or deadline'
  ];
  const genericItems = [
    'Define the goal',
    'Gather required information',
    'List the main steps',
    'Assign an owner or next action',
    'Review for missing details',
    'Mark completed items as done'
  ];
  const sourceItems = /venue|dewan|catering|photographer|makeup|vendor|booking|book|food tasting/.test(lowerPrompt)
    ? vendorItems
    : /wedding|kahwin|majlis|nikah|sanding|reception|event|planner/.test(lowerPrompt)
      ? supportItems
      : genericItems;

  return sourceItems.map((text, index) => ({
    id: `${Date.now()}-${index}`,
    text,
    completed: false
  }));
}

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function downloadTextFile(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function formatChecklistText(title: string, items: ChecklistItem[]) {
  const lines = items.map((item) => {
    const phase = item.phase ? ` (${item.phase})` : '';
    const deadline = item.deadline ? ` - due ${item.deadline}` : '';
    return `${item.completed ? '[x]' : '[ ]'} ${item.text}${phase}${deadline}`;
  });
  return `${title}\n\n${lines.join('\n')}`;
}

export function generateDefaultChecklist(majlisDate?: string): ChecklistItem[] {
  const weddingDate = majlisDate ? new Date(`${majlisDate}T00:00:00`) : null;
  const phaseOffsets: Record<string, number> = {
    'Fasa 1 - Asas': 270,
    'Fasa 2 - Vendor Utama': 180,
    'Fasa 3 - Persediaan': 60,
    'Fasa 4 - Final': 7
  };

  return defaultChecklistTemplate.flatMap((group, groupIndex) =>
    group.items.map((item, itemIndex) => {
      const phase = group.phase;
      const dueDate = weddingDate
        ? new Date(weddingDate.getFullYear(), weddingDate.getMonth(), weddingDate.getDate() - phaseOffsets[phase.ms])
        : null;

      return {
        id: `default-${groupIndex}-${itemIndex}-${Date.now()}`,
        text: item.ms,
        textMs: item.ms,
        textEn: item.en,
        completed: false,
        phase: phase.ms,
        phaseMs: phase.ms,
        phaseEn: phase.en,
        status: 'not-started' as const,
        deadline: dueDate ? dateKey(dueDate) : undefined
      };
    })
  );
}

export function localizedValue(value: LocalizedText | string | undefined, language: 'ms' | 'en') {
  if (!value) return '';
  return typeof value === 'string' ? value : value[language];
}

export function statusLabel(status: ChecklistItem['status'] | BudgetItem['status'] | undefined) {
  if (status === 'done') return 'Selesai';
  if (status === 'in-progress') return 'Sedang Diurus';
  return 'Belum Mula';
}

export function rsvpLabel(status: Guest['status']) {
  if (status === 'confirmed') return 'Confirm Hadir';
  if (status === 'declined') return 'Tidak Hadir';
  return 'Belum Reply';
}

export function daysUntil(dateString: string) {
  if (!dateString) return null;
  const target = new Date(`${dateString}T00:00:00`).getTime();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.ceil((target - start) / 86400000);
}

export function money(value: number) {
  return `RM${Number.isFinite(value) ? value.toLocaleString('en-MY') : '0'}`;
}

export function formatAppointmentsText(appointments: Appointment[]) {
  if (appointments.length === 0) return 'No appointments yet.';

  return appointments
    .map((appointment) => {
      const time = appointment.time ? ` at ${appointment.time}` : '';
      const location = appointment.location ? `\nLocation: ${appointment.location}` : '';
      const vendor = appointment.vendor ? `\nVendor: ${appointment.vendor}` : '';
      const status = appointment.status ? `\nStatus: ${appointment.status}` : '';
      const note = appointment.note ? `\nNotes: ${appointment.note}` : '';
      return `${appointment.date}${time} - ${appointment.title}${location}${vendor}${status}${note}`;
    })
    .join('\n\n');
}

export function sortAppointments(first: Appointment, second: Appointment) {
  const dateCompare = first.date.localeCompare(second.date);
  if (dateCompare !== 0) return dateCompare;
  return (first.time || '99:99').localeCompare(second.time || '99:99');
}

export function parseAppointmentDate(text: string, baseDate = new Date()) {
  const lowerText = text.toLowerCase();

  if (/\btoday\b/i.test(text)) {
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  }

  if (/\btomorrow\b/i.test(text)) {
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
  }

  const isoMatch = text.match(/\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const slashMatch = text.match(/\b(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])(?:\/(20\d{2}))?\b/);
  if (slashMatch) {
    return new Date(
      slashMatch[3] ? Number(slashMatch[3]) : baseDate.getFullYear(),
      Number(slashMatch[2]) - 1,
      Number(slashMatch[1])
    );
  }

  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december'
  ];
  const monthPattern = months.join('|');
  const dayMonthMatch = lowerText.match(new RegExp(`\\b(0?[1-9]|[12]\\d|3[01])\\s+(${monthPattern})(?:\\s+(20\\d{2}))?\\b`));
  const monthDayMatch = lowerText.match(new RegExp(`\\b(${monthPattern})\\s+(0?[1-9]|[12]\\d|3[01])(?:,?\\s+(20\\d{2}))?\\b`));

  if (dayMonthMatch) {
    return new Date(
      dayMonthMatch[3] ? Number(dayMonthMatch[3]) : baseDate.getFullYear(),
      months.indexOf(dayMonthMatch[2]),
      Number(dayMonthMatch[1])
    );
  }

  if (monthDayMatch) {
    return new Date(
      monthDayMatch[3] ? Number(monthDayMatch[3]) : baseDate.getFullYear(),
      months.indexOf(monthDayMatch[1]),
      Number(monthDayMatch[2])
    );
  }

  return null;
}

function parseAppointmentTime(text: string) {
  const timeMatch = text.match(/\b(?:at\s*)?([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?\b/i) || text.match(/\bat\s+([01]?\d|2[0-3])\s*(am|pm)\b/i);
  if (!timeMatch) return undefined;

  const hour = timeMatch[1];
  const minutes = timeMatch[2] && !/am|pm/i.test(timeMatch[2]) ? timeMatch[2] : '00';
  const meridiemSource = /am|pm/i.test(timeMatch[2] || '') ? timeMatch[2] : timeMatch[3];
  const meridiem = meridiemSource ? ` ${meridiemSource.toUpperCase()}` : '';
  return `${hour}:${minutes}${meridiem}`;
}

function parseAppointmentLocation(text: string) {
  const match = text.match(/\b(?:at|in|location)\s+(.+?)(?:\s+(?:with|for|on)\b|$)/i);
  return match?.[1]?.trim();
}

function parseAppointmentVendor(text: string) {
  const match = text.match(/\b(?:with|vendor)\s+(.+?)(?:\s+(?:at|on|for)\b|$)/i);
  return match?.[1]?.trim();
}

function parseAppointmentStatus(text: string): Appointment['status'] {
  if (/\b(confirm|confirmed)\b/i.test(text)) return 'confirmed';
  if (/\b(done|completed|complete)\b/i.test(text)) return 'done';
  return 'planned';
}

export function parseAppointment(text: string) {
  const date = parseAppointmentDate(text);
  if (!date) return null;

  const titleMatch = text.match(/\b(?:for|about|title|called)\s+(.+?)(?:\s+(?:on|at)\b|$)/i);
  const cleanedTitle = text
    .replace(/\b(create|add|make|set|schedule|book|appointment|meeting|calendar|for|on|at|today|tomorrow)\b/gi, ' ')
    .replace(/\b20\d{2}-\d{1,2}-\d{1,2}\b/g, ' ')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/20\d{2})?\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = titleMatch?.[1]?.trim() || cleanedTitle || 'Appointment';

  return {
    id: `${Date.now()}`,
    title: title.length > 60 ? `${title.slice(0, 57)}...` : title,
    date: dateKey(date),
    time: parseAppointmentTime(text),
    location: parseAppointmentLocation(text),
    vendor: parseAppointmentVendor(text),
    status: parseAppointmentStatus(text),
    note: text
  };
}

export function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(year, month, 1 - firstDay.getDay());
  const todayKey = dateKey(new Date());

  return Array.from({ length: 42 }, (_, index): CalendarDay => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const key = dateKey(date);

    return {
      date,
      key,
      isCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey
    };
  });
}
