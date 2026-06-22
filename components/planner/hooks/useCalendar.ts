'use client';

import { useCallback, useMemo } from 'react';
import { storageKeys } from '../data';
import type { Appointment, AppLanguage, PlannerProfile } from '../types';
import { dateKey, downloadTextFile, getCalendarDays, monthLabel, sortAppointments } from '../utils';
import { useLocalStorage } from '../../../lib/hooks/useLocalStorage';

export type CalendarView = 'month' | 'agenda';
export type AgendaFilter = 'upcoming' | 'all';

export type UseCalendarOptions = {
  language: AppLanguage;
  profile: PlannerProfile;
};

export type UseCalendarResult = {
  appointments: Appointment[];
  month: Date;
  view: CalendarView;
  agendaFilter: AgendaFilter;
  selectedDate: string;
  days: ReturnType<typeof getCalendarDays>;
  setMonth: (date: Date) => void;
  changeMonth: (direction: -1 | 1) => void;
  setSelectedDate: (key: string) => void;
  selectDay: (date: Date) => void;
  setView: (view: CalendarView) => void;
  setAgendaFilter: (filter: AgendaFilter) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  replaceAll: (appointments: Appointment[]) => void;
  selectedMonthAppointments: Appointment[];
  selectedDateAppointments: Appointment[];
  agendaItems: Appointment[];
  agendaGroups: Array<{ key: string; label: string; items: Appointment[] }>;
  selectedDateLabel: string;
  todayKey: string;
  weddingDayAppointment: Appointment | null;
  isSelectedWeddingDay: boolean;
  downloadSingleIcs: (appointment: Appointment) => void;
  downloadAllIcs: () => void;
  needsTimeCount: number;
  monthLabel: string;
  hydrated: boolean;
};

const escapeIcs = (value: string | undefined) =>
  (value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

const toLocalIcs = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
};

const buildIcsEvent = (appointment: Appointment, nowStamp: string) => {
  const compactDate = appointment.date.replace(/-/g, '');
  const timeMatch = appointment.time?.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  let dateLines = '';
  if (timeMatch) {
    const start = new Date(`${appointment.date}T${appointment.time}:00`);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    dateLines = `DTSTART:${toLocalIcs(start)}\nDTEND:${toLocalIcs(end)}`;
  } else {
    const end = new Date(`${appointment.date}T00:00:00`);
    end.setDate(end.getDate() + 1);
    dateLines = `DTSTART;VALUE=DATE:${compactDate}\nDTEND;VALUE=DATE:${dateKey(end).replace(/-/g, '')}`;
  }
  const description = [
    appointment.note,
    appointment.vendor ? `Vendor: ${appointment.vendor}` : '',
    appointment.status ? `Status: ${appointment.status}` : ''
  ]
    .filter(Boolean)
    .join('\n');
  return [
    'BEGIN:VEVENT',
    `UID:${appointment.id}@majlismate.local`,
    `DTSTAMP:${nowStamp}`,
    dateLines,
    `SUMMARY:${escapeIcs(appointment.title)}`,
    appointment.location ? `LOCATION:${escapeIcs(appointment.location)}` : '',
    description ? `DESCRIPTION:${escapeIcs(description)}` : '',
    'END:VEVENT'
  ]
    .filter(Boolean)
    .join('\n');
};

