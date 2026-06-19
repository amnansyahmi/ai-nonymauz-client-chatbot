import type { Appointment, BudgetItem, Guest } from './types';
import { dateKey, rsvpLabel, statusLabel } from './utils';

/**
 * Pure builders for the planner's file exports (ICS calendar, CSV) and CSV
 * import parsing. Extracted from PlannerWorkspace so the component keeps only
 * the thin "trigger download / show status" shell, and the transforms are
 * unit-testable in isolation.
 */

function escapeIcs(value: string | undefined): string {
  return (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function toLocalIcs(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

/** Timed events get DTSTART/DTEND with a 1h duration; all-day events span one day. */
function icsDateLines(appointment: Appointment): string {
  const timeMatch = appointment.time?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (timeMatch) {
    const start = new Date(`${appointment.date}T${appointment.time}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return `DTSTART:${toLocalIcs(start)}\nDTEND:${toLocalIcs(end)}`;
  }
  const compactDate = appointment.date.replace(/-/g, '');
  const end = new Date(`${appointment.date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return `DTSTART;VALUE=DATE:${compactDate}\nDTEND;VALUE=DATE:${dateKey(end).replace(/-/g, '')}`;
}

function icsStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function icsEvent(appointment: Appointment, description: string, dtstamp: string): string {
  return [
    'BEGIN:VEVENT',
    `UID:${appointment.id}@majlismate.local`,
    `DTSTAMP:${dtstamp}`,
    icsDateLines(appointment),
    `SUMMARY:${escapeIcs(appointment.title)}`,
    appointment.location ? `LOCATION:${escapeIcs(appointment.location)}` : '',
    description ? `DESCRIPTION:${escapeIcs(description)}` : '',
    'END:VEVENT'
  ].filter(Boolean).join('\n');
}

function wrapCalendar(events: string[]): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MajlisMate//Wedding Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\n');
}

/** Single-appointment .ics with a richer description (vendor + status). */
export function buildAppointmentIcs(appointment: Appointment): string {
  const description = [
    appointment.note,
    appointment.vendor ? `Vendor: ${appointment.vendor}` : '',
    appointment.status ? `Status: ${appointment.status}` : ''
  ].filter(Boolean).join('\n');
  return wrapCalendar([icsEvent(appointment, description, icsStamp())]);
}

/** Multi-appointment .ics (description = note only). */
export function buildCalendarIcs(appointments: Appointment[]): string {
  const dtstamp = icsStamp();
  return wrapCalendar(appointments.map((appointment) => icsEvent(appointment, appointment.note || '', dtstamp)));
}

/** Safe filename slug from an appointment title. */
export function icsFilename(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'appointment';
}

function csvRow(cells: string[]): string {
  return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',');
}

export function buildGuestsCsv(guests: Guest[]): string {
  return [
    csvRow(['name', 'phone', 'group', 'pax', 'status']),
    ...guests.map((guest) => csvRow([guest.name, guest.phone, guest.group, String(guest.pax), rsvpLabel(guest.status)]))
  ].join('\n');
}

export function buildBudgetCsv(items: BudgetItem[]): string {
  return [
    csvRow(['category', 'planned', 'actual', 'paid', 'status', 'note']),
    ...items.map((item) => csvRow([
      item.category,
      String(item.planned),
      String(item.actual),
      String(item.paid),
      statusLabel(item.status),
      item.note
    ]))
  ].join('\n');
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let isQuoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === '"' && isQuoted && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      isQuoted = !isQuoted;
    } else if (char === ',' && !isQuoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Parse a guest CSV (with or without a header row) into Guest records. */
export function parseGuestsCsv(text: string): Guest[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const firstRow = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = firstRow.some((cell) => ['name', 'phone', 'group', 'pax', 'status'].includes(cell));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines
    .map((line, index) => {
      const [name, phone = '', group = 'Kawan-kawan', pax = '1', status = 'pending'] = parseCsvLine(line);
      const normalizedStatus = status.toLowerCase();
      // Check declined first: "tidak hadir" contains "hadir", so a confirm-first
      // check would misclassify a no-show as confirmed.
      const guestStatus: Guest['status'] =
        normalizedStatus.includes('decline') || normalizedStatus.includes('tidak')
          ? 'declined'
          : normalizedStatus.includes('confirm') || normalizedStatus.includes('hadir')
            ? 'confirmed'
            : 'pending';
      return {
        id: `${Date.now()}-${index}`,
        name: name?.trim(),
        phone: phone.trim(),
        group: group.trim() || 'Kawan-kawan',
        pax: Math.max(Number(pax) || 1, 1),
        status: guestStatus
      };
    })
    .filter((guest): guest is Guest => Boolean(guest.name));
}
