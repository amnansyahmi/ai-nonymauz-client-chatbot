'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  checklistTemplates,
  defaultAssistantMessage,
  defaultBudgetItems,
  defaultPlannerProfile,
  starterQuestions,
  storageKeys,
  vendorDirectory
} from './planner/data';
import ChatWidget from './ChatWidget';
import MenuAssistant, {
  createMenuAssistantMessages,
  createMenuInputs,
  type MenuAssistantTab
} from './planner/MenuAssistant';
import { BudgetPanel, DashboardPanel, RsvpPanel, VendorsPanel } from './planner/WorkspacePanels';
import type {
  ActiveTab,
  ActivityItem,
  Appointment,
  AppointmentDraft,
  BeforeInstallPromptEvent,
  BudgetItem,
  CalendarDay,
  ChecklistItem,
  Guest,
  Message,
  PlannerProfile,
  Source,
  Vendor
} from './planner/types';
import {
  checklistFromAnswer,
  dateKey,
  daysUntil,
  downloadTextFile,
  fallbackChecklist,
  formatAppointmentsText,
  formatChecklistText,
  generateDefaultChecklist,
  getCalendarDays,
  money,
  monthLabel,
  parseAppointment,
  parseSseEvents,
  rsvpLabel,
  safeJsonParse,
  sortAppointments,
  statusLabel,
  wantsAppointment,
  wantsChecklist,
  wantsVendorMessage
} from './planner/utils';