const wrapCalendar = (events: string[]) =>
  [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MajlisMate//Wedding Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\n');

const safeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'appointment';

export function useCalendar({ language, profile }: UseCalendarOptions): UseCalendarResult {
  const [appointments, setAppointments, hydrated] = useLocalStorage<Appointment[]>(storageKeys.appointments, []);
  const [monthIso, setMonthIso, monthHydrated] = useLocalStorage<string>(storageKeys.calendarMonth, new Date().toISOString());
  const [view, setViewRaw] = useLocalStorage<CalendarView>(storageKeys.calendarView, 'month');
  const [agendaFilter, setAgendaFilterRaw] = useLocalStorage<AgendaFilter>(storageKeys.calendarAgendaFilter, 'upcoming');
  const [selectedDate, setSelectedDateRaw] = useLocalStorage<string>(storageKeys.selectedDate, dateKey(new Date()));

  const month = useMemo(() => new Date(monthIso), [monthIso]);

  const days = useMemo(() => getCalendarDays(month), [month]);

  const setMonth = useCallback(
    (date: Date) => {
      setMonthIso(date.toISOString());
    },
    [setMonthIso]
  );

  const changeMonth = useCallback(
    (direction: -1 | 1) => {
      const next = new Date(month.getFullYear(), month.getMonth() + direction, 1);
      setMonthIso(next.toISOString());
      setSelectedDateRaw(dateKey(next));
    },
    [month, setMonthIso, setSelectedDateRaw]
  );

  const setSelectedDate = useCallback(
    (key: string) => {
      setSelectedDateRaw(key);
    },
    [setSelectedDateRaw]
  );

  const selectDay = useCallback(
    (date: Date) => {
      setSelectedDateRaw(dateKey(date));
      setMonthIso(new Date(date.getFullYear(), date.getMonth(), 1).toISOString());
    },
    [setSelectedDateRaw, setMonthIso]
  );

  const setView = useCallback(
    (next: CalendarView) => {
      setViewRaw(next);
    },
    [setViewRaw]
  );

  const setAgendaFilter = useCallback(
    (next: AgendaFilter) => {
      setAgendaFilterRaw(next);
    },
    [setAgendaFilterRaw]
  );

  const addAppointment = useCallback(
    (appointment: Appointment) => {
      setAppointments((current) => [...current, appointment]);
    },
    [setAppointments]
  );

  const updateAppointment = useCallback(
    (id: string, patch: Partial<Appointment>) => {
      setAppointments((current) => current.map((appointment) => (appointment.id === id ? { ...appointment, ...patch } : appointment)));
    },
    [setAppointments]
  );

  const removeAppointment = useCallback(
    (id: string) => {
      setAppointments((current) => current.filter((appointment) => appointment.id !== id));
    },
    [setAppointments]
  );

  const replaceAll = useCallback(
    (next: Appointment[]) => {
      setAppointments(() => next);
    },
    [setAppointments]
  );

  const todayKey = useMemo(() => dateKey(new Date()), []);

  const weddingDayAppointment: Appointment | null = useMemo(
    () =>
      profile.majlisDate
        ? {
            id: 'wedding-day',
            title: language === 'ms' ? 'Hari majlis' : 'Wedding day',
            date: profile.majlisDate,
            status: 'confirmed',
            location: profile.negeri,
            note: profile.coupleName || [profile.groomName, profile.brideName].filter(Boolean).join(' & ')
          }
        : null,
    [profile, language]
  );

  const isSelectedWeddingDay = Boolean(profile.majlisDate && selectedDate === profile.majlisDate);

  const selectedMonthAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => {
          const date = new Date(`${appointment.date}T00:00:00`);
          return date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear();
        })
        .sort(sortAppointments),
    [appointments, month]
  );

  const selectedDateAppointments = useMemo(
    () => appointments.filter((appointment) => appointment.date === selectedDate).sort(sortAppointments),
    [appointments, selectedDate]
  );

  const agendaItems = useMemo(
    () =>
      [
        ...appointments,
        ...(weddingDayAppointment ? [weddingDayAppointment] : [])
      ]
        .filter((appointment) => agendaFilter === 'all' || appointment.date >= todayKey)
        .sort(sortAppointments),
    [appointments, weddingDayAppointment, agendaFilter, todayKey]
  );

  const agendaGroups = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: Appointment[] }> = [];
    for (const appointment of agendaItems) {
      const date = new Date(`${appointment.date}T00:00:00`);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', { month: 'long', year: 'numeric' });
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.items.push(appointment);
        continue;
      }
      groups.push({ key, label, items: [appointment] });
    }
    return groups;
  }, [agendaItems, language]);

  const needsTimeCount = useMemo(
    () => agendaItems.filter((appointment) => !appointment.time && appointment.id !== 'wedding-day').length,
    [agendaItems]
  );

  const selectedDateLabel = useMemo(() => {
    return new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }, [selectedDate]);

  const downloadSingleIcs = useCallback((appointment: Appointment) => {
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const calendar = wrapCalendar([buildIcsEvent(appointment, nowStamp)]);
    downloadTextFile(`majlismate-${safeName(appointment.title)}.ics`, calendar, 'text/calendar;charset=utf-8');
  }, []);

  const downloadAllIcs = useCallback(() => {
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const events: string[] = [];
    if (weddingDayAppointment) events.push(buildIcsEvent(weddingDayAppointment, nowStamp));
    for (const appointment of appointments) {
      events.push(buildIcsEvent(appointment, nowStamp));
    }
    const calendar = wrapCalendar(events);
    downloadTextFile('majlismate-calendar.ics', calendar, 'text/calendar;charset=utf-8');
  }, [appointments, weddingDayAppointment]);

  return {
    appointments,
    month,
    view,
    agendaFilter,
    selectedDate,
    days,
    setMonth,
    changeMonth,
    setSelectedDate,
    selectDay,
    setView,
    setAgendaFilter,
    addAppointment,
    updateAppointment,
    removeAppointment,
    replaceAll,
    selectedMonthAppointments,
    selectedDateAppointments,
    agendaItems,
    agendaGroups,
    selectedDateLabel,
    todayKey,
    weddingDayAppointment,
    isSelectedWeddingDay,
    downloadSingleIcs,
    downloadAllIcs,
    needsTimeCount,
    monthLabel: monthLabel(month),
    hydrated: hydrated && monthHydrated
  };
}