export default function PlannerWorkspace() {
  const [messages, setMessages] = useState<Message[]>([defaultAssistantMessage]);
  const [input, setInput] = useState('');
  const [menuMessages, setMenuMessages] = useState<Record<MenuAssistantTab, Message[]>>(() => createMenuAssistantMessages());
  const [menuInputs, setMenuInputs] = useState<Record<MenuAssistantTab, string>>(() => createMenuInputs());
  const [menuLoading, setMenuLoading] = useState<MenuAssistantTab | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [plannerProfile, setPlannerProfile] = useState<PlannerProfile>(defaultPlannerProfile);
  const [checklistTitle, setChecklistTitle] = useState('Checklist');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistFilter, setChecklistFilter] = useState('all');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(defaultBudgetItems);
  const [budgetDraft, setBudgetDraft] = useState<BudgetItem>({
    id: '',
    category: '',
    planned: 0,
    actual: 0,
    paid: 0,
    status: 'not-started',
    note: ''
  });
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestDraft, setGuestDraft] = useState<Guest>({
    id: '',
    name: '',
    phone: '',
    group: 'Kawan-kawan',
    pax: 1,
    status: 'pending'
  });
  const [savedVendors, setSavedVendors] = useState<string[]>([]);
  const [vendorFilter, setVendorFilter] = useState({ negeri: 'All', category: 'All' });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>({
    title: '',
    date: dateKey(new Date()),
    time: '',
    location: '',
    vendor: '',
    status: 'planned',
    note: ''
  });
  const [appointmentAssistantActive, setAppointmentAssistantActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedMessages = safeJsonParse<Message[]>(localStorage.getItem(storageKeys.messages), [defaultAssistantMessage]);
    const storedActiveTab = localStorage.getItem(storageKeys.activeTab) as ActiveTab | null;
    const storedChecklistTitle = localStorage.getItem(storageKeys.checklistTitle);
    const storedChecklistItems = safeJsonParse<ChecklistItem[]>(localStorage.getItem(storageKeys.checklistItems), []);
    const storedAppointments = safeJsonParse<Appointment[]>(localStorage.getItem(storageKeys.appointments), []);
    const storedCalendarMonth = localStorage.getItem(storageKeys.calendarMonth);
    const storedPlannerProfile = safeJsonParse<PlannerProfile>(localStorage.getItem(storageKeys.plannerProfile), defaultPlannerProfile);
    const storedBudgetItems = safeJsonParse<BudgetItem[]>(localStorage.getItem(storageKeys.budgetItems), defaultBudgetItems);
    const storedGuests = safeJsonParse<Guest[]>(localStorage.getItem(storageKeys.guests), []);
    const storedSavedVendors = safeJsonParse<string[]>(localStorage.getItem(storageKeys.savedVendors), []);
    const storedActivity = safeJsonParse<ActivityItem[]>(localStorage.getItem(storageKeys.activity), []);

    setMessages(storedMessages.length > 0 ? storedMessages : [defaultAssistantMessage]);
    if (
      storedActiveTab === 'dashboard' ||
      storedActiveTab === 'chat' ||
      storedActiveTab === 'checklist' ||
      storedActiveTab === 'calendar' ||
      storedActiveTab === 'budget' ||
      storedActiveTab === 'rsvp' ||
      storedActiveTab === 'vendors'
    ) {
      setActiveTab(storedActiveTab);
    }
    setPlannerProfile({ ...defaultPlannerProfile, ...storedPlannerProfile });
    if (storedChecklistTitle) setChecklistTitle(storedChecklistTitle);
    setChecklistItems(storedChecklistItems.map((item) => ({ ...item, status: item.status || (item.completed ? 'done' : 'not-started') })));
    setAppointments(storedAppointments);
    setBudgetItems(storedBudgetItems.length > 0 ? storedBudgetItems : defaultBudgetItems);
    setGuests(storedGuests);
    setSavedVendors(storedSavedVendors);
    setActivity(storedActivity);
    if (storedCalendarMonth) {
      const storedMonth = new Date(storedCalendarMonth);
      setCalendarMonth(storedMonth);
      setSelectedDate(dateKey(storedMonth));
    }
    setIsOffline(!navigator.onLine);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.messages, JSON.stringify(messages));
  }, [isHydrated, messages]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.activeTab, activeTab);
  }, [activeTab, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.checklistTitle, checklistTitle);
    localStorage.setItem(storageKeys.checklistItems, JSON.stringify(checklistItems));
  }, [checklistItems, checklistTitle, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.appointments, JSON.stringify(appointments));
  }, [appointments, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.calendarMonth, calendarMonth.toISOString());
  }, [calendarMonth, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.plannerProfile, JSON.stringify(plannerProfile));
  }, [isHydrated, plannerProfile]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.budgetItems, JSON.stringify(budgetItems));
  }, [budgetItems, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.guests, JSON.stringify(guests));
  }, [guests, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.savedVendors, JSON.stringify(savedVendors));
  }, [isHydrated, savedVendors]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.activity, JSON.stringify(activity));
  }, [activity, isHydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    if (!statusMessage) return;

    const timeout = window.setTimeout(() => setStatusMessage(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  function addActivity(text: string) {
    setActivity((current) => [{ id: `${Date.now()}`, text, time: new Date().toISOString() }, ...current].slice(0, 8));
  }

  function completeOnboarding(event: FormEvent) {
    event.preventDefault();
    const coupleName =
      plannerProfile.coupleName.trim() ||
      [plannerProfile.groomName.trim(), plannerProfile.brideName.trim()].filter(Boolean).join(' & ');
    const completedProfile = { ...plannerProfile, coupleName, completed: true };
    setPlannerProfile(completedProfile);
    if (checklistItems.length === 0) {
      setChecklistTitle('Majlis planning checklist');
      setChecklistItems(generateDefaultChecklist(completedProfile.majlisDate));
    }
    if (budgetItems.every((item) => item.planned === 0 && item.actual === 0 && item.paid === 0)) {
      const starterBudget = completedProfile.totalBudget > 0 ? Math.round(completedProfile.totalBudget / defaultBudgetItems.length) : 0;
      setBudgetItems(defaultBudgetItems.map((item) => ({ ...item, planned: starterBudget })));
    }
    addActivity('Onboarding completed and planner workspace prepared.');
    setStatusMessage('Planner setup saved.');
  }

  function createDefaultChecklist() {
    setChecklistTitle('Majlis planning checklist');
    setChecklistItems(generateDefaultChecklist(plannerProfile.majlisDate));
    setActiveTab('checklist');
    addActivity('Default PRD checklist generated.');
    setStatusMessage('Default wedding checklist generated.');
  }

  function buildPlannerContext() {
    return {
      majlisDate: plannerProfile.majlisDate,
      groomName: plannerProfile.groomName,
      brideName: plannerProfile.brideName,
      negeri: plannerProfile.negeri,
      totalBudget: plannerProfile.totalBudget,
      guestTarget: plannerProfile.guestTarget,
      checklistSummary: `${completedCount}/${checklistItems.length} checklist items done`,
      budgetSummary: budgetItems.map((item) => `${item.category}: planned ${money(item.planned)}, paid ${money(item.paid)}`).slice(0, 6),
      upcomingAppointments: appointments.filter((appointment) => appointment.date >= dateKey(new Date())).sort(sortAppointments).slice(0, 5)
    };
  }

  async function ask(question: string, targetTab?: MenuAssistantTab) {
    const trimmed = question.trim();
    if (!trimmed || loading || menuLoading) return;

    const isMenuAssistant = Boolean(targetTab);
    const currentMessages = targetTab ? menuMessages[targetTab] : messages;
    const nextMessages: Message[] = [...currentMessages, { role: 'user', content: trimmed }];
    const assistantIndex = nextMessages.length;
    const shouldCreateChecklist = wantsChecklist(trimmed);
    const shouldCreateAppointment = appointmentAssistantActive || wantsAppointment(trimmed);
    const shouldDraftVendorMessage = wantsVendorMessage(trimmed);

    if (shouldCreateChecklist) {
      setActiveTab('checklist');
      setChecklistTitle(trimmed.length > 64 ? `${trimmed.slice(0, 61)}...` : trimmed);
      setChecklistItems([]);
    }

    if (shouldCreateAppointment) {
      setAppointmentAssistantActive(false);
    }

    if (shouldDraftVendorMessage && !isMenuAssistant) {
      setActiveTab('chat');
    }

    if (targetTab) {
      setMenuMessages((current) => ({
        ...current,
        [targetTab]: [...nextMessages, { role: 'assistant', content: '' }]
      }));
      setMenuInputs((current) => ({ ...current, [targetTab]: '' }));
      setMenuLoading(targetTab);
    } else {
      setMessages([...nextMessages, { role: 'assistant', content: '' }]);
      setInput('');
      setLoading(true);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          plannerContext: buildPlannerContext()
        })
      });

      if (!response.body) {
        throw new Error('No response body received from /api/chat');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';
      let currentSources: Source[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseEvents(buffer);
        buffer = parsed.remaining;

        for (const event of parsed.events) {
          if (event.type === 'sources') {
            currentSources = event.sources || [];
            if (targetTab) {
              setMenuMessages((current) => ({
                ...current,
                [targetTab]: current[targetTab].map((message, index) =>
                  index === assistantIndex ? { ...message, sources: currentSources } : message
                )
              }));
            } else {
              setMessages((current) =>
                current.map((message, index) =>
                  index === assistantIndex ? { ...message, sources: currentSources } : message
                )
              );
            }
          }

          if (event.type === 'delta' && event.text) {
            fullAnswer += event.text;
            if (targetTab) {
              setMenuMessages((current) => ({
                ...current,
                [targetTab]: current[targetTab].map((message, index) =>
                  index === assistantIndex ? { ...message, content: fullAnswer, sources: currentSources } : message
                )
              }));
            } else {
              setMessages((current) =>
                current.map((message, index) =>
                  index === assistantIndex ? { ...message, content: fullAnswer, sources: currentSources } : message
                )
              );
            }
          }

          if (event.type === 'error') {
            throw new Error(event.error || 'Failed to get response');
          }
        }
      }

      const tail = parseSseEvents(buffer + '\n\n');
      for (const event of tail.events) {
        if (event.type === 'delta' && event.text) {
          fullAnswer += event.text;
        }
      }

      if (!fullAnswer.trim()) {
        const emptyMessage = 'Sorry, MajlisMate.ai tak dapat jawapan untuk request ini.';
        if (targetTab) {
          setMenuMessages((current) => ({
            ...current,
            [targetTab]: current[targetTab].map((message, index) =>
              index === assistantIndex ? { ...message, content: emptyMessage } : message
            )
          }));
        } else {
          setMessages((current) =>
            current.map((message, index) =>
              index === assistantIndex ? { ...message, content: emptyMessage } : message
            )
          );
        }
      }

      if (shouldCreateChecklist) {
        const generatedItems = checklistFromAnswer(fullAnswer);
        setChecklistItems((generatedItems.length > 0 ? generatedItems : fallbackChecklist(trimmed)).map((item) => ({ ...item, status: 'not-started' })));
        addActivity('AI generated a checklist.');
      }

      if (shouldCreateAppointment) {
        const appointment = parseAppointment(trimmed);
        if (appointment) {
          setAppointments((current) => [...current, appointment]);
          setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
          setSelectedDate(appointment.date);
          setActiveTab('calendar');
          addActivity(`Appointment added: ${appointment.title}.`);
        }
      }
      if (shouldDraftVendorMessage) {
        addActivity('AI drafted a vendor message.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      if (targetTab) {
        setMenuMessages((current) => ({
          ...current,
          [targetTab]: [...nextMessages, { role: 'assistant', content: `Sorry, ada error: ${message}` }]
        }));
      } else {
        setMessages([...nextMessages, { role: 'assistant', content: `Sorry, ada error: ${message}` }]);
      }
      if (shouldCreateChecklist) {
        setChecklistItems(fallbackChecklist(trimmed).map((item) => ({ ...item, status: 'not-started' })));
        addActivity('Fallback checklist generated.');
      }
      if (shouldCreateAppointment) {
        const appointment = parseAppointment(trimmed);
        if (appointment) {
          setAppointments((current) => [...current, appointment]);
          setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
          setSelectedDate(appointment.date);
          setActiveTab('calendar');
          addActivity(`Appointment added: ${appointment.title}.`);
        }
      }
    } finally {
      if (targetTab) {
        setMenuLoading(null);
      } else {
        setLoading(false);
      }
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  function submitMenuAssistant(event: FormEvent, tab: MenuAssistantTab) {
    event.preventDefault();
    ask(menuInputs[tab], tab);
  }

  function setMenuAssistantPrompt(tab: MenuAssistantTab, prompt: string) {
    setMenuInputs((current) => ({ ...current, [tab]: prompt }));
  }

  function toggleChecklistItem(id: string) {
    setChecklistItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, completed: !item.completed, status: !item.completed ? 'done' : 'not-started' }
          : item
      )
    );
    addActivity('Checklist item updated.');
  }

  function removeChecklistItem(id: string) {
    setChecklistItems((current) => current.filter((item) => item.id !== id));
    addActivity('Checklist item removed.');
  }

  function addChecklistItem(event: FormEvent) {
    event.preventDefault();
    const text = newChecklistItem.trim();
    if (!text) return;

    setChecklistItems((current) => [
      ...current,
      { id: `${Date.now()}-${current.length}`, text, completed: false, status: 'not-started', phase: 'Custom' }
    ]);
    setNewChecklistItem('');
    addActivity('Checklist item added.');
  }

  function updateChecklistStatus(id: string, status: NonNullable<ChecklistItem['status']>) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status, completed: status === 'done' } : item))
    );
    addActivity('Checklist status updated.');
  }

  function startAppointmentAssistant() {
    setAppointmentAssistantActive(true);
    setMenuInputs((current) => ({
      ...current,
      calendar: `Create an appointment on ${selectedDate} at `
    }));
    setStatusMessage('Tell the calendar assistant what to schedule.');
  }

  function changeCalendarMonth(direction: -1 | 1) {
    setCalendarMonth((current) => {
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + direction, 1);
      setSelectedDate(dateKey(nextMonth));
      setAppointmentDraft((draft) => ({ ...draft, date: dateKey(nextMonth) }));
      return nextMonth;
    });
  }

  function removeAppointment(id: string) {
    setAppointments((current) => current.filter((appointment) => appointment.id !== id));
    addActivity('Appointment removed.');
  }

  function selectCalendarDate(day: CalendarDay) {
    setSelectedDate(day.key);
    setCalendarMonth(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    setAppointmentDraft((current) => ({ ...current, date: day.key }));
  }

  function updateAppointmentStatus(id: string, status: NonNullable<Appointment['status']>) {
    setAppointments((current) =>
      current.map((appointment) => (appointment.id === id ? { ...appointment, status } : appointment))
    );
    addActivity('Appointment status updated.');
  }

  function applyChecklistTemplate(template: (typeof checklistTemplates)[number]) {
    setChecklistTitle(template.title);
    setChecklistItems(
      template.items.map((text, index) => ({
        id: `${Date.now()}-${index}`,
        text,
        completed: false
      }))
    );
    setActiveTab('checklist');
    setStatusMessage(`${template.title} loaded.`);
    addActivity(`${template.title} loaded.`);
  }

  function addBudgetItem(event: FormEvent) {
    event.preventDefault();
    const category = budgetDraft.category.trim();
    if (!category) return;

    setBudgetItems((current) => [
      ...current,
      {
        ...budgetDraft,
        id: `${Date.now()}`,
        category,
        planned: Number(budgetDraft.planned) || 0,
        actual: Number(budgetDraft.actual) || 0,
        paid: Number(budgetDraft.paid) || 0
      }
    ]);
    setBudgetDraft({ id: '', category: '', planned: 0, actual: 0, paid: 0, status: 'not-started', note: '' });
    addActivity(`Budget item added: ${category}.`);
  }

  function updateBudgetItem(id: string, patch: Partial<BudgetItem>) {
    setBudgetItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeBudgetItem(id: string) {
    setBudgetItems((current) => current.filter((item) => item.id !== id));
    addActivity('Budget item removed.');
  }

  function addGuest(event: FormEvent) {
    event.preventDefault();
    const name = guestDraft.name.trim();
    if (!name) return;

    setGuests((current) => [
      ...current,
      {
        ...guestDraft,
        id: `${Date.now()}`,
        name,
        phone: guestDraft.phone.trim(),
        pax: Number(guestDraft.pax) || 1
      }
    ]);
    setGuestDraft({ id: '', name: '', phone: '', group: 'Kawan-kawan', pax: 1, status: 'pending' });
    addActivity(`Guest added: ${name}.`);
  }

  function updateGuest(id: string, patch: Partial<Guest>) {
    setGuests((current) => current.map((guest) => (guest.id === id ? { ...guest, ...patch } : guest)));
  }

  function removeGuest(id: string) {
    setGuests((current) => current.filter((guest) => guest.id !== id));
    addActivity('Guest removed.');
  }

  function toggleSavedVendor(id: string) {
    setSavedVendors((current) => {
      const isSaved = current.includes(id);
      return isSaved ? current.filter((vendorId) => vendorId !== id) : [...current, id];
    });
    addActivity('Saved vendor list updated.');
  }

  function askVendorMessage(vendor: Vendor) {
    setActiveTab('chat');
    setInput(`Draft a WhatsApp message to ${vendor.name} for ${vendor.category} in ${vendor.negeri}. Ask about availability, package, price range, deposit, setup timing, and what they need from us.`);
  }

  async function copyChecklist() {
    await navigator.clipboard.writeText(formatChecklistText(checklistTitle, checklistItems));
    setStatusMessage('Checklist copied.');
  }

  async function copyAppointments() {
    await navigator.clipboard.writeText(formatAppointmentsText(appointments));
    setStatusMessage('Appointments copied.');
  }

  function exportChecklist(format: 'txt' | 'json') {
    if (format === 'json') {
      downloadTextFile('majlismate-checklist.json', JSON.stringify({ title: checklistTitle, items: checklistItems }, null, 2), 'application/json');
      return;
    }

    downloadTextFile('majlismate-checklist.txt', formatChecklistText(checklistTitle, checklistItems));
  }

  function exportAppointments(format: 'csv' | 'json') {
    if (format === 'json') {
      downloadTextFile('majlismate-appointments.json', JSON.stringify(appointments, null, 2), 'application/json');
      return;
    }

    const rows = [
      ['date', 'time', 'title', 'note'],
      ...appointments.map((appointment) => [
        appointment.date,
        appointment.time || '',
        appointment.title,
        appointment.note
      ])
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    downloadTextFile('majlismate-appointments.csv', csv, 'text/csv');
  }

  function exportGuestsCsv() {
    const rows = [
      ['name', 'phone', 'group', 'pax', 'status'],
      ...guests.map((guest) => [guest.name, guest.phone, guest.group, String(guest.pax), rsvpLabel(guest.status)])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadTextFile('majlismate-guests.csv', csv, 'text/csv');
  }

  function exportBudgetCsv() {
    const rows = [
      ['category', 'planned', 'actual', 'paid', 'status', 'note'],
      ...budgetItems.map((item) => [
        item.category,
        String(item.planned),
        String(item.actual),
        String(item.paid),
        statusLabel(item.status),
        item.note
      ])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadTextFile('majlismate-budget.csv', csv, 'text/csv');
  }

  function printChecklist() {
    window.print();
  }

  function addManualAppointment(event: FormEvent) {
    event.preventDefault();
    const title = appointmentDraft.title.trim();
    if (!title || !appointmentDraft.date) return;

    const appointment: Appointment = {
      id: `${Date.now()}`,
      title,
      date: appointmentDraft.date,
      time: appointmentDraft.time || undefined,
      location: appointmentDraft.location.trim() || undefined,
      vendor: appointmentDraft.vendor.trim() || undefined,
      status: appointmentDraft.status,
      note: appointmentDraft.note.trim()
    };

    setAppointments((current) => [...current, appointment]);
    setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
    setSelectedDate(appointment.date);
    setAppointmentDraft({
      title: '',
      date: appointment.date,
      time: '',
      location: '',
      vendor: '',
      status: 'planned',
      note: ''
    });
    setStatusMessage('Appointment added.');
  }

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function resetLocalWorkspace() {
    setMessages([defaultAssistantMessage]);
    setActiveTab('dashboard');
    setPlannerProfile(defaultPlannerProfile);
    setChecklistTitle('Checklist');
    setChecklistItems([]);
    setAppointments([]);
    setBudgetItems(defaultBudgetItems);
    setGuests([]);
    setSavedVendors([]);
    setActivity([]);
    setCalendarMonth(new Date());
    setSelectedDate(dateKey(new Date()));
    setStatusMessage('Local workspace cleared.');
  }

  const completedCount = checklistItems.filter((item) => item.completed).length;
  const calendarDays = getCalendarDays(calendarMonth);
  const selectedMonthAppointments = appointments
    .filter((appointment) => {
      const appointmentDate = new Date(`${appointment.date}T00:00:00`);
      return (
        appointmentDate.getMonth() === calendarMonth.getMonth() &&
        appointmentDate.getFullYear() === calendarMonth.getFullYear()
      );
    })
    .sort(sortAppointments);
  const selectedDateAppointments = appointments
    .filter((appointment) => appointment.date === selectedDate)
    .sort(sortAppointments);
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const totalChecklistItems = checklistItems.length;
  const planningProgress = totalChecklistItems > 0 ? Math.round((completedCount / totalChecklistItems) * 100) : 0;
  const daysLeft = daysUntil(plannerProfile.majlisDate);
  const totalPlanned = budgetItems.reduce((sum, item) => sum + (Number(item.planned) || 0), 0);
  const totalActual = budgetItems.reduce((sum, item) => sum + (Number(item.actual) || 0), 0);
  const totalPaid = budgetItems.reduce((sum, item) => sum + (Number(item.paid) || 0), 0);
  const confirmedGuests = guests.filter((guest) => guest.status === 'confirmed').reduce((sum, guest) => sum + guest.pax, 0);
  const declinedGuests = guests.filter((guest) => guest.status === 'declined').reduce((sum, guest) => sum + guest.pax, 0);
  const pendingGuests = guests.filter((guest) => guest.status === 'pending').reduce((sum, guest) => sum + guest.pax, 0);
  const urgentChecklist = checklistItems
    .filter((item) => !item.completed)
    .filter((item) => {
      if (!item.deadline) return true;
      const due = daysUntil(item.deadline);
      return due === null || due <= 21;
    })
    .slice(0, 5);
  const fallbackUrgent =
    daysLeft === null
      ? ['Complete onboarding so MajlisMate.ai can calculate deadlines.']
      : daysLeft > 365
        ? ['Confirm tarikh, apply nikah, and start venue research.']
        : daysLeft > 270
          ? ['Book jurufoto, survey baju pengantin, and shortlist venue.']
          : daysLeft > 180
            ? ['Tempah katerer, book andaman, and lock main vendors.']
            : daysLeft > 90
              ? ['Settle hantaran, tempah cenderahati, and prepare invitation plan.']
              : daysLeft > 30
                ? ['Hantar jemputan, set RSVP deadline, and confirm guest groups.']
                : daysLeft > 7
                  ? ['Confirm all vendors and give headcount to caterer.']
                  : ['Final briefing, confirm parking, and prepare day-of items.'];
  const filteredChecklistItems = checklistItems.filter((item) => {
    if (checklistFilter === 'all') return true;
    if (checklistFilter === 'not-started' || checklistFilter === 'in-progress' || checklistFilter === 'done') {
      return (item.status || (item.completed ? 'done' : 'not-started')) === checklistFilter;
    }
    return item.phase === checklistFilter;
  });
  const checklistPhases = Array.from(new Set(checklistItems.map((item) => item.phase).filter(Boolean))) as string[];
  const vendorCategories = Array.from(new Set(vendorDirectory.map((vendor) => vendor.category)));
  const vendorStates = Array.from(new Set(vendorDirectory.map((vendor) => vendor.negeri)));
  const filteredVendors = vendorDirectory.filter((vendor) => {
    const negeriMatch = vendorFilter.negeri === 'All' || vendor.negeri === vendorFilter.negeri;
    const categoryMatch = vendorFilter.category === 'All' || vendor.category === vendorFilter.category;
    return negeriMatch && categoryMatch;
  });
  const activeMenuTab = activeTab === 'dashboard' || activeTab === 'chat' ? null : activeTab;

  return (
    <section className="planner-workspace" aria-label="MajlisMate.ai planner workspace">
      <div className="planner-topbar">
        <div>
          <p className="eyebrow">MajlisMate.ai</p>
          <h2>Wedding Planner Workspace</h2>
        </div>
        <div className="header-actions">
          <span className="status-dot">{isOffline ? 'Offline' : 'Live demo'}</span>
          {installPrompt ? (
            <button type="button" onClick={installApp}>
              Install
            </button>
          ) : null}
          <button type="button" onClick={resetLocalWorkspace}>
            Reset
          </button>
        </div>
      </div>

      {isOffline ? (
        <div className="pwa-banner">Offline mode: templates and saved planning data are available. AI replies need internet.</div>
      ) : null}

      {statusMessage ? <div className="pwa-banner success">{statusMessage}</div> : null}

      <div className={`planner-body ${activeMenuTab ? 'has-assistant' : ''}`}>
        <aside className="planner-sidebar" aria-label="Planner menu">
          <div className="sidebar-header">
            <span className="sidebar-mark" aria-hidden="true">M</span>
            <div>
              <p>Workspace</p>
              <strong>Wedding tools</strong>
            </div>
          </div>
          <nav className="planner-menu" role="tablist" aria-label="Planner menu">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dashboard'}
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              className={activeTab === 'chat' ? 'active' : ''}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'checklist'}
              className={activeTab === 'checklist' ? 'active' : ''}
              onClick={() => setActiveTab('checklist')}
            >
              Checklist
              {checklistItems.length > 0 ? <span>{completedCount}/{checklistItems.length}</span> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'calendar'}
              className={activeTab === 'calendar' ? 'active' : ''}
              onClick={() => setActiveTab('calendar')}
            >
              Calendar
              {appointments.length > 0 ? <span>{appointments.length}</span> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'budget'}
              className={activeTab === 'budget' ? 'active' : ''}
              onClick={() => setActiveTab('budget')}
            >
              Budget
              {budgetItems.length > 0 ? <span>{money(totalPaid)}</span> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'rsvp'}
              className={activeTab === 'rsvp' ? 'active' : ''}
              onClick={() => setActiveTab('rsvp')}
            >
              RSVP
              {guests.length > 0 ? <span>{confirmedGuests}</span> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vendors'}
              className={activeTab === 'vendors' ? 'active' : ''}
              onClick={() => setActiveTab('vendors')}
            >
              Vendors
              {savedVendors.length > 0 ? <span>{savedVendors.length}</span> : null}
            </button>
          </nav>
        </aside>

        <div className="planner-content">
          {activeTab === 'dashboard' ? (
        <DashboardPanel
          plannerProfile={plannerProfile}
          setPlannerProfile={setPlannerProfile}
          completeOnboarding={completeOnboarding}
          daysLeft={daysLeft}
          planningProgress={planningProgress}
          completedCount={completedCount}
          totalChecklistItems={totalChecklistItems}
          totalPlanned={totalPlanned}
          totalActual={totalActual}
          totalPaid={totalPaid}
          confirmedGuests={confirmedGuests}
          pendingGuests={pendingGuests}
          declinedGuests={declinedGuests}
          createDefaultChecklist={createDefaultChecklist}
          urgentChecklist={urgentChecklist}
          fallbackUrgent={fallbackUrgent}
          activity={activity}
        />
      ) : activeTab === 'chat' ? (
        <div className="main-chat-panel">
          <div className="starter-grid">
            {starterQuestions.map((question) => (
              <button key={question} type="button" onClick={() => ask(question)} disabled={loading}>
                {question}
              </button>
            ))}
          </div>
          <ChatWidget
            messages={messages}
            input={input}
            loading={loading}
            placeholder="Ask about majlis, vendors, budget, checklist, appointment..."
            messagesEndRef={messagesEndRef}
            onInputChange={setInput}
            onSubmit={onSubmit}
          />
        </div>
      ) : activeTab === 'checklist' ? (
        <div className="checklist-panel">
          <div className="checklist-summary">
            <div>
              <p className="eyebrow">Interactive checklist</p>
              <h3>{checklistTitle}</h3>
            </div>
            <span>{completedCount}/{checklistItems.length} done</span>
          </div>

          <div className="template-strip" aria-label="Wedding checklist templates">
            {checklistTemplates.map((template) => (
              <button key={template.title} type="button" onClick={() => applyChecklistTemplate(template)}>
                {template.title}
              </button>
            ))}
          </div>

          <div className="tool-actions">
            <button type="button" onClick={copyChecklist} disabled={checklistItems.length === 0}>
              Copy
            </button>
            <button type="button" onClick={() => exportChecklist('txt')} disabled={checklistItems.length === 0}>
              Export TXT
            </button>
            <button type="button" onClick={() => exportChecklist('json')} disabled={checklistItems.length === 0}>
              Export JSON
            </button>
            <button type="button" onClick={printChecklist} disabled={checklistItems.length === 0}>
              Print
            </button>
            <button type="button" onClick={createDefaultChecklist}>
              PRD Default
            </button>
          </div>

          <div className="filter-row">
            <select value={checklistFilter} onChange={(event) => setChecklistFilter(event.target.value)} aria-label="Checklist filter">
              <option value="all">All checklist items</option>
              <option value="not-started">Belum Mula</option>
              <option value="in-progress">Sedang Diurus</option>
              <option value="done">Selesai</option>
              {checklistPhases.map((phase) => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
          </div>

          {loading && checklistItems.length === 0 ? <p className="typing">Creating checklist...</p> : null}

          {checklistItems.length > 0 ? (
            <ul className="checklist-items">
              {filteredChecklistItems.map((item) => (
                <li key={item.id} className={item.completed ? 'done' : ''}>
                  <label>
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => toggleChecklistItem(item.id)}
                    />
                    <span>
                      {item.text}
                      <small>{item.phase || 'Custom'} {item.deadline ? `- due ${item.deadline}` : ''}</small>
                    </span>
                  </label>
                  <select
                    value={item.status || (item.completed ? 'done' : 'not-started')}
                    onChange={(event) => updateChecklistStatus(item.id, event.target.value as NonNullable<ChecklistItem['status']>)}
                    aria-label={`Status for ${item.text}`}
                  >
                    <option value="not-started">Belum Mula</option>
                    <option value="in-progress">Sedang Diurus</option>
                    <option value="done">Selesai</option>
                  </select>
                  <button type="button" aria-label={`Remove ${item.text}`} onClick={() => removeChecklistItem(item.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : !loading ? (
            <p className="empty-state">Ask the chat to create a checklist and it will appear here.</p>
          ) : null}

          <form className="checklist-form" onSubmit={addChecklistItem}>
            <input
              value={newChecklistItem}
              onChange={(event) => setNewChecklistItem(event.target.value)}
              placeholder="Add checklist item..."
              aria-label="New checklist item"
            />
            <button type="submit" disabled={newChecklistItem.trim().length === 0}>
              Add
            </button>
          </form>
        </div>
      ) : activeTab === 'calendar' ? (
        <div className="calendar-panel">
          <div className="calendar-toolbar">
            <div>
              <p className="eyebrow">Calendar menu</p>
              <h3>{monthLabel(calendarMonth)}</h3>
              <p>Click any day to view or add appointments for that date.</p>
            </div>
            <div className="calendar-actions">
              <button type="button" onClick={() => changeCalendarMonth(-1)} aria-label="Previous month">
                &lt;
              </button>
              <button type="button" onClick={() => setCalendarMonth(new Date())}>
                Today
              </button>
              <button type="button" onClick={() => changeCalendarMonth(1)} aria-label="Next month">
                &gt;
              </button>
              <button type="button" className="primary-action" onClick={startAppointmentAssistant}>
                AI Add
              </button>
            </div>
          </div>

          <div className="calendar-workspace">
            <div className="calendar-grid" aria-label={`${monthLabel(calendarMonth)} calendar`}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="calendar-weekday">
                  {day}
                </div>
              ))}
              {calendarDays.map((day) => {
                const dayAppointments = appointments.filter((appointment) => appointment.date === day.key);
                const dayStatus = dayAppointments.some((appointment) => appointment.status === 'confirmed')
                  ? 'confirmed'
                  : dayAppointments.some((appointment) => appointment.status === 'done')
                    ? 'done'
                    : dayAppointments.length > 0
                      ? 'planned'
                      : '';

                return (
                  <button
                    type="button"
                    key={day.key}
                    onClick={() => selectCalendarDate(day)}
                    className={`calendar-day ${day.isCurrentMonth ? '' : 'muted'} ${day.isToday ? 'today' : ''} ${selectedDate === day.key ? 'selected' : ''}`}
                  >
                    <span className="calendar-date">{day.date.getDate()}</span>
                    <span className="calendar-add-hint">Select</span>
                    {dayAppointments.length > 0 ? (
                      <span className={`calendar-count ${dayStatus}`}>{dayAppointments.length}</span>
                    ) : null}
                    {dayAppointments.slice(0, 2).map((appointment) => (
                      <span key={appointment.id} className={`appointment-chip ${appointment.status || 'planned'}`}>
                        {appointment.time ? `${appointment.time} ` : ''}
                        {appointment.title}
                      </span>
                    ))}
                    {dayAppointments.length > 2 ? <span className="appointment-more">+{dayAppointments.length - 2}</span> : null}
                  </button>
                );
              })}
            </div>

            <aside className="day-agenda" aria-label="Selected day agenda">
              <div className="day-agenda-header">
                <div>
                  <p className="eyebrow">Selected day</p>
                  <h4>{selectedDateLabel}</h4>
                </div>
                <span>{selectedDateAppointments.length} item{selectedDateAppointments.length === 1 ? '' : 's'}</span>
              </div>

              {selectedDateAppointments.length > 0 ? (
                <div className="agenda-cards">
                  {selectedDateAppointments.map((appointment) => (
                    <article key={appointment.id} className={`agenda-card ${appointment.status || 'planned'}`}>
                      <div className="agenda-card-top">
                        <div>
                          <strong>{appointment.title}</strong>
                          <p>{appointment.time || 'Time not set'}</p>
                        </div>
                        <span>{appointment.status || 'planned'}</span>
                      </div>
                      <dl>
                        <div>
                          <dt>Vendor</dt>
                          <dd>{appointment.vendor || 'Not set'}</dd>
                        </div>
                        <div>
                          <dt>Location</dt>
                          <dd>{appointment.location || 'Not set'}</dd>
                        </div>
                        <div>
                          <dt>Notes</dt>
                          <dd>{appointment.note || 'No notes yet'}</dd>
                        </div>
                      </dl>
                      <div className="agenda-actions">
                        <button type="button" onClick={() => updateAppointmentStatus(appointment.id, 'planned')}>
                          Planned
                        </button>
                        <button type="button" onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}>
                          Confirmed
                        </button>
                        <button type="button" onClick={() => updateAppointmentStatus(appointment.id, 'done')}>
                          Done
                        </button>
                        <button type="button" onClick={() => removeAppointment(appointment.id)}>
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No appointment on this day. Add one manually or use AI Add.</p>
              )}

              <form className="appointment-form" onSubmit={addManualAppointment}>
                <div>
                  <p className="eyebrow">Add appointment</p>
                  <h5>{selectedDateLabel}</h5>
                </div>
                <input
                  value={appointmentDraft.title}
                  onChange={(event) => setAppointmentDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Appointment title"
                  aria-label="Appointment title"
                />
                <div className="appointment-form-row">
                  <input
                    type="date"
                    value={appointmentDraft.date}
                    onChange={(event) => {
                      setAppointmentDraft((current) => ({ ...current, date: event.target.value }));
                      setSelectedDate(event.target.value);
                      if (event.target.value) {
                        const nextDate = new Date(`${event.target.value}T00:00:00`);
                        setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
                      }
                    }}
                    aria-label="Appointment date"
                  />
                  <input
                    type="time"
                    value={appointmentDraft.time}
                    onChange={(event) => setAppointmentDraft((current) => ({ ...current, time: event.target.value }))}
                    aria-label="Appointment time"
                  />
                </div>
                <input
                  value={appointmentDraft.vendor}
                  onChange={(event) => setAppointmentDraft((current) => ({ ...current, vendor: event.target.value }))}
                  placeholder="Vendor"
                  aria-label="Appointment vendor"
                />
                <input
                  value={appointmentDraft.location}
                  onChange={(event) => setAppointmentDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Location"
                  aria-label="Appointment location"
                />
                <select
                  value={appointmentDraft.status}
                  onChange={(event) =>
                    setAppointmentDraft((current) => ({
                      ...current,
                      status: event.target.value as AppointmentDraft['status']
                    }))
                  }
                  aria-label="Appointment status"
                >
                  <option value="planned">Planned</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="done">Done</option>
                </select>
                <input
                  value={appointmentDraft.note}
                  onChange={(event) => setAppointmentDraft((current) => ({ ...current, note: event.target.value }))}
                  placeholder="Notes"
                  aria-label="Appointment notes"
                />
                <button type="submit" disabled={!appointmentDraft.title.trim() || !appointmentDraft.date}>
                  Add to selected day
                </button>
              </form>
            </aside>
          </div>

          <div className="appointment-list">
            <div className="appointment-list-header">
              <h4>This month</h4>
              <span>{selectedMonthAppointments.length} appointment{selectedMonthAppointments.length === 1 ? '' : 's'}</span>
            </div>
            <div className="tool-actions">
              <button type="button" onClick={copyAppointments} disabled={appointments.length === 0}>
                Copy
              </button>
              <button type="button" onClick={() => exportAppointments('csv')} disabled={appointments.length === 0}>
                Export CSV
              </button>
              <button type="button" onClick={() => exportAppointments('json')} disabled={appointments.length === 0}>
                Export JSON
              </button>
            </div>
            {selectedMonthAppointments.length > 0 ? (
              selectedMonthAppointments.map((appointment) => (
                <article key={appointment.id} className="appointment-item">
                  <div>
                    <strong>{appointment.title}</strong>
                    <p>
                      {appointment.date}
                      {appointment.time ? ` at ${appointment.time}` : ''}
                    </p>
                    <small>
                      {appointment.vendor ? `${appointment.vendor} · ` : ''}
                      {appointment.location || 'Location not set'} · {appointment.status || 'planned'}
                    </small>
                  </div>
                  <button type="button" onClick={() => removeAppointment(appointment.id)}>
                    Remove
                  </button>
                </article>
              ))
            ) : (
              <p className="empty-state">No appointments yet. Use AI Add, then tell the chat what to schedule.</p>
            )}
          </div>
        </div>
      ) : activeTab === 'budget' ? (
        <BudgetPanel
          budgetItems={budgetItems}
          budgetDraft={budgetDraft}
          setBudgetDraft={setBudgetDraft}
          addBudgetItem={addBudgetItem}
          updateBudgetItem={updateBudgetItem}
          removeBudgetItem={removeBudgetItem}
          exportBudgetCsv={exportBudgetCsv}
          totalPlanned={totalPlanned}
          totalActual={totalActual}
          totalPaid={totalPaid}
        />
      ) : activeTab === 'rsvp' ? (
        <RsvpPanel
          guests={guests}
          guestDraft={guestDraft}
          setGuestDraft={setGuestDraft}
          addGuest={addGuest}
          updateGuest={updateGuest}
          removeGuest={removeGuest}
          exportGuestsCsv={exportGuestsCsv}
          confirmedGuests={confirmedGuests}
          pendingGuests={pendingGuests}
          declinedGuests={declinedGuests}
        />
      ) : activeTab === 'vendors' ? (
        <VendorsPanel
          filteredVendors={filteredVendors}
          vendorStates={vendorStates}
          vendorCategories={vendorCategories}
          vendorFilter={vendorFilter}
          setVendorFilter={setVendorFilter}
          savedVendors={savedVendors}
          toggleSavedVendor={toggleSavedVendor}
          askVendorMessage={askVendorMessage}
        />
      ) : null}
        </div>
        {activeMenuTab ? (
          <aside className="planner-assistant-rail" aria-label="Menu assistant">
            <MenuAssistant
              activeMenuTab={activeMenuTab}
              messages={menuMessages[activeMenuTab]}
              input={menuInputs[activeMenuTab]}
              loading={menuLoading === activeMenuTab}
              onOpenMainChat={() => setActiveTab('chat')}
              onQuickPrompt={(prompt) => setMenuAssistantPrompt(activeMenuTab, prompt)}
              onInputChange={(value) => setMenuInputs((current) => ({ ...current, [activeMenuTab]: value }))}
              onSubmit={(event) => submitMenuAssistant(event, activeMenuTab)}
            />
          </aside>
        ) : null}
      </div>

    </section>
  );
}



