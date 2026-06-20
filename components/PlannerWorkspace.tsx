'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  budgetSuggestions,
  defaultAssistantMessage,
  defaultBudgetItems,
  defaultPlannerProfile,
  languageLabels,
  storageKeys,
  vendorDirectory
} from './planner/data';
import ChatWidget from './ChatWidget';
import { useLiveVoice, type VoiceExchange } from './planner/hooks/useLiveVoice';
import { usePlannerActions, type AmbiguousAction } from './planner/hooks/usePlannerActions';
import LiveVoiceSheet from './planner/components/LiveVoiceSheet';
import { askStream } from '../lib/chatStream';
import MenuAssistant, {
  createMenuAssistantMessages,
  createMenuInputs,
  menuAssistantPrompts,
  type MenuAssistantTab
} from './planner/MenuAssistant';
import { BudgetPanel, DashboardPanel, RsvpPanel, VendorsPanel } from './planner/WorkspacePanels';
import RiskAlerts from './planner/components/RiskAlerts';
import { detectRisks } from './planner/riskDetector';
import ChecklistTaskRow from './planner/components/ChecklistTaskRow';
import VendorMessageSheet from './planner/components/VendorMessageSheet';
import NotificationToggle from './planner/components/NotificationToggle';
import ThemeToggle from './planner/ThemeToggle';
import { buildWeeklyBriefing } from '../lib/planner/weeklyBriefing';
import { parseChatActions, stripActionBlock, type PlannerAction } from '../lib/planner/chatActions';
import { parseClarify, stripClarifyBlock } from '../lib/planner/chatClarify';
import { budgetBlueprint, contingencyPercent } from '../lib/planner/budgetGenerator';
import { collectDueReminders, fireReminders } from '../lib/notifications';
import type {
  ActiveTab,
  ActivityItem,
  Appointment,
  AppointmentDraft,
  BudgetItem,
  CalendarDay,
  ChecklistItem,
  AppLanguage,
  Guest,
  Message,
  PlannerProfile,
  Source,
  Vendor
} from './planner/types';

import ProactiveSuggestionCard from './ai/ProactiveSuggestionCard';
import MobileBottomNav, { type MobileTab } from './mobile/MobileBottomNav';
import {
  generateSuggestions as generateProactiveSuggestions,
  dismissSuggestion,
  type ProactiveSuggestion
} from '../lib/ai/proactiveSuggestions';
import Link from 'next/link';
import SetupWizardModal from './ai/SetupWizardModal';
import type { SetupCompletePayload } from './ai/SetupWizard';
import {
  generatePersonalizedChecklist,
  profileReadyForChecklist,
  type SurveyAnswers
} from '../lib/planner/checklistGenerator';
import {
  CHECKLIST_CATEGORIES,
  categorizeTask,
  getCategoryLabel,
  type ChecklistCategoryId
} from '../lib/planner/checklistCategories';
import { featureFlags } from '../lib/featureFlags';
import {
  checklistFromAnswer,
  dateKey,
  daysUntil,
  downloadTextFile,
  fallbackChecklist,
  formatChecklistText,
  getCalendarDays,
  money,
  monthLabel,
  parseAppointment,
  parseGuestList,
  parseMoneyAmount,
  parsePlannerSetup,
  parseSseEvents,
  safeJsonParse,
  sortAppointments,
  wantsAppointment,
  wantsBudgetSuggestion,
  wantsChecklist,
  wantsGuestPlanning,
  wantsPlannerSetup,
  wantsVendorMessage
} from './planner/utils';
import {
  buildAppointmentIcs,
  buildBudgetCsv,
  buildCalendarIcs,
  buildGuestsCsv,
  icsFilename,
  parseGuestsCsv
} from './planner/exporters';
import { derivePlannerContext } from './planner/plannerContext';
import { extractFacts, loadMemory, saveMemory, mergeFacts, memoryToContext, type MemoryFact } from '../lib/ai/conversationMemory';

function toSurveyAnswers(profile: PlannerProfile): SurveyAnswers {
  return {
    weddingDate: profile.majlisDate,
    venueState: profile.negeri,
    brideOriginState: profile.brideOriginState ?? '',
    groomOriginState: profile.groomOriginState ?? '',
    hasNikah: profile.hasNikah ?? true,
    hasSanding: profile.hasSanding ?? true,
    estimatedGuests: profile.estimatedGuests ?? 0
  };
}

const checklistKey = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim();

function MenuIcon({ name }: { name: 'dashboard' | 'chat' | 'checklist' | 'calendar' | 'budget' | 'guests' | 'vendors' }) {
  const common = { 'aria-hidden': true, viewBox: '0 0 24 24' } as const;

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path d="M5 5h14v10H8l-3 3V5Z" />
        </svg>
      );
    case 'checklist':
      return (
        <svg {...common}>
          <path d="m5 7 2 2 4-4M13 8h6M5 15l2 2 4-4M13 16h6" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <path d="M7 3v4M17 3v4M4 9h16M5 5h14v15H5z" />
        </svg>
      );
    case 'budget':
      return (
        <svg {...common}>
          <path d="M4 7h16v11H4zM4 10h16M8 15h4" />
        </svg>
      );
    case 'guests':
      return (
        <svg {...common}>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M16 15a5 5 0 0 1 5 5" />
        </svg>
      );
    case 'vendors':
      return (
        <svg {...common}>
          <path d="M6 10h12l-1 10H7L6 10ZM9 10a3 3 0 0 1 6 0M8 14h8" />
        </svg>
      );
    default:
      return null;
  }
}

function RobotIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4V2M8 4h8a4 4 0 0 1 4 4v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8a4 4 0 0 1 4-4Z" />
      <path d="M8 12h.01M16 12h.01M9 16h6" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 1 0 2.34-5.66L4 8.68" />
      <path d="M4 4v4.68h4.68M12 7v5l3 2" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

const profileStates = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Kuala Lumpur',
  'Labuan',
  'Putrajaya'
];

type ChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
};

export default function PlannerWorkspace() {
  const [messages, setMessages] = useState<Message[]>([defaultAssistantMessage]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState('');
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState<AppLanguage>('ms');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isContextAssistantOpen, setIsContextAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [menuMessages, setMenuMessages] = useState<Record<MenuAssistantTab, Message[]>>(() => createMenuAssistantMessages());
  const [menuInputs, setMenuInputs] = useState<Record<MenuAssistantTab, string>>(() => createMenuInputs());
  const [menuLoading, setMenuLoading] = useState<MenuAssistantTab | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [plannerProfile, setPlannerProfile] = useState<PlannerProfile>(defaultPlannerProfile);
  const [checklistTitle, setChecklistTitle] = useState('Checklist');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [setupOpen, setSetupOpen] = useState(false);
  const [checklistView, setChecklistView] = useState<'timeline' | 'next' | 'completed'>('timeline');
  // null = show all categories. Secondary filter axis layered on top of the
  // phase/month timeline; does not affect AI context or other panels.
  const [checklistCategoryFilter, setChecklistCategoryFilter] = useState<ChecklistCategoryId | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [checklistSelectMode, setChecklistSelectMode] = useState(false);
  const [selectedChecklistIds, setSelectedChecklistIds] = useState<Set<string>>(new Set());
  const [isEditingChecklistTitle, setIsEditingChecklistTitle] = useState(false);
  const [checklistTitleDraft, setChecklistTitleDraft] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [calendarView, setCalendarView] = useState<'month' | 'agenda'>('month');
  const [calendarAgendaFilter, setCalendarAgendaFilter] = useState<'upcoming' | 'all'>('upcoming');
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
  // Stage-1 RSVP self-service: the couple's own free hosted form (Google Forms /
  // Tally) link. Guests fill it; responses come back via CSV import. No backend.
  const [rsvpFormUrl, setRsvpFormUrl] = useState('');
  const [vendorFilter, setVendorFilter] = useState({ negeri: 'All', category: 'All' });
  const [googleVendors, setGoogleVendors] = useState<Vendor[]>([]);
  const [vendorSearchLoading, setVendorSearchLoading] = useState(false);
  const [vendorSearchInfo, setVendorSearchInfo] = useState('');
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
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [pendingAppointment, setPendingAppointment] = useState<Appointment | null>(null);
  const [appointmentAssistantActive, setAppointmentAssistantActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const {
    disambiguation,
    runActionsWithDisambiguation,
    applyMessageActions,
    resolveDisambiguation,
    dismissMessageActions
  } = usePlannerActions({
    language,
    applyAction: applyPlannerAction,
    resolveAmbiguity,
    setMessages,
    setStatusMessage
  });
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);
  const [vendorMessageTarget, setVendorMessageTarget] = useState<Vendor | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [conversationFacts, setConversationFacts] = useState<MemoryFact[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const activityIdRef = useRef(0);



  useEffect(() => {
    const storedMessages = safeJsonParse<Message[]>(localStorage.getItem(storageKeys.messages), [defaultAssistantMessage]);
    const storedChatSessions = safeJsonParse<ChatSession[]>(localStorage.getItem(storageKeys.chatSessions), []);
    const storedCurrentChatId = localStorage.getItem(storageKeys.currentChatId) || '';
    const storedChecklistTitle = localStorage.getItem(storageKeys.checklistTitle);
    const storedChecklistItems = safeJsonParse<ChecklistItem[]>(localStorage.getItem(storageKeys.checklistItems), []);
    const storedAppointments = safeJsonParse<Appointment[]>(localStorage.getItem(storageKeys.appointments), []);
    const storedCalendarMonth = localStorage.getItem(storageKeys.calendarMonth);
    const storedPlannerProfile = safeJsonParse<PlannerProfile>(localStorage.getItem(storageKeys.plannerProfile), defaultPlannerProfile);
    const storedBudgetItems = safeJsonParse<BudgetItem[]>(localStorage.getItem(storageKeys.budgetItems), defaultBudgetItems);
    const storedGuests = safeJsonParse<Guest[]>(localStorage.getItem(storageKeys.guests), []);
    const storedSavedVendors = safeJsonParse<string[]>(localStorage.getItem(storageKeys.savedVendors), []);
    const storedActivity = safeJsonParse<ActivityItem[]>(localStorage.getItem(storageKeys.activity), []);
    const storedLanguage = localStorage.getItem(storageKeys.language);
    const hasStoredConversation = storedMessages.some(
      (message) => message.role === 'user' || (message.role === 'assistant' && message.content !== defaultAssistantMessage.content)
    );
    const restoredSessions = hasStoredConversation && storedCurrentChatId && !storedChatSessions.some((session) => session.id === storedCurrentChatId)
      ? [{
          id: storedCurrentChatId,
          title: storedMessages.find((message) => message.role === 'user')?.content.slice(0, 48) || 'Previous chat',
          updatedAt: new Date().toISOString(),
          messages: storedMessages
        }, ...storedChatSessions]
      : storedChatSessions;

    setMessages([defaultAssistantMessage]);
    setChatSessions(restoredSessions);
    setCurrentChatId(`chat-${Date.now()}`);
    if (storedLanguage === 'ms' || storedLanguage === 'en') setLanguage(storedLanguage);
    setActiveTab('chat');
    setPlannerProfile({ ...defaultPlannerProfile, ...storedPlannerProfile, weddingStyle: storedPlannerProfile.weddingStyle || '', keyContact: storedPlannerProfile.keyContact || '' });
    if (storedChecklistTitle) {
      setChecklistTitle(storedChecklistTitle.replace(/Checklist Perkahwinan/g, 'Checklist MajlisMate').replace(/Wedding Checklist/g, 'Wedding checklist'));
    }
    setChecklistItems(storedChecklistItems.map((item) => ({ ...item, status: item.status || (item.completed ? 'done' : 'not-started'), category: item.category || categorizeTask(item.text) })));
    setAppointments(storedAppointments);
    setBudgetItems(storedBudgetItems.length > 0 ? storedBudgetItems : defaultBudgetItems);
    setGuests(storedGuests);
    setSavedVendors(storedSavedVendors);
    setRsvpFormUrl(localStorage.getItem(storageKeys.rsvpFormUrl) || '');
    const seenActivityIds = new Set<string>();
    setActivity(storedActivity.map((item, index) => {
      const baseId = item.id || `activity-restored-${index}`;
      const id = seenActivityIds.has(baseId) ? `${baseId}-${index}` : baseId;
      seenActivityIds.add(id);
      return { ...item, id };
    }));
    if (storedCalendarMonth) {
      const storedMonth = new Date(storedCalendarMonth);
      setCalendarMonth(storedMonth);
      setSelectedDate(dateKey(storedMonth));
    }
    setIsOffline(!navigator.onLine);
    setConversationFacts(loadMemory());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.messages, JSON.stringify(messages));
    const hasConversation = messages.some(
      (message) => message.role === 'user' || (message.role === 'assistant' && message.content !== defaultAssistantMessage.content)
    );

    if (!hasConversation) return;

    const sessionId = currentChatId || `chat-${Date.now()}`;
    if (!currentChatId) {
      setCurrentChatId(sessionId);
    }
    const firstUserMessage = messages.find((message) => message.role === 'user')?.content.trim();
    const fallbackTitle = messages.find((message) => message.content && message.content !== defaultAssistantMessage.content)?.content.trim();
    const titleSource = firstUserMessage || fallbackTitle || 'Wedding planning chat';
    const sessionTitle = titleSource.length > 56 ? `${titleSource.slice(0, 53)}...` : titleSource;
    const nextSession: ChatSession = {
      id: sessionId,
      title: sessionTitle,
      updatedAt: new Date().toISOString(),
      messages
    };

    setChatSessions((current) => {
      const withoutCurrent = current.filter((session) => session.id !== sessionId);
      return [nextSession, ...withoutCurrent].slice(0, 20);
    });
  }, [currentChatId, isHydrated, messages]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.chatSessions, JSON.stringify(chatSessions));
  }, [chatSessions, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.currentChatId, currentChatId);
  }, [currentChatId, isHydrated]);

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
    setNotificationsEnabled(localStorage.getItem('mm-notifications-enabled') === '1');
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('mm-notifications-enabled', notificationsEnabled ? '1' : '0');
  }, [notificationsEnabled, isHydrated]);

  // Proactive reminders: fire due task / appointment notifications while enabled.
  // fireReminders de-dupes by tag, so re-running on data changes is safe.
  useEffect(() => {
    if (!notificationsEnabled) return;
    const run = () => fireReminders(collectDueReminders(checklistItems, appointments, language));
    run();
    const id = window.setInterval(run, 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [notificationsEnabled, checklistItems, appointments, language]);

  // Live Google Maps vendor results are tied to the active filter — clear them
  // when the filter changes so stale results are not shown.
  useEffect(() => {
    setGoogleVendors([]);
    setVendorSearchInfo('');
  }, [vendorFilter.category, vendorFilter.negeri]);

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
    localStorage.setItem(storageKeys.rsvpFormUrl, rsvpFormUrl);
  }, [rsvpFormUrl, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.savedVendors, JSON.stringify(savedVendors));
  }, [isHydrated, savedVendors]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.activity, JSON.stringify(activity));
  }, [activity, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(storageKeys.language, language);
  }, [isHydrated, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandOpen(true);
      }
      if (!isTyping && event.key === '/') {
        event.preventDefault();
        setIsCommandOpen(true);
      }
      if (event.key === 'Escape') {
        setIsCommandOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!statusMessage) return;

    const timeout = window.setTimeout(() => setStatusMessage(''), 2600);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function addActivity(text: string) {
    activityIdRef.current += 1;
    setActivity((current) => [
      { id: `activity-${Date.now()}-${activityIdRef.current}`, text, time: new Date().toISOString() },
      ...current
    ].slice(0, 8));
  }

  function completeOnboarding(event: FormEvent) {
    event.preventDefault();
    const coupleName =
      plannerProfile.coupleName.trim() ||
      [plannerProfile.groomName.trim(), plannerProfile.brideName.trim()].filter(Boolean).join(' & ');
    const completedProfile = { ...plannerProfile, coupleName, completed: true };
    setPlannerProfile(completedProfile);
    if (checklistItems.length === 0) {
      // Seed from the personalized generator when the profile has enough info;
      // otherwise leave empty so the setup wizard prompts for the rest.
      const answers = toSurveyAnswers(completedProfile);
      if (profileReadyForChecklist(answers).ready) {
        setChecklistTitle(language === 'ms' ? 'Checklist Majlis Saya' : 'My Wedding Checklist');
        setChecklistItems(
          generatePersonalizedChecklist(answers).items.map((item) => ({ ...item, status: 'not-started' as const }))
        );
      }
    }
    if (budgetItems.every((item) => item.planned === 0 && item.actual === 0 && item.paid === 0)) {
      const starterBudget = completedProfile.totalBudget > 0 ? Math.round(completedProfile.totalBudget / defaultBudgetItems.length) : 0;
      setBudgetItems(defaultBudgetItems.map((item) => ({ ...item, planned: starterBudget })));
    }
    addActivity('Onboarding completed and planner workspace prepared.');
    setStatusMessage('Planner setup saved.');
  }

  // Opens the setup wizard, which generates a personalized checklist from the
  // couple's date, states, format, and guest count.
  function createDefaultChecklist() {
    setActiveTab('checklist');
    setSetupOpen(true);
  }

  function handleSetupComplete({ items, title, budgetItems: setupBudgetItems, profileUpdate }: SetupCompletePayload) {
    setChecklistItems(items.map((item) => ({ ...item, status: item.status || (item.completed ? 'done' : 'not-started'), category: item.category || categorizeTask(item.text) })));
    setChecklistTitle(title);
    if (setupBudgetItems && setupBudgetItems.length > 0) {
      setBudgetItems(setupBudgetItems);
    }
    setPlannerProfile((current) => ({ ...current, ...profileUpdate, completed: true }));
    setActiveTab('dashboard');
    setSetupOpen(false);
    addActivity('Personalized planner generated from setup wizard.');
    setStatusMessage(language === 'ms' ? 'Planner peribadi dijana.' : 'Personalized planner generated.');
  }

  function addRecommendedItem(item: ChecklistItem) {
    setChecklistItems((current) => {
      const have = new Set(current.map((existing) => checklistKey(existing.text)));
      if (have.has(checklistKey(item.text))) return current;
      return [
        ...current,
        {
          ...item,
          id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          completed: false,
          status: 'not-started' as const,
          category: item.category || categorizeTask(item.text)
        }
      ];
    });
    setStatusMessage(language === 'ms' ? 'Cadangan ditambah ke checklist.' : 'Suggestion added to checklist.');
  }

  function applyPlannerSetupFromText(text: string) {
    const setupPatch = parsePlannerSetup(text, profileStates);
    const hasSetupPatch = Object.keys(setupPatch).length > 0;
    if (!hasSetupPatch) return false;

    setPlannerProfile((current) => {
      const nextProfile = {
        ...current,
        ...setupPatch
      };
      const derivedCoupleName =
        nextProfile.coupleName.trim() ||
        [nextProfile.groomName.trim(), nextProfile.brideName.trim()].filter(Boolean).join(' & ');
      return {
        ...nextProfile,
        coupleName: derivedCoupleName,
        completed: Boolean(derivedCoupleName || nextProfile.majlisDate || nextProfile.totalBudget || nextProfile.guestTarget)
      };
    });

    if (setupPatch.majlisDate) {
      setCalendarMonth(new Date(`${setupPatch.majlisDate}T00:00:00`));
      setSelectedDate(setupPatch.majlisDate);
      if (checklistItems.length === 0) {
        const answers = toSurveyAnswers({ ...plannerProfile, ...setupPatch } as PlannerProfile);
        if (profileReadyForChecklist(answers).ready) {
          setChecklistTitle(language === 'ms' ? 'Checklist Majlis Saya' : 'My Wedding Checklist');
          setChecklistItems(
            generatePersonalizedChecklist(answers).items.map((item) => ({ ...item, status: 'not-started' as const }))
          );
        }
      }
    }

    addActivity('AI updated wedding setup details.');
    setStatusMessage(language === 'ms' ? 'Maklumat majlis dikemaskini.' : 'Wedding setup updated.');
    return true;
  }

  function applySmartBudgetSuggestion(total?: number) {
    const base = Math.max(total || plannerProfile.totalBudget || totalPlanned || totalActual || 30000, 10000);
    // Guest-aware blueprint shared with the setup wizard (single source of truth).
    const guests = plannerProfile.guestTarget || 0;
    const blueprint = budgetBlueprint(guests);
    const contingency = contingencyPercent(guests);

    setPlannerProfile((current) => ({ ...current, totalBudget: base }));
    setBudgetItems((current) => {
      const next = [...current];
      const ensure = (match: RegExp, label: string, planned: number) => {
        const index = next.findIndex((item) => match.test(item.category));
        if (index >= 0) {
          next[index] = { ...next[index], planned };
        } else {
          next.push({
            id: `budget-auto-${label.replace(/\W+/g, '')}-${Date.now()}`,
            category: label,
            planned,
            actual: 0,
            paid: 0,
            status: 'not-started',
            note: ''
          });
        }
      };
      blueprint.forEach((item) => ensure(item.match, item.label, Math.round(base * item.percent)));
      ensure(/conting|kecemasan|buffer/i, 'Contingency', Math.round(base * contingency));
      return next;
    });
    setActiveTab('budget');
    addActivity(`AI suggested a full budget allocation from ${money(base)}.`);
    setStatusMessage(language === 'ms' ? 'Cadangan bajet penuh dimasukkan.' : 'Full budget suggestion applied.');
  }

  function applyGuestPlanningFromText(text: string) {
    const parsedGuests = parseGuestList(text);
    if (parsedGuests.length === 0) {
      setActiveTab('rsvp');
      setIsContextAssistantOpen(true);
      setMenuInputs((current) => ({ ...current, rsvp: text }));
      return false;
    }

    setGuests((current) => [...current, ...parsedGuests]);
    setActiveTab('rsvp');
    addActivity(`AI added ${parsedGuests.length} guest${parsedGuests.length === 1 ? '' : 's'}.`);
    setStatusMessage(language === 'ms' ? 'Tetamu ditambah.' : 'Guest list updated.');
    return true;
  }

  function applyDetectedBudgetUpdate(text: string) {
    const amount = parseMoneyAmount(text);
    if (!amount) return false;

    const lowerText = text.toLowerCase();
    const matchedVendor = vendorDirectory.find((vendor) => lowerText.includes(vendor.name.toLowerCase()));
    const matchedItem = budgetItems.find((item) => {
      const category = item.category.toLowerCase();
      const vendorCategory = matchedVendor?.category.toLowerCase();
      return lowerText.includes(category) ||
        Boolean(vendorCategory && (category.includes(vendorCategory) || vendorCategory.includes(category))) ||
        Boolean(matchedVendor && item.note.toLowerCase().includes(matchedVendor.name.toLowerCase()));
    });

    if (!matchedItem) return false;

    const isPaidUpdate = /\b(paid|pay|bayar|deposit|settle|transfer|duit muka)\b/i.test(text);
    const isActualUpdate = /\b(actual|cost|harga|quote|quotation|sebut harga|kos)\b/i.test(text);
    const isPlannedUpdate = /\b(planned|plan|budget|bajet|estimate|anggaran)\b/i.test(text);
    if (!isPaidUpdate && !isActualUpdate && !isPlannedUpdate) return false;

    const note = [matchedItem.note, text].filter(Boolean).join(' | ');
    const patch: Partial<BudgetItem> = { note, status: 'in-progress' };
    if (isPaidUpdate) {
      patch.paid = Math.max(0, matchedItem.paid + amount);
      if (matchedItem.actual === 0) patch.actual = Math.max(matchedItem.actual, matchedItem.paid + amount);
    } else if (isActualUpdate) {
      patch.actual = amount;
    } else if (isPlannedUpdate) {
      patch.planned = amount;
    }

    setBudgetItems((current) => current.map((item) => (item.id === matchedItem.id ? { ...item, ...patch } : item)));
    addActivity(`AI detected budget update: ${matchedItem.category}.`);
    setStatusMessage(language === 'ms' ? `${matchedItem.category} dikemaskini.` : `${matchedItem.category} updated.`);
    return true;
  }

  function startFreshChat(options?: { silent?: boolean }) {
    setMessages([defaultAssistantMessage]);
    setInput('');
    setCurrentChatId(`chat-${Date.now()}`);
    setActiveTab('chat');
    setIsChatHistoryOpen(false);
    if (!options?.silent) {
      setStatusMessage(language === 'ms' ? 'Chat baru dibuka.' : 'New chat started.');
    }
  }

  function openChatSession(session: ChatSession) {
    setMessages(session.messages.length > 0 ? session.messages : [defaultAssistantMessage]);
    setCurrentChatId(session.id);
    setInput('');
    setActiveTab('chat');
    setIsChatHistoryOpen(false);
  }

  function deleteChatSession(sessionId: string) {
    setChatSessions((current) => current.filter((session) => session.id !== sessionId));
    if (currentChatId === sessionId) {
      setMessages([defaultAssistantMessage]);
      setCurrentChatId(`chat-${Date.now()}`);
    }
    setStatusMessage(language === 'ms' ? 'Chat history dibuang.' : 'Chat history removed.');
  }

  function buildPlannerContext() {
    const plannerCtx = derivePlannerContext({
      profile: plannerProfile,
      checklistItems,
      budgetItems,
      guests,
      savedVendors,
      appointments,
      completedCount
    });
    const memoryCtx = memoryToContext(conversationFacts, language);
    if (memoryCtx) {
      return {
        ...plannerCtx,
        memoryContext: memoryCtx
      };
    }
    return plannerCtx;
  }

  function updateConversationMemory(userMessage: string) {
    const newFacts = extractFacts([{ role: 'user', content: userMessage }]);
    if (newFacts.length > 0) {
      const merged = mergeFacts(conversationFacts, newFacts);
      setConversationFacts(merged);
      saveMemory(merged);
    }
  }

  async function ask(question: string, targetTab?: MenuAssistantTab, opts?: { suppressTabSwitch?: boolean }): Promise<string | null> {
    const trimmed = question.trim();
    if (!trimmed || loading || menuLoading) return null;

    const isMenuAssistant = Boolean(targetTab);
    const currentMessages = targetTab ? menuMessages[targetTab] : messages;
    const nextMessages: Message[] = [...currentMessages, { role: 'user', content: trimmed }];
    const assistantIndex = nextMessages.length;
    const shouldCreateChecklist = wantsChecklist(trimmed);
    const shouldCreateAppointment = appointmentAssistantActive || wantsAppointment(trimmed);
    const shouldDraftVendorMessage = wantsVendorMessage(trimmed);
    const shouldApplySetup = wantsPlannerSetup(trimmed);
    const shouldApplyBudgetSuggestion = wantsBudgetSuggestion(trimmed);
    const shouldApplyGuestPlanning = wantsGuestPlanning(trimmed);
    const didApplyBudgetUpdate = applyDetectedBudgetUpdate(trimmed);

    updateConversationMemory(trimmed);

    if (shouldCreateChecklist) {
      if (!opts?.suppressTabSwitch) setActiveTab('checklist');
      setChecklistTitle(language === 'ms' ? 'Checklist Perkahwinan' : 'Wedding Checklist');
      setChecklistItems([]);
    }

    if (shouldCreateAppointment) {
      setAppointmentAssistantActive(false);
    }

    if (shouldDraftVendorMessage && !isMenuAssistant) {
      setActiveTab('chat');
    }

    if (shouldApplySetup) {
      applyPlannerSetupFromText(trimmed);
    }

    if (shouldApplyBudgetSuggestion && !didApplyBudgetUpdate) {
      applySmartBudgetSuggestion(parseMoneyAmount(trimmed) || undefined);
    }

    if (shouldApplyGuestPlanning) {
      applyGuestPlanningFromText(trimmed);
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
          language,
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
            const displayContent = stripClarifyBlock(stripActionBlock(fullAnswer));
            if (targetTab) {
              setMenuMessages((current) => ({
                ...current,
                [targetTab]: current[targetTab].map((message, index) =>
                  index === assistantIndex ? { ...message, content: displayContent, sources: currentSources } : message
                )
              }));
            } else {
              // Preview actions/clarify the moment their block finishes streaming.
              // parseChatActions/parseClarify return [] until the block is complete,
              // so this safely no-ops mid-stream and pops in once parseable.
              const previewActions = parseChatActions(fullAnswer);
              const previewClarify = parseClarify(fullAnswer);
              setMessages((current) =>
                current.map((message, index) =>
                  index === assistantIndex
                    ? {
                        ...message,
                        content: displayContent,
                        sources: currentSources,
                        actions: previewActions.length > 0 ? previewActions : undefined,
                        actionsState: previewActions.length > 0 ? (message.actionsState ?? 'pending') : undefined,
                        clarify: previewClarify.length > 0 ? previewClarify : undefined
                      }
                    : message
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
        const emptyMessage = copy.noAnswer;
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

      const finalAnswer = fullAnswer.trim() || copy.noAnswer;
      const parsedActions = parseChatActions(fullAnswer);
      const parsedClarify = parseClarify(fullAnswer);
      const displayAnswer = stripClarifyBlock(stripActionBlock(finalAnswer)).trim() || copy.noAnswer;

      if (targetTab) {
        setMenuMessages((current) => ({
          ...current,
          [targetTab]: current[targetTab].map((message, index) =>
            index === assistantIndex ? { ...message, content: displayAnswer } : message
          )
        }));
      } else {
        setMessages((current) =>
          current.map((message, index) =>
            index === assistantIndex
              ? {
                  ...message,
                  content: displayAnswer,
                  actions: parsedActions.length > 0 ? parsedActions : undefined,
                  actionsState: parsedActions.length > 0 ? 'pending' : undefined,
                  clarify: parsedClarify.length > 0 ? parsedClarify : undefined
                }
              : message
          )
        );
      }

      if (shouldCreateChecklist) {
        const generatedItems = checklistFromAnswer(fullAnswer);
        setChecklistItems((generatedItems.length > 0 ? generatedItems : fallbackChecklist(trimmed)).map((item) => ({ ...item, status: 'not-started' })));
        addActivity('AI generated a checklist.');
      }

      if (shouldCreateAppointment) {
        const appointment = parseAppointment(trimmed);
        if (appointment) {
          setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
          setSelectedDate(appointment.date);
          setPendingAppointment(appointment);
          if (!opts?.suppressTabSwitch) setActiveTab('calendar');
          addActivity(`Appointment drafted: ${appointment.title}.`);
        }
      }
      if (shouldDraftVendorMessage) {
        addActivity('AI drafted a vendor message.');
      }
      return finalAnswer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      const friendlyMessage = /fetch|network|failed to get response|no response body/i.test(message)
        ? copy.networkFallback
        : `${copy.errorPrefix}: ${message}`;
      if (targetTab) {
        setMenuMessages((current) => ({
          ...current,
          [targetTab]: [...nextMessages, { role: 'assistant', content: friendlyMessage }]
        }));
      } else {
        setMessages([...nextMessages, { role: 'assistant', content: friendlyMessage }]);
      }
      if (shouldCreateChecklist) {
        setChecklistItems(fallbackChecklist(trimmed).map((item) => ({ ...item, status: 'not-started' })));
        addActivity('Fallback checklist generated.');
      }
      if (shouldCreateAppointment) {
        const appointment = parseAppointment(trimmed);
        if (appointment) {
          setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
          setSelectedDate(appointment.date);
          setPendingAppointment(appointment);
          if (!opts?.suppressTabSwitch) setActiveTab('calendar');
          addActivity(`Appointment drafted: ${appointment.title}.`);
        }
      }
      return friendlyMessage;
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

  function repairChecklistScroll(mode: 'clamp' | 'focus-list' = 'clamp') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        const checklistPanel = document.querySelector<HTMLElement>('.planner-content > .checklist-panel');
        if (!checklistPanel) return;

        if (mode === 'focus-list') {
          const checklistList = checklistPanel.querySelector<HTMLElement>('.checklist-main-list');
          const targetTop = checklistList
            ? checklistList.offsetTop - 18
            : 0;

          checklistPanel.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'auto'
          });
          return;
        }

        const maxScrollTop = Math.max(0, checklistPanel.scrollHeight - checklistPanel.clientHeight);
        if (checklistPanel.scrollTop > maxScrollTop) {
          checklistPanel.scrollTop = maxScrollTop;
        }
      });
    });
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
      {
        id: `${Date.now()}-${current.length}`,
        text,
        textMs: language === 'ms' ? text : undefined,
        textEn: language === 'en' ? text : undefined,
        completed: false,
        status: 'not-started',
        category: categorizeTask(text),
        phase: copy.custom
      }
    ]);
    setNewChecklistItem('');
    addActivity('Checklist item added.');
  }

  function updateChecklistStatus(id: string, status: NonNullable<ChecklistItem['status']>) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status, completed: status === 'done' } : item))
    );
    // Keep scroll stable when the list reorders after a status change (the
    // tap-cycle tick routes through here, so it inherits this behavior).
    repairChecklistScroll('clamp');
    addActivity('Checklist status updated.');
  }

  function updateChecklistItemText(id: string, text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setChecklistItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              text: trimmed,
              textMs: language === 'ms' ? trimmed : item.textMs,
              textEn: language === 'en' ? trimmed : item.textEn,
              category: item.category || categorizeTask(trimmed)
            }
          : item
      )
    );
  }

  function updateChecklistDeadline(id: string, deadline: string) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === id ? { ...item, deadline: deadline || undefined } : item))
    );
  }

  function updateChecklistNote(id: string, note: string) {
    setChecklistItems((current) =>
      current.map((item) => (item.id === id ? { ...item, note } : item))
    );
  }

  function toggleChecklistSelect(id: string) {
    setSelectedChecklistIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function bulkMarkChecklistDone() {
    setChecklistItems((current) =>
      current.map((item) =>
        selectedChecklistIds.has(item.id) ? { ...item, completed: true, status: 'done' } : item
      )
    );
    setSelectedChecklistIds(new Set());
    setChecklistSelectMode(false);
    addActivity(`${selectedChecklistIds.size} checklist items marked done.`);
  }

  function bulkRemoveChecklist() {
    const count = selectedChecklistIds.size;
    setChecklistItems((current) => current.filter((item) => !selectedChecklistIds.has(item.id)));
    setSelectedChecklistIds(new Set());
    setChecklistSelectMode(false);
    addActivity(`${count} checklist items removed.`);
  }

  function startAppointmentAssistant() {
    setAppointmentAssistantActive(true);
    setIsContextAssistantOpen(true);
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
    if (editingAppointmentId === id) {
      setEditingAppointmentId(null);
      setAppointmentDraft({
        title: '',
        date: selectedDate,
        time: '',
        location: '',
        vendor: '',
        status: 'planned',
        note: ''
      });
    }
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

  function confirmPendingAppointment() {
    if (!pendingAppointment) return;

    setAppointments((current) => [...current, pendingAppointment]);
    setCalendarMonth(new Date(`${pendingAppointment.date}T00:00:00`));
    setSelectedDate(pendingAppointment.date);
    addActivity(`Appointment confirmed: ${pendingAppointment.title}.`);
    setStatusMessage('Appointment added to calendar.');
    setPendingAppointment(null);
  }

  function editPendingAppointment() {
    if (!pendingAppointment) return;

    setAppointmentDraft({
      title: pendingAppointment.title,
      date: pendingAppointment.date,
      time: pendingAppointment.time || '',
      location: pendingAppointment.location || '',
      vendor: pendingAppointment.vendor || '',
      status: pendingAppointment.status || 'planned',
      note: pendingAppointment.note
    });
    setSelectedDate(pendingAppointment.date);
    setPendingAppointment(null);
  }

  function startEditingAppointment(appointment: Appointment) {
    setEditingAppointmentId(appointment.id);
    setAppointmentDraft({
      title: appointment.title,
      date: appointment.date,
      time: appointment.time || '',
      location: appointment.location || '',
      vendor: appointment.vendor || '',
      status: appointment.status || 'planned',
      note: appointment.note
    });
    setSelectedDate(appointment.date);
  }

  function cancelEditingAppointment() {
    setEditingAppointmentId(null);
    setAppointmentDraft({
      title: '',
      date: selectedDate,
      time: '',
      location: '',
      vendor: '',
      status: 'planned',
      note: ''
    });
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

  function addSuggestedBudgetItem(item: BudgetItem) {
    const category = item.category.trim();
    if (!category) return;

    setBudgetItems((current) => {
      if (current.some((budgetItem) => budgetItem.category.trim().toLowerCase() === category.toLowerCase())) {
        return current;
      }

      return [
        ...current,
        {
          ...item,
          id: `suggested-${Date.now()}`,
          category,
          actual: 0,
          paid: 0,
          status: 'not-started'
        }
      ];
    });
    addActivity(`Budget suggestion added: ${category}.`);
    setStatusMessage(`Budget suggestion added: ${category}.`);
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

  function applyPlannerAction(action: PlannerAction, salt = 0, targetId?: string) {
    const newId = `act-${Date.now()}-${salt}`;
    switch (action.type) {
      case 'add_checklist_item': {
        const incomingKey = checklistKey(action.text);
        const matchesIncoming = (item: ChecklistItem) =>
          checklistKey(item.text) === incomingKey || checklistKey(getItemText(item)) === incomingKey;
        const alreadyOnList = checklistItems.some(matchesIncoming);
        setChecklistItems((current) => {
          // Skip if an item with the same (normalized) text already exists, so
          // re-asking or re-tapping never creates a duplicate task.
          if (current.some(matchesIncoming)) return current;
          return [
            ...current,
            {
              id: `${newId}-${current.length}`,
              text: action.text,
              textMs: language === 'ms' ? action.text : undefined,
              textEn: language === 'en' ? action.text : undefined,
              completed: false,
              status: 'not-started',
              category: categorizeTask(action.text),
              phase: action.phase || copy.custom,
              deadline: action.deadline
            }
          ];
        });
        addActivity(
          alreadyOnList
            ? `AI action: checklist item already on list (${action.text}).`
            : `AI action: checklist item added (${action.text}).`
        );
        break;
      }
      case 'add_budget_item': {
        setBudgetItems((current) => {
          if (current.some((item) => item.category.trim().toLowerCase() === action.category.trim().toLowerCase())) {
            return current;
          }
          return [
            ...current,
            {
              id: newId,
              category: action.category,
              planned: action.planned || 0,
              actual: 0,
              paid: 0,
              status: 'not-started',
              note: action.note || ''
            }
          ];
        });
        addActivity(`AI action: budget item added (${action.category}).`);
        break;
      }
      case 'add_appointment': {
        setAppointments((current) => [
          ...current,
          {
            id: newId,
            title: action.title,
            date: action.date,
            time: action.time || '',
            location: action.location || '',
            vendor: action.vendor || '',
            status: 'planned',
            note: ''
          }
        ]);
        addActivity(`AI action: appointment added (${action.title}).`);
        break;
      }
      case 'add_guest': {
        setGuests((current) => [
          ...current,
          {
            id: newId,
            name: action.name,
            phone: action.phone || '',
            group: action.group || 'Kawan-kawan',
            pax: action.pax || 1,
            status: 'pending'
          }
        ]);
        addActivity(`AI action: guest added (${action.name}).`);
        break;
      }
      case 'update_budget': {
        const needle = action.category.trim().toLowerCase();
        setBudgetItems((current) => {
          const match = targetId
            ? current.find((item) => item.id === targetId)
            : current.find((item) => item.category.trim().toLowerCase() === needle) ||
              current.find((item) => item.category.trim().toLowerCase().includes(needle) || needle.includes(item.category.trim().toLowerCase()));
          if (!match) {
            // No existing category — create it so the update is not lost.
            return [
              ...current,
              {
                id: newId,
                category: action.category,
                planned: action.planned || 0,
                actual: action.actual || 0,
                paid: action.paid || 0,
                status: action.paid ? 'in-progress' : 'not-started',
                note: ''
              }
            ];
          }
          return current.map((item) =>
            item.id === match.id
              ? {
                  ...item,
                  planned: action.planned !== undefined ? action.planned : item.planned,
                  actual: action.actual !== undefined ? action.actual : item.actual,
                  paid: action.paid !== undefined ? action.paid : item.paid,
                  status: action.paid !== undefined && action.paid > 0 ? 'in-progress' : item.status
                }
              : item
          );
        });
        addActivity(`AI action: budget updated (${action.category}).`);
        break;
      }
      case 'complete_task': {
        const needle = action.text.trim().toLowerCase();
        setChecklistItems((current) =>
          current.map((item) => {
            if (targetId) return item.id === targetId ? { ...item, completed: true, status: 'done' } : item;
            const text = getItemText(item).trim().toLowerCase();
            const matches = text === needle || text.includes(needle) || needle.includes(text);
            return matches ? { ...item, completed: true, status: 'done' } : item;
          })
        );
        addActivity(`AI action: task completed (${action.text}).`);
        break;
      }
      case 'update_appointment': {
        const needle = action.title.trim().toLowerCase();
        setAppointments((current) =>
          current.map((appointment) => {
            const title = appointment.title.trim().toLowerCase();
            const matches = targetId
              ? appointment.id === targetId
              : title === needle || title.includes(needle) || needle.includes(title);
            if (!matches) return appointment;
            return {
              ...appointment,
              date: action.date || appointment.date,
              time: action.time || appointment.time,
              status: action.status || appointment.status
            };
          })
        );
        addActivity(`AI action: appointment updated (${action.title}).`);
        break;
      }
      case 'set_profile': {
        setPlannerProfile((current) => ({
          ...current,
          majlisDate: action.majlisDate || current.majlisDate,
          negeri: action.negeri || current.negeri,
          totalBudget: action.totalBudget !== undefined ? action.totalBudget : current.totalBudget,
          guestTarget: action.guestTarget !== undefined ? action.guestTarget : current.guestTarget
        }));
        addActivity('AI action: wedding profile updated.');
        break;
      }
    }
  }

  // For update/complete actions the AI references an item by text. If that text
  // matches more than one existing item, we must not guess — return the
  // candidates so the user can pick. An exact match always wins (treated as
  // unambiguous). Returns null when 0 or 1 item matches.
  function resolveAmbiguity(action: PlannerAction): AmbiguousAction | null {
    const isMs = language === 'ms';
    if (action.type === 'complete_task') {
      const needle = action.text.trim().toLowerCase();
      const open = checklistItems.filter((item) => !(item.completed || item.status === 'done'));
      const exact = open.filter((item) => getItemText(item).trim().toLowerCase() === needle);
      if (exact.length === 1) return null;
      const matches = (exact.length > 1 ? exact : open).filter((item) => {
        const text = getItemText(item).trim().toLowerCase();
        return text === needle || text.includes(needle) || needle.includes(text);
      });
      if (matches.length <= 1) return null;
      return {
        action,
        question: isMs ? 'Task yang mana satu?' : 'Which task do you mean?',
        candidates: matches.map((item) => ({ id: item.id, label: getItemText(item), sublabel: getItemPhase(item) }))
      };
    }
    if (action.type === 'update_budget') {
      const needle = action.category.trim().toLowerCase();
      const exact = budgetItems.filter((item) => item.category.trim().toLowerCase() === needle);
      if (exact.length === 1) return null;
      const matches = (exact.length > 1 ? exact : budgetItems).filter((item) => {
        const cat = item.category.trim().toLowerCase();
        return cat === needle || cat.includes(needle) || needle.includes(cat);
      });
      if (matches.length <= 1) return null;
      return {
        action,
        question: isMs ? 'Kategori bajet yang mana?' : 'Which budget category?',
        candidates: matches.map((item) => ({ id: item.id, label: item.category, sublabel: `RM${item.planned || 0}` }))
      };
    }
    if (action.type === 'update_appointment') {
      const needle = action.title.trim().toLowerCase();
      const exact = appointments.filter((item) => item.title.trim().toLowerCase() === needle);
      if (exact.length === 1) return null;
      const matches = (exact.length > 1 ? exact : appointments).filter((item) => {
        const title = item.title.trim().toLowerCase();
        return title === needle || title.includes(needle) || needle.includes(title);
      });
      if (matches.length <= 1) return null;
      return {
        action,
        question: isMs ? 'Appointment yang mana?' : 'Which appointment?',
        candidates: matches.map((item) => ({ id: item.id, label: item.title, sublabel: item.date }))
      };
    }
    return null;
  }

  // The disambiguation lifecycle (runActionsWithDisambiguation, applyMessageActions,
  // resolveDisambiguation, dismissMessageActions) lives in usePlannerActions above.

  // User tapped a clarify quick-reply chip: collapse the chips and send the
  // chosen answer as the next message so the AI can now act on it.
  function answerClarify(messageIndex: number, reply: string) {
    if (loading) return;
    setMessages((current) =>
      current.map((message, index) => (index === messageIndex ? { ...message, clarifyAnswered: true } : message))
    );
    ask(reply);
  }

  function toggleSavedVendor(id: string) {
    setSavedVendors((current) => {
      const isSaved = current.includes(id);
      return isSaved ? current.filter((vendorId) => vendorId !== id) : [...current, id];
    });
    addActivity('Saved vendor list updated.');
  }

  function askVendorMessage(vendor: Vendor) {
    setVendorMessageTarget(vendor);
  }

  function askVendorQuestions(vendor: Vendor) {
    setActiveTab('chat');
    setInput(`Create a short checklist of questions to ask ${vendor.name} before booking. Focus on package inclusions, hidden charges, deposit, cancellation, setup timing, and final confirmation.`);
  }

  async function searchNearbyVendors() {
    const category = vendorFilter.category !== 'All' ? vendorFilter.category : 'wedding vendor';
    const negeri = vendorFilter.negeri !== 'All' ? vendorFilter.negeri : (plannerProfile.negeri || '');
    setVendorSearchLoading(true);
    setVendorSearchInfo('');
    try {
      const response = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, negeri })
      });
      const data = await response.json();
      const vendors: Vendor[] = Array.isArray(data?.vendors) ? data.vendors : [];
      setGoogleVendors(vendors);
      if (data?.fallback) {
        setVendorSearchInfo(
          language === 'ms'
            ? 'Carian Google Maps belum disambung (perlu API key). Memaparkan senarai tempatan.'
            : 'Google Maps search is not connected (API key needed). Showing the built-in directory.'
        );
      } else if (vendors.length === 0) {
        setVendorSearchInfo(
          language === 'ms' ? 'Tiada vendor dijumpai. Cuba kategori atau negeri lain.' : 'No vendors found. Try another category or state.'
        );
      } else {
        setVendorSearchInfo(
          language === 'ms'
            ? `${vendors.length} vendor sebenar dijumpai dari Google Maps.`
            : `${vendors.length} live vendors found from Google Maps.`
        );
        addActivity(`Fetched ${vendors.length} vendors from Google Maps (${category}).`);
      }
    } catch {
      setVendorSearchInfo(
        language === 'ms' ? 'Carian gagal. Cuba lagi sebentar.' : 'Search failed. Please try again.'
      );
    } finally {
      setVendorSearchLoading(false);
    }
  }

  function askVendorComparison(vendors: Vendor[]) {
    const vendorSummary = vendors
      .map((vendor) => `${vendor.name}: ${vendor.category}, ${vendor.negeri}, ${money(vendor.minPrice)}-${money(vendor.maxPrice)}, rating ${vendor.rating.toFixed(1)}, note: ${vendor.note}`)
      .join('\n');
    setActiveTab('chat');
    ask(`Compare these wedding vendors and recommend the safest next step. Keep it concise with best value, risk, questions to ask, and next action.\n${vendorSummary}`);
  }

  function addVendorToBudget(vendor: Vendor) {
    const planned = Math.round((vendor.minPrice + vendor.maxPrice) / 2);
    const existingVendorItem = budgetItems.find((item) => item.note.includes(vendor.name) || item.category === vendor.category);

    if (existingVendorItem) {
      setBudgetItems((current) =>
        current.map((item) =>
          item.id === existingVendorItem.id
            ? {
                ...item,
                planned: item.planned || planned,
                note: [item.note, `${vendor.name} estimate ${money(vendor.minPrice)}-${money(vendor.maxPrice)}`].filter(Boolean).join(' | ')
              }
            : item
        )
      );
    } else {
      setBudgetItems((current) => [
        ...current,
        {
          id: `${Date.now()}`,
          category: vendor.category,
          planned,
          actual: 0,
          paid: 0,
          status: 'not-started',
          note: `${vendor.name} estimate ${money(vendor.minPrice)}-${money(vendor.maxPrice)}`
        }
      ]);
    }

    setActiveTab('budget');
    setStatusMessage(`${vendor.name} added to budget estimates.`);
    addActivity(`Vendor estimate added to budget: ${vendor.name}.`);
  }

  async function copyChecklist() {
    await navigator.clipboard.writeText(formatChecklistText(checklistTitle, checklistItems));
    setStatusMessage('Checklist copied.');
  }

  function exportChecklist(format: 'txt' | 'json') {
    if (format === 'json') {
      downloadTextFile('majlismate-checklist.json', JSON.stringify({ title: checklistTitle, items: checklistItems }, null, 2), 'application/json');
      return;
    }

    downloadTextFile('majlismate-checklist.txt', formatChecklistText(checklistTitle, checklistItems));
  }

  function addAppointmentToPhoneCalendar(appointment: Appointment) {
    downloadTextFile(`majlismate-${icsFilename(appointment.title)}.ics`, buildAppointmentIcs(appointment), 'text/calendar;charset=utf-8');
    setStatusMessage('Calendar file created. Open it on your phone to add the appointment.');
  }

  function addAllAppointmentsToPhoneCalendar() {
    const weddingEvent: Appointment[] = plannerProfile.majlisDate
      ? [{
          id: 'wedding-day',
          title: language === 'ms' ? 'Hari majlis' : 'Wedding day',
          date: plannerProfile.majlisDate,
          status: 'confirmed',
          location: plannerProfile.negeri,
          note: plannerProfile.coupleName || [plannerProfile.groomName, plannerProfile.brideName].filter(Boolean).join(' & ')
        }]
      : [];
    const allEvents = [...weddingEvent, ...appointments];
    if (allEvents.length === 0) {
      setStatusMessage('No appointments to export yet.');
      return;
    }
    downloadTextFile('majlismate-calendar.ics', buildCalendarIcs(allEvents), 'text/calendar;charset=utf-8');
    setStatusMessage('Calendar file created for all appointments.');
  }

  function exportGuestsCsv() {
    downloadTextFile('majlismate-guests.csv', buildGuestsCsv(guests), 'text/csv');
  }

  function importGuestsCsv(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const importedGuests = parseGuestsCsv(String(reader.result || ''));
      if (importedGuests.length === 0) {
        setStatusMessage('No valid guest names found in that CSV.');
        return;
      }
      setGuests((current) => [...current, ...importedGuests]);
      setStatusMessage(`${importedGuests.length} guest${importedGuests.length === 1 ? '' : 's'} imported.`);
    };
    reader.readAsText(file);
  }

  function exportBudgetCsv() {
    downloadTextFile('majlismate-budget.csv', buildBudgetCsv(budgetItems), 'text/csv');
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

    if (editingAppointmentId) {
      setAppointments((current) =>
        current.map((item) => (item.id === editingAppointmentId ? { ...appointment, id: editingAppointmentId } : item))
      );
      setEditingAppointmentId(null);
      setStatusMessage('Appointment updated.');
      addActivity(`Appointment updated: ${appointment.title}.`);
    } else {
      setAppointments((current) => [...current, appointment]);
      setStatusMessage('Appointment added.');
      addActivity(`Appointment added: ${appointment.title}.`);
    }
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
  }

  const completedCount = checklistItems.filter((item) => item.completed).length;
  // Appointments happening within the next 7 days that aren't done yet and
  // haven't been dismissed — surfaced as a reminder strip on the dashboard.
  const upcomingReminders = appointments
    .filter((appointment) => {
      if (appointment.status === 'done' || dismissedReminders.includes(appointment.id)) return false;
      const due = daysUntil(appointment.date);
      return due !== null && due >= 0 && due <= 7;
    })
    .sort(sortAppointments)
    .slice(0, 3);
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
  const isSelectedWeddingDay = Boolean(plannerProfile.majlisDate && selectedDate === plannerProfile.majlisDate);
  const weddingDayAppointment: Appointment | null = plannerProfile.majlisDate
    ? {
        id: 'wedding-day',
        title: language === 'ms' ? 'Hari majlis' : 'Wedding day',
        date: plannerProfile.majlisDate,
        status: 'confirmed',
        note: language === 'ms' ? 'Tarikh majlis daripada profil pasangan.' : 'Wedding date from the couple profile.'
      }
    : null;
  const todayKey = dateKey(new Date());
  const calendarAgendaItems = [
    ...appointments,
    ...(weddingDayAppointment ? [weddingDayAppointment] : [])
  ]
    .filter((appointment) => calendarAgendaFilter === 'all' || appointment.date >= todayKey)
    .sort(sortAppointments);
  const calendarAgendaGroups = calendarAgendaItems.reduce<Array<{ key: string; label: string; items: Appointment[] }>>((groups, appointment) => {
    const appointmentDate = new Date(`${appointment.date}T00:00:00`);
    const key = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}`;
    const label = appointmentDate.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
      month: 'long',
      year: 'numeric'
    });
    const existingGroup = groups.find((group) => group.key === key);
    if (existingGroup) {
      existingGroup.items.push(appointment);
      return groups;
    }
    return [...groups, { key, label, items: [appointment] }];
  }, []);
  const agendaNeedsTime = calendarAgendaItems.filter((appointment) => !appointment.time && appointment.id !== 'wedding-day').length;
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
  const riskAlerts = detectRisks({ plannerProfile, checklistItems, budgetItems, appointments, guests, pendingGuests, totalPlanned, totalPaid });

  const proactiveSuggestions = generateProactiveSuggestions({
    daysToWedding: daysLeft,
    weddingDateSet: Boolean(plannerProfile.majlisDate),
    venueBooked: budgetItems.some((b) => b.category === 'Dewan' || b.category === 'Venue'),
    photographerBooked: budgetItems.some((b) => b.category === 'Jurugambar' || b.category === 'Photographer'),
    cateringBooked: budgetItems.some((b) => b.category === 'Katering' || b.category === 'Catering'),
    hasBudget: (plannerProfile.totalBudget ?? 0) > 0,
    hasChecklist: checklistItems.length > 0,
    guestCount: guests.reduce((s, g) => s + g.pax, 0),
    pendingGuests,
    hantaranItems: 0,
    transportBooked: budgetItems.some((b) => b.category === 'Transport'),
    invitationsSent: guests.filter((g) => g.status !== 'pending').length > 0,
    totalPlanned,
    totalActual,
    completedChecklistCount: checklistItems.filter((item) => item.completed || item.status === 'done').length,
    totalChecklistItems: checklistItems.length
  }, 3);

  function handleProactivePick(suggestion: ProactiveSuggestion) {
    setActiveTab('chat');
    setInput(suggestion.promptMs);
  }

  function handleProactiveDismiss(suggestion: ProactiveSuggestion) {
    dismissSuggestion(suggestion.key);
  }
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
  const checklistPhases = Array.from(new Set(checklistItems.map((item) => item.phase).filter(Boolean))) as string[];
  const vendorCategories = Array.from(new Set(vendorDirectory.map((vendor) => vendor.category)));
  const vendorStates = Array.from(new Set(vendorDirectory.map((vendor) => vendor.negeri)));
  const staticFilteredVendors = vendorDirectory.filter((vendor) => {
    const negeriMatch = vendorFilter.negeri === 'All' || vendor.negeri === vendorFilter.negeri;
    const categoryMatch = vendorFilter.category === 'All' || vendor.category === vendorFilter.category;
    return negeriMatch && categoryMatch;
  });
  // Live Google Maps results (when fetched) appear first, then the curated list.
  const filteredVendors = [...googleVendors, ...staticFilteredVendors];
  const contextAssistantTab: MenuAssistantTab | null = activeTab === 'chat' ? null : (activeTab as MenuAssistantTab);
  const activeMenuTab = isContextAssistantOpen ? contextAssistantTab : null;
  const otherLanguage: AppLanguage = language === 'ms' ? 'en' : 'ms';
  const copy = {
    ms: {
      generatedNotice: 'Kandungan dijana pengguna dan belum disahkan.',
      live: 'Live',
      offline: 'Offline',
      customizeReady: 'Pilihan bahasa dan tarikh ada di menu kiri.',
      linkCopied: 'Link planner disalin.',
      flagged: 'Workspace ditanda untuk semakan.',
      weddingPlanner: 'wedding planner',
      weddingDate: 'tarikh majlis',
      morning: 'Selamat pagi,',
      afternoon: 'Selamat tengah hari,',
      evening: 'Selamat petang,',
      checklistShortcut: 'Buka checklist',
      askAi: 'Tanya AI',
      dashboard: 'dashboard',
      chat: 'chat',
      checklist: 'checklist',
      calendar: 'calendar',
      budget: 'anggaran perbelanjaan',
      guests: 'senarai tetamu',
      vendors: 'vendor',
      note: 'wedding planning dari hati untuk hati',
      welcome: 'hi, i MajlisMate',
      welcomeText: 'cerita kat i pasal wedding you - i tolong susun checklist, bajet, tetamu, semua. update i je bila ada progress',
      placeholder: 'Ask MajlisMate',
      checklistEyebrow: 'Checklist interaktif',
      done: 'selesai',
      allItems: 'Semua checklist',
      notStarted: 'Belum Mula',
      inProgress: 'Sedang Diurus',
      doneStatus: 'Selesai',
      creating: 'Sedang bina checklist...',
      emptyChecklist: 'Minta chat buat checklist dan ia akan muncul di sini.',
      addItem: 'Tambah checklist item...',
      add: 'Tambah',
      remove: 'Buang',
      send: 'Hantar',
      sending: 'Menghantar...',
      typing: 'MajlisMate sedang menaip...',
      sources: 'Sumber:',
      questionLabel: 'Soalan',
      mode: 'Medium',
      addAction: 'Tambah',
      dictate: 'Dictate',
      voice: 'Voice',
      noAnswer: 'Maaf, MajlisMate tak dapat jawapan untuk request ini.',
      errorPrefix: 'Maaf, ada ralat',
      networkFallback: 'Saya tak dapat hubungi AI buat masa ini, tapi saya masih boleh simpan data planner dan guna template yang ada. Cuba lagi sebentar, atau guna quick action untuk checklist, vendor, dan appointment.',
      defaultTemplate: 'Checklist MajlisMate',
      custom: 'Custom'
    },
    en: {
      generatedNotice: 'Content is user-generated and unverified.',
      live: 'Live',
      offline: 'Offline',
      customizeReady: 'Language and date controls are in the left menu.',
      linkCopied: 'Planner link copied.',
      flagged: 'Workspace flagged for review.',
      weddingPlanner: 'wedding planner',
      weddingDate: 'wedding date',
      morning: 'Good morning,',
      afternoon: 'Good afternoon,',
      evening: 'Good evening,',
      checklistShortcut: 'Open checklist',
      askAi: 'Ask AI',
      dashboard: 'dashboard',
      chat: 'chat',
      checklist: 'checklist',
      calendar: 'calendar',
      budget: 'budget',
      guests: 'guest list',
      vendors: 'vendors',
      note: 'wedding planning from the heart',
      welcome: 'hi, I am MajlisMate',
      welcomeText: 'tell me about your wedding - I can organize the checklist, budget, guests, vendors, and progress',
      placeholder: 'Ask MajlisMate',
      checklistEyebrow: 'Interactive checklist',
      done: 'done',
      allItems: 'All checklist items',
      notStarted: 'Not started',
      inProgress: 'In progress',
      doneStatus: 'Done',
      creating: 'Creating checklist...',
      emptyChecklist: 'Ask the chat to create a checklist and it will appear here.',
      addItem: 'Add checklist item...',
      add: 'Add',
      remove: 'Remove',
      send: 'Send',
      sending: 'Sending...',
      typing: 'MajlisMate is typing...',
      sources: 'Sources:',
      questionLabel: 'Question',
      mode: 'Medium',
      addAction: 'Add',
      dictate: 'Dictate',
      voice: 'Voice',
      noAnswer: 'Sorry, MajlisMate could not answer this request.',
      errorPrefix: 'Sorry, there was an error',
      networkFallback: 'I could not reach the AI service right now, but I can still save planner data and use the built-in templates. Try again shortly, or use the quick actions for checklist, vendors, and appointments.',
      defaultTemplate: 'MajlisMate checklist',
      custom: 'Custom'
    }
  }[language];

  const askVoiceStream = useCallback(
    async (question: string, opts?: { voiceMode?: boolean }) => {
      const trimmed = question.trim();
      if (!trimmed) {
        return {
          deltas: (async function* () {
            yield copy.welcome;
          })(),
          cancel: () => {}
        };
      }

      // Build multi-turn context from the VOICE conversation itself (each prior
      // spoken exchange becomes a user/assistant pair) so follow-up questions
      // like "yang mana lebih murah?" stay coherent. Falls back to nothing on
      // the first turn.
      const recentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = voiceHistoryRef.current
        .slice(-4)
        .flatMap((exchange) => [
          { role: 'user' as const, content: exchange.user },
          { role: 'assistant' as const, content: exchange.assistant }
        ]);
      recentMessages.push({ role: 'user', content: trimmed });
      // Use the same rich context as text chat so voice gets the planner state
      // summary (days left, urgent tasks, budget risk, guest status, shortlist).
      const plannerContext = buildPlannerContext();

      // Conversation memory is captured by <MemoryIndicator> and persisted.
      return askStream({
        messages: recentMessages,
        language,
        plannerContext,
        voiceMode: opts?.voiceMode ?? false
      });
    },
    [plannerProfile, appointments, checklistItems, budgetItems, guests, savedVendors, language, copy.welcome]
  );

  // Mirror the live-voice conversation history into a ref so askVoiceStream
  // (defined above the hook) can read the latest turns without a circular dep.
  const voiceHistoryRef = useRef<VoiceExchange[]>([]);

  const liveVoice = useLiveVoice({ language, ask: askVoiceStream });

  useEffect(() => {
    void liveVoice.phase;
  }, [liveVoice.phase]);

  useEffect(() => {
    voiceHistoryRef.current = liveVoice.history;
  }, [liveVoice.history]);

  // Stop the mic/STT/TTS whenever the live voice sheet is closed, regardless
  // of which code path triggered the close (onClose callback, backdrop, etc.).
  useEffect(() => {
    if (!isLiveVoiceOpen) {
      liveVoice.stop();
    }
    // Intentionally only re-run on open/close; liveVoice is a stable ref-like handle.
  }, [isLiveVoiceOpen]);

  const displayChecklistTitle = checklistTitle === 'Majlis planning checklist' || checklistTitle === 'Checklist'
    ? copy.defaultTemplate
    : checklistTitle;
  const getItemText = (item: ChecklistItem, selectedLanguage: AppLanguage = language): string =>
    (selectedLanguage === 'ms' ? item.textMs || item.text : item.textEn || item.text) ?? '';
  const getItemPhase = (item: ChecklistItem | undefined, selectedLanguage: AppLanguage = language): string =>
    (item ? (selectedLanguage === 'ms' ? item.phaseMs || item.phase : item.phaseEn || item.phase) : '') ?? '';
  const getChecklistPriority = (item: ChecklistItem) => {
    if (item.completed || item.status === 'done') return { className: 'done', label: language === 'ms' ? 'Selesai' : 'Done' };
    if (!item.deadline) return { className: 'later', label: language === 'ms' ? 'Later' : 'Later' };

    const due = daysUntil(item.deadline);
    if (due !== null && due < 0) return { className: 'urgent', label: language === 'ms' ? 'Overdue' : 'Overdue' };
    if (due !== null && due <= 14) return { className: 'urgent', label: language === 'ms' ? 'Urgent' : 'Urgent' };
    if (due !== null && due <= 45) return { className: 'soon', label: language === 'ms' ? 'Soon' : 'Soon' };
    return { className: 'later', label: language === 'ms' ? 'Later' : 'Later' };
  };
  const checklistStatusOptions = [
    { value: 'all', label: copy.allItems, count: checklistItems.length },
    { value: 'not-started', label: copy.notStarted, count: checklistItems.filter((item) => (item.status || (item.completed ? 'done' : 'not-started')) === 'not-started').length },
    { value: 'in-progress', label: copy.inProgress, count: checklistItems.filter((item) => (item.status || (item.completed ? 'done' : 'not-started')) === 'in-progress').length },
    { value: 'done', label: copy.doneStatus, count: completedCount }
  ];
  const urgentChecklistCount = checklistItems.filter((item) => getChecklistPriority(item).className === 'urgent').length;
  const soonChecklistCount = checklistItems.filter((item) => getChecklistPriority(item).className === 'soon').length;
  const dueThisMonthChecklistCount = checklistItems.filter((item) => {
    if (item.completed || item.status === 'done' || !item.deadline) return false;
    const dueDate = new Date(`${item.deadline}T00:00:00`);
    const today = new Date();
    return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
  }).length;
  const getChecklistStatus = (item: ChecklistItem) => item.status || (item.completed ? 'done' : 'not-started');
  const scoreChecklistItem = (item: ChecklistItem) => {
    const priority = getChecklistPriority(item).className;
    const due = item.deadline ? daysUntil(item.deadline) : null;
    const priorityScore = priority === 'urgent' ? 0 : priority === 'soon' ? 1 : 2;
    const statusScore = getChecklistStatus(item) === 'in-progress' ? -0.25 : 0;
    return priorityScore + statusScore + (due === null ? 999 : Math.max(due, -30) / 1000);
  };
  const openChecklistItems = checklistItems.filter((item) => getChecklistStatus(item) !== 'done');
  const nextChecklistItems = [...openChecklistItems]
    .sort((first, second) => scoreChecklistItem(first) - scoreChecklistItem(second))
    .slice(0, 6);
  // Category filter is a checklist-panel-only concern. The scoped* lists below
  // power the panel's three views + hero so the AI-facing lists above stay global.
  const matchesChecklistCategory = (item: ChecklistItem) =>
    !checklistCategoryFilter || (item.category || categorizeTask(item.text)) === checklistCategoryFilter;
  const scopedChecklistItems = checklistCategoryFilter
    ? checklistItems.filter(matchesChecklistCategory)
    : checklistItems;
  const scopedOpenChecklistItems = scopedChecklistItems.filter((item) => getChecklistStatus(item) !== 'done');
  const scopedNextChecklistItems = [...scopedOpenChecklistItems]
    .sort((first, second) => scoreChecklistItem(first) - scoreChecklistItem(second))
    .slice(0, 6);
  const scopedCompletedCount = scopedChecklistItems.filter((item) => getChecklistStatus(item) === 'done').length;
  const scopedTotalCount = scopedChecklistItems.length;
  const scopedProgress = scopedTotalCount > 0 ? Math.round((scopedCompletedCount / scopedTotalCount) * 100) : 0;
  // Per-category chips (only categories that actually have tasks) with their own
  // done/total progress, the way Akad shows progress per category.
  const checklistCategoryChips = CHECKLIST_CATEGORIES
    .map((cat) => {
      const items = checklistItems.filter((item) => (item.category || categorizeTask(item.text)) === cat.id);
      const done = items.filter((item) => getChecklistStatus(item) === 'done').length;
      return { id: cat.id, label: getCategoryLabel(cat.id, language), total: items.length, done };
    })
    .filter((chip) => chip.total > 0);
  const checklistFocusGroups = [
    {
      key: 'now',
      title: language === 'ms' ? 'Sekarang' : 'Now',
      helper: language === 'ms' ? 'Overdue, urgent, atau sedang diurus.' : 'Overdue, urgent, or already in progress.',
      items: scopedOpenChecklistItems
        .filter((item) => getChecklistPriority(item).className === 'urgent' || getChecklistStatus(item) === 'in-progress')
        .sort((first, second) => scoreChecklistItem(first) - scoreChecklistItem(second))
        .slice(0, 4)
    },
    {
      key: 'week',
      title: language === 'ms' ? 'Minggu ini' : 'This week',
      helper: language === 'ms' ? 'Task yang elok diselesaikan selepas item urgent.' : 'Tasks to handle after urgent items.',
      items: scopedOpenChecklistItems
        .filter((item) => getChecklistPriority(item).className === 'soon')
        .sort((first, second) => scoreChecklistItem(first) - scoreChecklistItem(second))
        .slice(0, 4)
    },
    {
      key: 'later',
      title: language === 'ms' ? 'Kemudian' : 'Later',
      helper: language === 'ms' ? 'Belum kritikal, tapi jangan hilang dari radar.' : 'Not critical yet, but keep it visible.',
      items: scopedOpenChecklistItems
        .filter((item) => getChecklistPriority(item).className === 'later')
        .sort((first, second) => scoreChecklistItem(first) - scoreChecklistItem(second))
        .slice(0, 4)
    }
  ].filter((group) => group.items.length > 0);
  const completedChecklistItems = scopedChecklistItems.filter((item) => getChecklistStatus(item) === 'done');
  const checklistPhaseGroups = checklistPhases
    .map((phase) => ({
      phase,
      items: scopedChecklistItems.filter((item) => item.phase === phase)
    }))
    // Drop phases with no tasks in the active category (no-op when unfiltered).
    .filter((group) => group.items.length > 0);
  const checklistCategoryGroups = checklistPhaseGroups.length > 0
    ? checklistPhaseGroups
    : [{ phase: copy.custom, items: scopedChecklistItems }];
  const firstOpenPhaseIndex = checklistCategoryGroups.findIndex((group) =>
    group.items.some((item) => getChecklistStatus(item) !== 'done')
  );
  const checklistTimeline = checklistCategoryGroups.map((group, index) => {
    const total = group.items.length;
    const done = group.items.filter((item) => getChecklistStatus(item) === 'done').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const overdueCount = group.items.filter((item) => {
      if (getChecklistStatus(item) === 'done') return false;
      const d = item.deadline ? daysUntil(item.deadline) : null;
      return d !== null && d < 0;
    }).length;
    const allDone = total > 0 && done === total;
    const isActive = index === firstOpenPhaseIndex;
    const state: 'done' | 'overdue' | 'active' | 'upcoming' =
      allDone ? 'done' : overdueCount > 0 ? 'overdue' : isActive ? 'active' : 'upcoming';
    const deadlines = group.items
      .map((item) => item.deadline)
      .filter((d): d is string => Boolean(d))
      .sort();
    const deadline = deadlines.length ? deadlines[deadlines.length - 1] : undefined;
    const dateLabel = deadline
      ? new Date(`${deadline}T00:00:00`).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      : '';
    return {
      key: group.phase,
      label: getItemPhase(group.items[0]) || group.phase,
      items: group.items,
      total,
      done,
      pct,
      overdueCount,
      state,
      isActive,
      dateLabel,
      defaultOpen: !allDone && (isActive || overdueCount > 0)
    };
  });
  const checklistViewOptions = [
    { value: 'timeline' as const, label: language === 'ms' ? 'Timeline' : 'Timeline', count: checklistCategoryGroups.length },
    { value: 'next' as const, label: language === 'ms' ? 'Fokus' : 'Focus', count: scopedNextChecklistItems.length },
    { value: 'completed' as const, label: language === 'ms' ? 'Selesai' : 'Completed', count: completedChecklistItems.length }
  ];
  const checklistEmptyActionText = language === 'ms' ? 'Bina checklist sekarang' : 'Create checklist now';
  const checklistNextPrompt = language === 'ms' ? 'Apa perlu dibuat minggu ini?' : 'What should I do this week?';
  const checklistSchedulePrompt = language === 'ms' ? 'Jadikan appointment' : 'Add to calendar';
  const calendarSuggestions =
    daysLeft === null
      ? [
          language === 'ms' ? 'Tambah tarikh majlis untuk cadangan calendar' : 'Add wedding date for calendar suggestions',
          language === 'ms' ? 'Schedule call dengan venue pilihan' : 'Schedule a call with a preferred venue'
        ]
      : daysLeft <= 30
        ? [
            language === 'ms' ? 'Confirm final headcount dengan caterer' : 'Confirm final headcount with caterer',
            language === 'ms' ? 'Schedule final briefing vendor' : 'Schedule final vendor briefing',
            language === 'ms' ? 'Confirm setup time pelamin/dekor' : 'Confirm decor setup time'
          ]
        : daysLeft <= 90
          ? [
              language === 'ms' ? 'Follow up RSVP deadline' : 'Follow up RSVP deadline',
              language === 'ms' ? 'Confirm fitting baju' : 'Confirm outfit fitting',
              language === 'ms' ? 'Review payment balance vendor' : 'Review vendor payment balance'
            ]
          : [
              language === 'ms' ? 'Book venue/vendor appointment' : 'Book venue/vendor appointment',
              language === 'ms' ? 'Schedule food tasting' : 'Schedule food tasting',
              language === 'ms' ? 'Plan photographer discussion' : 'Plan photographer discussion'
            ];
  const selectedMonthConfirmed = selectedMonthAppointments.filter((appointment) => appointment.status === 'confirmed').length;
  const selectedMonthOpen = selectedMonthAppointments.filter((appointment) => appointment.status !== 'done').length;
  const nextAppointment = selectedMonthAppointments.find((appointment) => appointment.date >= dateKey(new Date()));
  const globalNextAppointment = [...appointments]
    .filter((appointment) => appointment.date >= dateKey(new Date()))
    .sort(sortAppointments)[0];
  const overBudgetItems = budgetItems.filter((item) => item.actual > item.planned && item.planned > 0);
  const remainingToPay = Math.max(totalActual - totalPaid, 0);
  const weeklyBriefing = buildWeeklyBriefing(
    {
      partnerName:
        plannerProfile.coupleName.trim() ||
        [plannerProfile.groomName, plannerProfile.brideName].filter(Boolean).join(' & ') ||
        undefined,
      daysLeft,
      urgentTaskTitles: openChecklistItems
        .filter((item) => getChecklistPriority(item).className === 'urgent')
        .sort((first, second) => scoreChecklistItem(first) - scoreChecklistItem(second))
        .map((item) => getItemText(item)),
      weekTaskTitles: openChecklistItems
        .filter((item) => getChecklistPriority(item).className === 'soon')
        .sort((first, second) => scoreChecklistItem(first) - scoreChecklistItem(second))
        .map((item) => getItemText(item)),
      overBudget: overBudgetItems.map((item) => ({ category: item.category, over: item.actual - item.planned })),
      remainingToPay,
      nextAppointment: globalNextAppointment
        ? { title: globalNextAppointment.title, date: globalNextAppointment.date }
        : null,
      pendingGuests,
      progressPct: planningProgress,
      doneCount: completedCount,
      totalCount: totalChecklistItems
    },
    language
  );
  const budgetAlert =
    overBudgetItems.length > 0
      ? `${overBudgetItems.length} over budget`
      : remainingToPay > 0
        ? `${money(remainingToPay)} to pay`
        : totalActual > 0
          ? 'On track'
          : 'Ready to plan';
  const planningPhase =
    daysLeft === null
      ? 'Setup phase'
      : daysLeft > 365
        ? 'Early planning'
        : daysLeft > 180
          ? 'Booking phase'
          : daysLeft > 90
            ? 'Preparation phase'
            : daysLeft > 30
              ? 'Confirmation phase'
              : daysLeft >= 0
                ? 'Final countdown'
                : 'Post-wedding';
  const smartReminders = [
    urgentChecklistCount > 0 ? `${urgentChecklistCount} urgent checklist item${urgentChecklistCount === 1 ? '' : 's'} need attention` : '',
    soonChecklistCount > 0 ? `${soonChecklistCount} checklist item${soonChecklistCount === 1 ? '' : 's'} coming soon` : '',
    pendingGuests > 0 ? `${pendingGuests} pending RSVP pax to follow up` : '',
    remainingToPay > 0 ? `${money(remainingToPay)} remaining payment to track` : '',
    !globalNextAppointment ? 'Schedule the next vendor or family follow-up' : '',
    !plannerProfile.majlisDate ? 'Set wedding date to unlock timeline guidance' : ''
  ].filter(Boolean).slice(0, 5);
  if (smartReminders.length === 0) smartReminders.push('Everything looks calm. Review today view and keep progress updated.');
  const contextInsights: Record<MenuAssistantTab, string[]> = {
    dashboard: smartReminders,
    checklist: [
      urgentChecklistCount > 0
        ? language === 'ms'
          ? `Prioritize ${urgentChecklistCount} task urgent`
          : `Prioritize ${urgentChecklistCount} urgent tasks`
        : language === 'ms'
          ? 'Cadangkan task seterusnya'
          : 'Suggest the next tasks',
      dueThisMonthChecklistCount > 0
        ? language === 'ms'
          ? `Susun ${dueThisMonthChecklistCount} task bulan ini`
          : `Organize ${dueThisMonthChecklistCount} tasks due this month`
        : language === 'ms'
          ? 'Buat checklist final week'
          : 'Create a final week checklist',
      language === 'ms' ? 'Jadikan task penting sebagai appointment' : 'Turn important tasks into appointments'
    ],
    calendar: [
      globalNextAppointment
        ? language === 'ms'
          ? `Apa perlu prepare untuk ${globalNextAppointment.title}?`
          : `What should I prepare for ${globalNextAppointment.title}?`
        : language === 'ms'
          ? 'Cadangkan appointment vendor seterusnya'
          : 'Suggest the next vendor appointment',
      plannerProfile.majlisDate
        ? language === 'ms'
          ? 'Bina reminder sebelum hari majlis'
          : 'Create reminders before the wedding day'
        : language === 'ms'
          ? 'Tambah tarikh majlis untuk timeline'
          : 'Add wedding date for the timeline',
      language === 'ms' ? 'Schedule follow-up vendor minggu ini' : 'Schedule a vendor follow-up this week'
    ],
    budget: [
      totalPlanned === 0
        ? language === 'ms'
          ? `Cadangkan pecahan bajet ${money(plannerProfile.totalBudget || 30000)}`
          : `Suggest a ${money(plannerProfile.totalBudget || 30000)} budget split`
        : language === 'ms'
          ? 'Review bajet dan kos tertinggal'
          : 'Review budget and missing costs',
      overBudgetItems.length > 0
        ? language === 'ms'
          ? `Bantu kawal ${overBudgetItems.length} kategori over budget`
          : `Help control ${overBudgetItems.length} over-budget categories`
        : language === 'ms'
          ? 'Apa kos kahwin yang selalu terlupa?'
          : 'What wedding costs are often missed?',
      language === 'ms' ? 'Susun priority bayaran vendor' : 'Prioritize vendor payments'
    ],
    rsvp: [
      pendingGuests > 0
        ? language === 'ms'
          ? `Draft reminder untuk ${pendingGuests} pax pending`
          : `Draft reminders for ${pendingGuests} pending pax`
        : language === 'ms'
          ? 'Cadangkan cara susun guest list'
          : 'Suggest a guest list structure',
      language === 'ms' ? 'Ringkaskan headcount untuk caterer' : 'Summarize headcount for caterer',
      language === 'ms' ? 'Tambah tetamu dari mesej saya' : 'Add guests from my message'
    ],
    vendors: [
      savedVendors.length > 0
        ? language === 'ms'
          ? 'Bandingkan vendor shortlisted'
          : 'Compare shortlisted vendors'
        : language === 'ms'
          ? 'Cari vendor ikut negeri dan bajet'
          : 'Find vendors by state and budget',
      language === 'ms' ? 'Draft mesej WhatsApp untuk vendor' : 'Draft a vendor WhatsApp message',
      language === 'ms' ? 'Apa soalan wajib tanya vendor?' : 'What must I ask vendors?'
    ]
  };
  const coupleDisplayName =
    plannerProfile.coupleName.trim() ||
    [plannerProfile.groomName.trim(), plannerProfile.brideName.trim()].filter(Boolean).join(' & ') ||
    (language === 'ms' ? 'Profil pasangan' : 'Couple profile');
  const coupleInitials = coupleDisplayName
    .split(/\s+|&/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'MM';
  const coupleMeta =
    plannerProfile.majlisDate ||
    (plannerProfile.negeri ? `${plannerProfile.negeri} - ${plannerProfile.guestTarget} pax` : `${plannerProfile.guestTarget} pax`);
  const sidebarDateLabel = plannerProfile.majlisDate
    ? new Date(`${plannerProfile.majlisDate}T00:00:00`).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    : language === 'ms' ? 'Belum ditetapkan' : 'Not set yet';
  const selectTab = (tab: ActiveTab) => {
    if (tab === 'chat') {
      startFreshChat({ silent: true });
      setIsSidebarOpen(false);
      setIsContextAssistantOpen(false);
      return;
    }
    setActiveTab(tab);
    setIsSidebarOpen(false);
    setIsContextAssistantOpen(false);
  };
  const currentHour = isHydrated ? new Date().getHours() : 9;
  const timeGreeting = currentHour < 12 ? copy.morning : currentHour < 18 ? copy.afternoon : copy.evening;
  const greetingName =
    plannerProfile.coupleName.trim() ||
    [plannerProfile.groomName.trim(), plannerProfile.brideName.trim()].filter(Boolean).join(' & ') ||
    'MajlisMate';
  const quickActionPills = [
    {
      id: 'setup',
      label: language === 'ms' ? 'Setup planner' : 'Set up planner',
      onClick: () => setInput(language === 'ms'
        ? 'Setup majlis saya: tarikh 12/06/2027, Selangor, bajet RM30000, 300 tetamu'
        : 'Set up my wedding: 12/06/2027, Selangor, RM30000 budget, 300 guests')
    },
    {
      id: 'budget',
      label: language === 'ms' ? 'Cadang bajet' : 'Suggest budget',
      onClick: () => applySmartBudgetSuggestion()
    },
    {
      id: 'calendar',
      label: language === 'ms' ? 'Buat appointment' : 'Make an appointment',
      onClick: () => {
        selectTab('calendar');
        startAppointmentAssistant();
      }
    }
  ];
  const normalizedInput = input.toLowerCase();
  const commandSuggestions =
    input.trim().length < 2
      ? []
      : normalizedInput.includes('vendor')
        ? [language === 'ms' ? 'Draft mesej WhatsApp untuk vendor' : 'Draft a WhatsApp message to a vendor', language === 'ms' ? 'Apa soalan perlu tanya vendor?' : 'What questions should I ask a vendor?']
        : normalizedInput.includes('check') || normalizedInput.includes('senarai')
          ? [language === 'ms' ? 'Buat checklist bulan terakhir' : 'Create a final month checklist', language === 'ms' ? 'Susun task ikut priority' : 'Prioritize my tasks']
          : normalizedInput.includes('bajet') || normalizedInput.includes('budget') || normalizedInput.includes('rm')
            ? [language === 'ms' ? 'Cadangkan pecahan bajet' : 'Suggest a budget allocation', language === 'ms' ? 'Apa kos yang mungkin tertinggal?' : 'What costs might be missing?']
            : normalizedInput.includes('appoint') || normalizedInput.includes('jadual') || normalizedInput.includes('tempah')
              ? [language === 'ms' ? 'Buat appointment vendor minggu ini' : 'Schedule a vendor appointment this week', language === 'ms' ? 'Apa perlu confirm dengan vendor?' : 'What should I confirm with the vendor?']
              : [];
  void commandSuggestions;
  const sidebarMenuLabels: Record<ActiveTab, string> = {
    dashboard: copy.dashboard,
    chat: copy.chat,
    checklist: copy.checklist,
    calendar: copy.calendar,
    budget: language === 'ms' ? 'Bajet' : 'Budget',
    rsvp: language === 'ms' ? 'Tetamu' : 'Guests',
    vendors: copy.vendors
  };
  const checklistSurveyAnswers = toSurveyAnswers(plannerProfile);
  const checklistProfileReady = profileReadyForChecklist(checklistSurveyAnswers).ready;
  // Deterministic "what to add" suggestions: items the generator would create for
  // this couple that aren't on their list yet. Free, instant, no AI call.
  const recommendedMissingItems = useMemo<ChecklistItem[]>(() => {
    if (!checklistProfileReady) return [];
    const generated = generatePersonalizedChecklist(checklistSurveyAnswers).items;
    const have = new Set(checklistItems.map((item) => checklistKey(item.text)));
    return generated.filter((item) => !have.has(checklistKey(item.text))).slice(0, 6);
  }, [
    checklistProfileReady,
    checklistSurveyAnswers.weddingDate,
    checklistSurveyAnswers.venueState,
    checklistSurveyAnswers.brideOriginState,
    checklistSurveyAnswers.groomOriginState,
    checklistSurveyAnswers.hasNikah,
    checklistSurveyAnswers.hasSanding,
    checklistSurveyAnswers.estimatedGuests,
    checklistItems
  ]);
  const commandItems = [
    {
      label: language === 'ms' ? 'Tanya MajlisMate' : 'Ask MajlisMate',
      detail: language === 'ms' ? 'Buka chat utama' : 'Open main chat',
      action: () => selectTab('chat')
    },
    {
      label: language === 'ms' ? 'Buat checklist' : 'Create checklist',
      detail: copy.defaultTemplate,
      action: createDefaultChecklist
    },
    {
      label: language === 'ms' ? 'Buat appointment' : 'Schedule appointment',
      detail: selectedDate,
      action: () => {
        selectTab('calendar');
        startAppointmentAssistant();
      }
    },
    ...nextChecklistItems.slice(0, 5).map((item) => ({
      label: getItemText(item),
      detail: `${copy.checklist} - ${getItemPhase(item) || copy.custom}`,
      action: () => {
        setChecklistView('next');
        selectTab('checklist');
      }
    })),
    ...vendorDirectory.slice(0, 6).map((vendor) => ({
      label: vendor.name,
      detail: `${vendor.category} - ${vendor.negeri}`,
      action: () => {
        setVendorFilter({ negeri: vendor.negeri, category: vendor.category });
        selectTab('vendors');
      }
    })),
    ...appointments.slice(0, 6).map((appointment) => ({
      label: appointment.title,
      detail: `${copy.calendar} - ${appointment.date}`,
      action: () => {
        setSelectedDate(appointment.date);
        setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
        selectTab('calendar');
      }
    })),
    ...guests.slice(0, 6).map((guest) => ({
      label: guest.name,
      detail: `${copy.guests} - ${guest.group}`,
      action: () => selectTab('rsvp')
    }))
  ];
  const filteredCommandItems = commandItems
    .filter((item) => {
      const query = commandQuery.trim().toLowerCase();
      if (!query) return true;
      return `${item.label} ${item.detail}`.toLowerCase().includes(query);
    })
    .slice(0, 9);
  const checklistRowCopy = {
    custom: copy.custom,
    notStarted: copy.notStarted,
    inProgress: copy.inProgress,
    done: copy.doneStatus,
    remove: copy.remove,
    schedule: checklistSchedulePrompt,
    noDate: language === 'ms' ? 'Tiada tarikh' : 'No date',
    suggest: language === 'ms' ? 'Cadang' : 'Suggest',
    addNote: language === 'ms' ? 'Tambah nota' : 'Add note',
    saveNote: language === 'ms' ? 'Simpan' : 'Save'
  };

  const renderChecklistTask = (item: ChecklistItem, options?: { compact?: boolean }) => (
    <ChecklistTaskRow
      key={item.id}
      item={item}
      language={language}
      otherLanguage={otherLanguage}
      compact={options?.compact}
      majlisDate={plannerProfile.majlisDate || undefined}
      isSelectable={checklistSelectMode}
      isSelected={selectedChecklistIds.has(item.id)}
      getItemText={getItemText}
      getItemPhase={getItemPhase}
      categoryLabel={getCategoryLabel(item.category, language)}
      getPriority={getChecklistPriority}
      getStatus={getChecklistStatus}
      onRemove={() => removeChecklistItem(item.id)}
      onUpdateStatus={(status) => updateChecklistStatus(item.id, status)}
      onUpdateText={(text) => updateChecklistItemText(item.id, text)}
      onUpdateDeadline={(deadline) => updateChecklistDeadline(item.id, deadline)}
      onUpdateNote={(note) => updateChecklistNote(item.id, note)}
      onSelect={() => toggleChecklistSelect(item.id)}
      onLongPressSelect={!options?.compact ? () => {
        setChecklistSelectMode(true);
        setSelectedChecklistIds((current) => {
          const next = new Set(current);
          next.add(item.id);
          return next;
        });
      } : undefined}
      onSchedule={!options?.compact ? () => {
        setActiveTab('calendar');
        setIsContextAssistantOpen(true);
        setAppointmentAssistantActive(true);
        setMenuInputs((current) => ({
          ...current,
          calendar: `${language === 'ms' ? 'Buat appointment untuk' : 'Create an appointment for'} ${getItemText(item)} on ${item.deadline || selectedDate} at `
        }));
      } : undefined}
      copyLabels={checklistRowCopy}
    />
  );

  if (!isHydrated) {
    return (
      <section className="planner-workspace" aria-label="MajlisMate.ai planner workspace">
        <div className="app-loading">
          <div className="skeleton-bar" />
          <div className="skeleton-message" />
          <div className="skeleton-message skeleton-message--user" />
        </div>
      </section>
    );
  }

  return (
    <section className="planner-workspace" aria-label="MajlisMate.ai planner workspace">
      {isOffline ? (
        <div className="pwa-banner">Offline mode: templates and saved planning data are available. AI replies need internet.</div>
      ) : null}

      {statusMessage ? <div className="pwa-banner success">{statusMessage}</div> : null}

      {featureFlags.liveVoice && isLiveVoiceOpen ? (
        <LiveVoiceSheet
          language={language}
          voice={liveVoice}
          isOpen={isLiveVoiceOpen}
          onClose={() => {
            liveVoice.stop();
            setIsLiveVoiceOpen(false);
          }}
          onApplyActions={(actions) => {
            runActionsWithDisambiguation(actions, () => {
              setStatusMessage(language === 'ms' ? 'Ditambah ke planner.' : 'Added to your planner.');
            });
          }}
        />
      ) : null}

      {vendorMessageTarget ? (
        <VendorMessageSheet
          vendor={vendorMessageTarget}
          profile={plannerProfile}
          language={language}
          onClose={() => setVendorMessageTarget(null)}
        />
      ) : null}

      <div className={`planner-body ${activeMenuTab ? 'has-assistant' : ''} ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <aside className="planner-sidebar" aria-label="Planner menu">
          <div className="sidebar-header">
            <span className="sidebar-mark" aria-hidden="true">i</span>
            <div>
              <strong>{copy.weddingPlanner}</strong>
            </div>
            <button type="button" className="sidebar-close-button" aria-label="Close menu" onClick={() => setIsSidebarOpen(false)}>
              ×
            </button>
          </div>
          <label className="sidebar-date">
            <span>{copy.weddingDate}</span>
            <span className="sidebar-date-control">
              <strong>{sidebarDateLabel}</strong>
              <small>{language === 'ms' ? 'Tap untuk tukar tarikh' : 'Tap to change date'}</small>
              <input
                type="date"
                value={plannerProfile.majlisDate}
                onChange={(event) => setPlannerProfile((current) => ({ ...current, majlisDate: event.target.value }))}
                aria-label={copy.weddingDate}
              />
            </span>
          </label>
          <nav className="planner-menu" role="tablist" aria-label="Planner menu">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'dashboard'}
              className={activeTab === 'dashboard' ? 'active' : ''}
              onClick={() => selectTab('dashboard')}
            >
              <span className="menu-label"><span className="menu-icon"><MenuIcon name="dashboard" /></span>{copy.dashboard}</span>
              <span className="menu-chevron" aria-hidden="true" />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              className={activeTab === 'chat' ? 'active' : ''}
              onClick={() => selectTab('chat')}
            >
              <span className="menu-label"><span className="menu-icon"><MenuIcon name="chat" /></span>{copy.chat}</span>
              <span className="menu-chevron" aria-hidden="true" />
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'checklist'}
              className={activeTab === 'checklist' ? 'active' : ''}
              onClick={() => selectTab('checklist')}
            >
              <span className="menu-label"><span className="menu-icon"><MenuIcon name="checklist" /></span>{copy.checklist}</span>
              {checklistItems.length > 0 ? <span>{completedCount}/{checklistItems.length}</span> : <span className="menu-chevron" aria-hidden="true" />}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'calendar'}
              className={activeTab === 'calendar' ? 'active' : ''}
              onClick={() => selectTab('calendar')}
            >
              <span className="menu-label"><span className="menu-icon"><MenuIcon name="calendar" /></span>{copy.calendar}</span>
              {appointments.length > 0 ? <span>{appointments.length}</span> : <span className="menu-chevron" aria-hidden="true" />}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'budget'}
              className={activeTab === 'budget' ? 'active' : ''}
              onClick={() => selectTab('budget')}
            >
              <span className="menu-label"><span className="menu-icon"><MenuIcon name="budget" /></span>{sidebarMenuLabels.budget}</span>
              {budgetItems.length > 0 ? <span>{money(totalPaid)}</span> : <span className="menu-chevron" aria-hidden="true" />}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'rsvp'}
              className={activeTab === 'rsvp' ? 'active' : ''}
              onClick={() => selectTab('rsvp')}
            >
              <span className="menu-label"><span className="menu-icon"><MenuIcon name="guests" /></span>{sidebarMenuLabels.rsvp}</span>
              {guests.length > 0 ? <span>{confirmedGuests}</span> : <span className="menu-chevron" aria-hidden="true" />}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'vendors'}
              className={activeTab === 'vendors' ? 'active' : ''}
              onClick={() => selectTab('vendors')}
            >
              <span className="menu-label"><span className="menu-icon"><MenuIcon name="vendors" /></span>{copy.vendors}</span>
              {savedVendors.length > 0 ? <span>{savedVendors.length}</span> : <span className="menu-chevron" aria-hidden="true" />}
            </button>
          </nav>
          {featureFlags.liveVoice ? (
            <button
              type="button"
              className={`sidebar-live-button${liveVoice.phase !== 'idle' ? ' is-active' : ''}`}
              onClick={() => setIsLiveVoiceOpen(true)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
              {copy.live}
              {liveVoice.phase !== 'idle' ? (
                <span className="sidebar-live-dot" aria-hidden="true" />
              ) : null}
            </button>
          ) : null}
          <RiskAlerts
            alerts={riskAlerts}
            language={language}
            onNavigate={(tab) => { selectTab(tab); setIsSidebarOpen(false); }}
          />
          <div className="couple-profile-card">
            <button type="button" className="couple-profile-main" onClick={() => setIsSettingsOpen(true)}>
              <div className="couple-avatar" aria-hidden="true">{coupleInitials}</div>
              <div className="couple-profile-copy">
                <strong>{coupleDisplayName}</strong>
                <span>{coupleMeta}</span>
              </div>
            </button>
            <div className="language-toggle compact" aria-label="Language">
              {(['ms', 'en'] as AppLanguage[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={language === option ? 'active' : ''}
                  onClick={() => setLanguage(option)}
                  aria-pressed={language === option}
                >
                  {languageLabels[option]}
                </button>
              ))}
            </div>
          </div>
        </aside>
        {isSidebarOpen ? (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Close menu"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : null}

        <div className="planner-content">
          <div className="workspace-titlebar">
            <button
              type="button"
              className={`workspace-menu-button ${isSidebarOpen ? 'active' : ''}`}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              Menu
            </button>
            <div className="workspace-title-center">
              <Image src="/logo-mark.svg" width={40} height={40} className="sidebar-logo-mark" alt="" aria-hidden="true" />
              <strong>MajlisMate</strong>
            </div>
            <div className="workspace-title-actions">
              {activeTab === 'chat' ? (
                <button
                  type="button"
                  className="workspace-chat-action workspace-history-button"
                  aria-label="Open chat history"
                  aria-expanded={isChatHistoryOpen}
                  title={language === 'ms' ? 'Chat history' : 'Chat history'}
                  onClick={() => setIsChatHistoryOpen(true)}
                >
                  <HistoryIcon />
                </button>
              ) : null}
              {featureFlags.liveVoice ? (
                <button
                  type="button"
                  className={`workspace-live-button${liveVoice.phase !== 'idle' ? ' is-active' : ''}`}
                  aria-label={language === 'ms' ? 'Buka MajlisMate Live' : 'Open MajlisMate Live'}
                  onClick={() => setIsLiveVoiceOpen(true)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
                    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                  </svg>
                  {copy.live}
                </button>
              ) : null}
              <button
                type="button"
                className="workspace-command-button"
                aria-label="Open command search"
                onClick={() => setIsCommandOpen(true)}
              >
                Search
              </button>
              {contextAssistantTab ? (
                <button
                  type="button"
                  className="workspace-ai-button"
                  aria-label="Open context assistant"
                  aria-expanded={isContextAssistantOpen}
                  onClick={() => setIsContextAssistantOpen(true)}
                >
                  <span className="workspace-ai-icon"><RobotIcon /></span>
                  {copy.askAi}
                </button>
              ) : null}
              <button
                type="button"
                className="workspace-profile-button"
                aria-label="Open couple profile and settings"
                onClick={() => setIsSettingsOpen(true)}
              >
                {coupleInitials}
              </button>
            </div>
          </div>
          {activeTab === 'dashboard' ? (
        <>
        {upcomingReminders.length > 0 ? (
          <div className="reminder-strip" role="region" aria-label={language === 'ms' ? 'Peringatan appointment' : 'Appointment reminders'}>
            {upcomingReminders.map((appointment) => {
              const due = daysUntil(appointment.date);
              const whenLabel = due === 0
                ? language === 'ms' ? 'hari ini' : 'today'
                : due === 1
                  ? language === 'ms' ? 'esok' : 'tomorrow'
                  : language === 'ms' ? `dalam ${due} hari` : `in ${due} days`;
              return (
                <div key={appointment.id} className="reminder-item">
                  <span className="reminder-icon" aria-hidden="true">📅</span>
                  <button
                    type="button"
                    className="reminder-body"
                    onClick={() => {
                      setCalendarMonth(new Date(`${appointment.date}T00:00:00`));
                      setSelectedDate(appointment.date);
                      setActiveTab('calendar');
                    }}
                  >
                    <strong>{appointment.title}</strong>
                    <span>{whenLabel}{appointment.time ? ` · ${appointment.time}` : ''}{appointment.vendor ? ` · ${appointment.vendor}` : ''}</span>
                  </button>
                  <button
                    type="button"
                    className="reminder-dismiss"
                    aria-label={language === 'ms' ? 'Tutup peringatan' : 'Dismiss reminder'}
                    onClick={() => setDismissedReminders((current) => [...current, appointment.id])}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        {(() => {
          const readiness = profileReadyForChecklist(plannerProfile);
          if (!readiness.ready) {
            return (
              <div className="personalize-banner" role="region" aria-label="Personalize checklist">
                <div>
                  <strong>{language === 'ms' ? 'Peribadikan checklist anda' : 'Personalize your checklist'}</strong>
                  <p>{language === 'ms' ? 'Jawab 5 soalan ringkas untuk dapat checklist ikut negeri, format, dan bajet anda.' : 'Answer 5 quick questions to get a checklist tailored to your state, format, and budget.'}</p>
                </div>
                <Link href="/setup" className="primary-action" data-event="personalize_cta_dashboard">{language === 'ms' ? 'Mula' : 'Start'}</Link>
              </div>
            );
          }
          return null;
        })()}
        <NotificationToggle
          language={language}
          enabled={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />
        <DashboardPanel
          plannerProfile={plannerProfile}
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
          activity={activity}
          language={language}
          onAskToday={() => {
            setActiveTab('chat');
            setInput(language === 'ms' ? 'Apa yang patut saya buat hari ini untuk planning majlis?' : 'What should I work on today for my wedding planning?');
          }}
          briefing={weeklyBriefing}
          isSpeaking={liveVoice.phase === 'speaking'}
          canSpeak={liveVoice.support !== 'unavailable'}
          onSpeak={() => liveVoice.speakNow(weeklyBriefing.speech)}
          onStopSpeak={() => liveVoice.cancelTts()}
        />
        {proactiveSuggestions.length > 0 ? (
          <ProactiveSuggestionCard
            suggestions={proactiveSuggestions}
            language={language}
            onPick={handleProactivePick}
            onDismiss={handleProactiveDismiss}
          />
        ) : null}

        </>
      ) : activeTab === 'chat' ? (
        <div className={`main-chat-panel ${messages.length === 1 && messages[0].content === defaultAssistantMessage.content ? 'empty-chat' : 'active-chat'}`}>
          <div className="chat-welcome">
            <span aria-hidden="true">heart</span>
            <h2>
              <span>{timeGreeting}</span>
              {greetingName}
            </h2>
            <p>{copy.welcomeText}</p>
          </div>
          <div className="starter-grid">
            {quickActionPills.map((pill) => (
              <button key={pill.id} type="button" onClick={pill.onClick} disabled={loading}>
                <span className={`quick-pill-icon ${pill.id}`} aria-hidden="true" />
                {pill.label}
              </button>
            ))}
          </div>
          <ChatWidget
            messages={messages.length === 1 && messages[0].content === defaultAssistantMessage.content ? [] : messages}
            input={input}
            loading={loading}
            placeholder={copy.placeholder}
            submitLabel={copy.send}
            emptyTypingLabel={copy.typing}
            onStopGenerating={function handleStop() { setLoading(false); }}
            onHighlightAsk={function handleHighlight(p) { setInput(p); }}
            inputAriaLabel={copy.questionLabel}
            language={language}
            dictateLabel={copy.dictate}
            voiceLabel={copy.voice}
            commandSuggestions={commandSuggestions}
            messagesEndRef={messagesEndRef}
            onInputChange={setInput}
            onCommandSuggestion={(suggestion) => setInput(suggestion)}
            onVoiceMode={featureFlags.liveVoice ? () => setIsLiveVoiceOpen(true) : undefined}
            onApplyActions={applyMessageActions}
            onDismissActions={dismissMessageActions}
            onClarifyReply={answerClarify}
            onSubmit={onSubmit}
          />
        </div>
      ) : activeTab === 'checklist' ? (
        <div className="checklist-panel checklist-command-center">
          <div className="checklist-hero">
            <div>
              <p className="eyebrow">{language === 'ms' ? 'Checklist planner' : 'Checklist planner'}</p>
              {isEditingChecklistTitle ? (
                <input
                  className="checklist-title-input"
                  value={checklistTitleDraft}
                  onChange={(e) => setChecklistTitleDraft(e.target.value)}
                  onBlur={() => {
                    const t = checklistTitleDraft.trim();
                    if (t) setChecklistTitle(t);
                    setIsEditingChecklistTitle(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const t = checklistTitleDraft.trim();
                      if (t) setChecklistTitle(t);
                      setIsEditingChecklistTitle(false);
                    }
                    if (e.key === 'Escape') setIsEditingChecklistTitle(false);
                  }}
                  autoFocus
                  aria-label={language === 'ms' ? 'Nama checklist' : 'Checklist name'}
                />
              ) : (
                <h3
                  className="checklist-title-editable"
                  title={language === 'ms' ? 'Klik untuk tukar nama' : 'Click to rename'}
                  onClick={() => { setChecklistTitleDraft(displayChecklistTitle); setIsEditingChecklistTitle(true); }}
                >
                  {displayChecklistTitle}
                  <span className="checklist-title-edit-hint" aria-hidden="true">✏️</span>
                </h3>
              )}
              <p>
                {language === 'ms'
                  ? 'Ikut timeline ikut fasa — dari 6 bulan sebelum sampai hari nikah. Selesaikan setiap fasa satu per satu.'
                  : 'Follow the phase-by-phase timeline — from 6 months out to the wedding day. Clear each phase one at a time.'}
              </p>
            </div>
            <div className="checklist-hero-progress">
              {daysLeft !== null && daysLeft >= 0 ? (
                <span className="checklist-hero-countdown">
                  {daysLeft} {language === 'ms' ? 'hari lagi' : 'days to go'}
                </span>
              ) : null}
              <strong>{scopedProgress}%</strong>
              <span>
                {scopedCompletedCount}/{scopedTotalCount} {copy.done}
                {checklistCategoryFilter ? ` · ${getCategoryLabel(checklistCategoryFilter, language)}` : ''}
              </span>
              <div className="checklist-progress-line" aria-label={`${scopedCompletedCount} of ${scopedTotalCount} checklist items done`}>
                <span style={{ width: `${scopedProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="checklist-stat-row" aria-label="Checklist health summary">
            <article>
              <span>{language === 'ms' ? 'Seterusnya' : 'Next actions'}</span>
              <strong>{scopedNextChecklistItems.length}</strong>
              <p>{language === 'ms' ? 'perlu perhatian' : 'need attention'}</p>
            </article>
            <article>
              <span>{language === 'ms' ? 'Urgent' : 'Urgent'}</span>
              <strong>{urgentChecklistCount}</strong>
              <p>{language === 'ms' ? 'due dekat' : 'close deadlines'}</p>
            </article>
            <article>
              <span>{language === 'ms' ? 'Bulan ini' : 'This month'}</span>
              <strong>{dueThisMonthChecklistCount}</strong>
              <p>{language === 'ms' ? 'belum selesai' : 'still open'}</p>
            </article>
            <article>
              <span>{language === 'ms' ? 'Sedang diurus' : 'In progress'}</span>
              <strong>{checklistStatusOptions.find((option) => option.value === 'in-progress')?.count || 0}</strong>
              <p>{language === 'ms' ? 'aktif sekarang' : 'active now'}</p>
            </article>
          </div>

          <div className="checklist-toolbelt">
            <div className="checklist-view-tabs" role="tablist" aria-label="Checklist views">
              {checklistViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={checklistView === option.value}
                  className={checklistView === option.value ? 'active' : ''}
                  onClick={() => setChecklistView(option.value)}
                >
                  {option.label}
                  <span>{option.count}</span>
                </button>
              ))}
            </div>
            <div className="checklist-export-actions">
              {checklistItems.length > 0 ? (
                <button
                  type="button"
                  className={`checklist-select-mode-btn${checklistSelectMode ? ' active' : ''}`}
                  aria-pressed={checklistSelectMode}
                  onClick={() => {
                    setChecklistSelectMode((v) => !v);
                    setSelectedChecklistIds(new Set());
                  }}
                >
                  <svg className="checklist-select-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
                    <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {checklistSelectMode
                    ? (language === 'ms' ? 'Selesai pilih' : 'Done')
                    : (language === 'ms' ? 'Pilih item' : 'Select')}
                </button>
              ) : null}
              <details className="checklist-export-menu">
                <summary aria-label={language === 'ms' ? 'Eksport checklist' : 'Export checklist'}>
                  {language === 'ms' ? 'Eksport' : 'Export'}
                </summary>
                <div>
                  <button type="button" onClick={copyChecklist} disabled={checklistItems.length === 0}>{language === 'ms' ? 'Salin teks' : 'Copy text'}</button>
                  <button type="button" onClick={() => exportChecklist('txt')} disabled={checklistItems.length === 0}>{language === 'ms' ? 'Muat turun .txt' : 'Download .txt'}</button>
                  <button type="button" onClick={() => exportChecklist('json')} disabled={checklistItems.length === 0}>{language === 'ms' ? 'Muat turun .json' : 'Download .json'}</button>
                  <button type="button" onClick={printChecklist} disabled={checklistItems.length === 0}>{language === 'ms' ? 'Cetak' : 'Print'}</button>
                </div>
              </details>
            </div>
          </div>

          {checklistItems.length > 0 && checklistCategoryChips.length > 1 ? (
            <div className="checklist-category-filter" role="group" aria-label={language === 'ms' ? 'Tapis ikut kategori' : 'Filter by category'}>
              <button
                type="button"
                className={checklistCategoryFilter === null ? 'active' : ''}
                aria-pressed={checklistCategoryFilter === null}
                onClick={() => setChecklistCategoryFilter(null)}
              >
                {language === 'ms' ? 'Semua' : 'All'}
                <span>{checklistItems.length}</span>
              </button>
              {checklistCategoryChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  className={checklistCategoryFilter === chip.id ? 'active' : ''}
                  aria-pressed={checklistCategoryFilter === chip.id}
                  onClick={() => setChecklistCategoryFilter((current) => (current === chip.id ? null : chip.id))}
                >
                  {chip.label}
                  <span>{chip.done}/{chip.total}</span>
                </button>
              ))}
            </div>
          ) : null}

          {checklistSelectMode && selectedChecklistIds.size > 0 ? (
            <div className="checklist-bulk-bar">
              <span>
                {selectedChecklistIds.size} {language === 'ms' ? 'dipilih' : 'selected'}
              </span>
              <button type="button" className="checklist-bulk-done" onClick={bulkMarkChecklistDone}>
                {language === 'ms' ? '✓ Tandakan selesai' : '✓ Mark done'}
              </button>
              <button type="button" className="checklist-bulk-delete" onClick={bulkRemoveChecklist}>
                {language === 'ms' ? 'Buang' : 'Delete'}
              </button>
            </div>
          ) : null}

          <div className="checklist-template-row" aria-label="Checklist generator">
            <span>{language === 'ms' ? 'Checklist peribadi' : 'Personalized checklist'}</span>
            <button type="button" className="checklist-generate-btn" onClick={() => setSetupOpen(true)}>
              <span aria-hidden="true">✨</span>
              {checklistItems.length > 0
                ? (language === 'ms' ? 'Jana semula ikut majlis' : 'Regenerate from setup')
                : (language === 'ms' ? 'Jana checklist ikut majlis anda' : 'Generate from your wedding')}
            </button>
          </div>

          {loading && checklistItems.length === 0 ? <p className="typing">{copy.creating}</p> : null}

          {checklistItems.length > 0 ? (
            <div className="checklist-workspace-grid">
              <section className="checklist-main-list">
                {checklistView === 'next' ? (
                  <>
                    <div className="checklist-section-heading">
                      <div>
                        <h4>{language === 'ms' ? 'Apa perlu dibuat sekarang' : 'What to do next'}</h4>
                        <p>{language === 'ms' ? 'Disusun ikut deadline, urgency, dan status.' : 'Sorted by deadline, urgency, and progress status.'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('chat');
                          setInput(checklistNextPrompt);
                        }}
                      >
                        {copy.askAi}
                      </button>
                    </div>
                    {checklistFocusGroups.length > 0 ? (
                      <div className="checklist-focus-stack">
                        {checklistFocusGroups.map((group) => (
                          <section key={group.key} className="checklist-focus-group">
                            <div className="checklist-focus-header">
                              <div>
                                <h5>{group.title}</h5>
                                <p>{group.helper}</p>
                              </div>
                              <span>{group.items.length}</span>
                            </div>
                            <ul className="checklist-task-list">
                              {group.items.map((item) => renderChecklistTask(item))}
                            </ul>
    </section>
                        ))}
                      </div>
                    ) : (
                      <ul className="checklist-task-list">
                        {scopedOpenChecklistItems.slice(0, 6).map((item) => renderChecklistTask(item))}
                      </ul>
                    )}
                  </>
                ) : null}

                {checklistView === 'timeline' ? (
                  <div className="mm-timeline">
                    {checklistTimeline.map((phase, index) => (
                      <details
                        key={phase.key}
                        className={`mm-timeline-phase is-${phase.state}`}
                        open={phase.defaultOpen}
                      >
                        <summary className="mm-timeline-summary">
                          <span
                            className="mm-timeline-node"
                            style={{ ['--pct' as string]: phase.pct }}
                            aria-hidden="true"
                          >
                            <span className="mm-timeline-node-inner">
                              {phase.state === 'done' ? '✓' : index + 1}
                            </span>
                          </span>
                          <span className="mm-timeline-headtext">
                            <span className="mm-timeline-phase-name">{phase.label}</span>
                            <span className="mm-timeline-meta">
                              {phase.dateLabel ? (
                                <span className="mm-timeline-date">
                                  {language === 'ms' ? 'Sasaran' : 'Target'}: {phase.dateLabel}
                                </span>
                              ) : null}
                              <span className="mm-timeline-count">
                                {phase.done}/{phase.total} {copy.done}
                              </span>
                              {phase.state === 'overdue' ? (
                                <span className="mm-timeline-flag overdue">
                                  {phase.overdueCount} {language === 'ms' ? 'lewat' : 'overdue'}
                                </span>
                              ) : phase.state === 'active' ? (
                                <span className="mm-timeline-flag active">
                                  {language === 'ms' ? 'Fokus sekarang' : 'Focus now'}
                                </span>
                              ) : phase.state === 'done' ? (
                                <span className="mm-timeline-flag done">
                                  {language === 'ms' ? 'Selesai' : 'Done'}
                                </span>
                              ) : null}
                            </span>
                          </span>
                          <span className="mm-timeline-pct" aria-hidden="true">{phase.pct}%</span>
                          <span className="mm-timeline-caret" aria-hidden="true" />
                        </summary>
                        <ul className="checklist-task-list">
                          {phase.items.map((item) => renderChecklistTask(item, { compact: true }))}
                        </ul>
                      </details>
                    ))}
                  </div>
                ) : null}

                {checklistView === 'completed' ? (
                  <>
                    <div className="checklist-section-heading">
                      <div>
                        <h4>{language === 'ms' ? 'Task selesai' : 'Completed tasks'}</h4>
                        <p>{language === 'ms' ? 'Ruang ini simpan momentum dan bukti progress.' : 'This keeps momentum and proof of progress visible.'}</p>
                      </div>
                    </div>
                    {completedChecklistItems.length > 0 ? (
                      <ul className="checklist-task-list">
                        {completedChecklistItems.map((item) => renderChecklistTask(item, { compact: true }))}
                      </ul>
                    ) : (
                      <div className="empty-state action-empty">
                        <strong>{language === 'ms' ? 'Belum ada task selesai.' : 'No completed tasks yet.'}</strong>
                        <span>{language === 'ms' ? 'Tick task pertama untuk mula nampak progress.' : 'Tick your first task to start seeing progress.'}</span>
                      </div>
                    )}
                  </>
                ) : null}
              </section>

              <aside className="checklist-side-panel" aria-label="Checklist assistant">
                <div className="checklist-side-card">
                  <span>{language === 'ms' ? 'Cadangan AI' : 'AI suggestions'}</span>
                  <strong>{scopedNextChecklistItems[0] ? getItemText(scopedNextChecklistItems[0]) : language === 'ms' ? 'Bina checklist pertama' : 'Create your first checklist'}</strong>
                  <p>
                    {scopedNextChecklistItems[0]
                      ? (language === 'ms' ? 'Task ini paling sesuai dibuat sekarang berdasarkan deadline dan status.' : 'This is the best next task based on deadline and status.')
                      : (language === 'ms' ? 'Jana checklist peribadi melalui wizard, atau minta AI bina ikut tarikh majlis.' : 'Generate a personalized checklist with the wizard, or ask AI to build one from your wedding date.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('chat');
                      setInput(checklistNextPrompt);
                    }}
                  >
                    {language === 'ms' ? 'Bantu task ini' : 'Help with this task'}
                  </button>
                </div>

                {recommendedMissingItems.length > 0 ? (
                  <div className="checklist-recommend-card">
                    <span>{language === 'ms' ? 'Cadangan untuk ditambah' : 'Recommended to add'}</span>
                    <p>
                      {language === 'ms'
                        ? 'Berdasarkan majlis anda, task ini biasa diperlukan tapi belum ada dalam checklist.'
                        : 'Based on your wedding, these are commonly needed but not yet on your checklist.'}
                    </p>
                    <ul>
                      {recommendedMissingItems.map((item) => (
                        <li key={item.id}>
                          <div className="checklist-recommend-text">
                            <strong>{getItemText(item)}</strong>
                            {item.phase ? <small>{getItemPhase(item)}</small> : null}
                          </div>
                          <button
                            type="button"
                            className="checklist-recommend-add"
                            onClick={() => addRecommendedItem(item)}
                            aria-label={language === 'ms' ? `Tambah ${getItemText(item)}` : `Add ${getItemText(item)}`}
                          >
                            +
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="checklist-recommend-ai"
                      onClick={() => {
                        setActiveTab('chat');
                        setInput(
                          language === 'ms'
                            ? 'Bagi lagi idea task checklist yang saya mungkin terlepas untuk majlis saya'
                            : 'Suggest more checklist tasks I might have missed for my wedding'
                        );
                      }}
                    >
                      {language === 'ms' ? 'Tanya AI untuk lebih idea' : 'Ask AI for more ideas'}
                    </button>
                  </div>
                ) : null}

                <form className="checklist-form checklist-quick-add" onSubmit={addChecklistItem}>
                  <label>
                    <span>{language === 'ms' ? 'Tambah task cepat' : 'Quick add task'}</span>
                    <input
                      value={newChecklistItem}
                      onChange={(event) => setNewChecklistItem(event.target.value)}
                      placeholder={copy.addItem}
                      aria-label="New checklist item"
                    />
                  </label>
                  <button type="submit" disabled={newChecklistItem.trim().length === 0}>
                    {copy.add}
                  </button>
                </form>
              </aside>
            </div>
          ) : !loading ? (
            <div className="checklist-empty-modern">
              <span className="checklist-empty-icon" aria-hidden="true"><MenuIcon name="checklist" /></span>
              <strong>{copy.emptyChecklist}</strong>
              <p>
                {language === 'ms'
                  ? 'Jawab beberapa soalan ringkas dan MajlisMate akan jana checklist peribadi ikut tarikh, negeri, format, dan jumlah tetamu majlis anda.'
                  : 'Answer a few quick questions and MajlisMate will generate a personalized checklist from your date, state, format, and guest count.'}
              </p>
              <div>
                <button type="button" onClick={createDefaultChecklist}>{checklistEmptyActionText}</button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('chat');
                    setInput(language === 'ms' ? 'Buat checklist majlis saya ikut tarikh dan bajet' : 'Create my wedding checklist from my date and budget');
                  }}
                >
                  {copy.askAi}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : activeTab === 'calendar' ? (
        <div className={`calendar-panel calendar-view-${calendarView}`}>
          <div className="calendar-toolbar">
            <div>
              <p className="eyebrow">Wedding calendar</p>
              <h3>{monthLabel(calendarMonth)}</h3>
              <p>Schedule vendor follow-ups, payment reminders, fittings, and final confirmations.</p>
            </div>
            <div className="calendar-actions">
              <button type="button" onClick={() => changeCalendarMonth(-1)} aria-label="Previous month">
                &lt;
              </button>
              <button type="button" onClick={() => setCalendarMonth(new Date())}>
                Today
              </button>
              {plannerProfile.majlisDate ? (
                <button
                  type="button"
                  onClick={() => {
                    const weddingDate = new Date(`${plannerProfile.majlisDate}T00:00:00`);
                    setCalendarMonth(new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 1));
                    setSelectedDate(plannerProfile.majlisDate);
                    setAppointmentDraft((current) => ({ ...current, date: plannerProfile.majlisDate }));
                  }}
                >
                  Wedding day
                </button>
              ) : null}
              <button type="button" onClick={() => changeCalendarMonth(1)} aria-label="Next month">
                &gt;
              </button>
              <button type="button" className="utility-action" onClick={addAllAppointmentsToPhoneCalendar} title="Download a calendar file for all appointments">
                Download calendar
              </button>
              <button type="button" className="primary-action" onClick={startAppointmentAssistant}>
                Schedule with AI
              </button>
            </div>
          </div>

          <div className="calendar-overview-row" aria-label="Calendar overview">
            <article>
              <span>This month</span>
              <strong>{selectedMonthAppointments.length}</strong>
              <p>appointments</p>
            </article>
            <article>
              <span>Confirmed</span>
              <strong>{selectedMonthConfirmed}</strong>
              <p>locked in</p>
            </article>
            <article>
              <span>Open tasks</span>
              <strong>{selectedMonthOpen}</strong>
              <p>need follow-up</p>
            </article>
            <article>
              <span>Next</span>
              <strong>{nextAppointment ? nextAppointment.date.slice(5) : 'None'}</strong>
              <p>{nextAppointment ? nextAppointment.title : 'no upcoming item'}</p>
            </article>
          </div>

          <div className="calendar-viewbar" aria-label="Calendar view">
            <div className="calendar-view-switch" role="tablist" aria-label="Calendar display">
              <button
                type="button"
                role="tab"
                aria-selected={calendarView === 'month'}
                className={calendarView === 'month' ? 'active' : ''}
                onClick={() => setCalendarView('month')}
              >
                Month
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={calendarView === 'agenda'}
                className={calendarView === 'agenda' ? 'active' : ''}
                onClick={() => setCalendarView('agenda')}
              >
                Agenda
              </button>
            </div>
            <div className="calendar-agenda-filter" aria-label="Agenda filter">
              <button
                type="button"
                className={calendarAgendaFilter === 'upcoming' ? 'active' : ''}
                onClick={() => setCalendarAgendaFilter('upcoming')}
              >
                Upcoming
              </button>
              <button
                type="button"
                className={calendarAgendaFilter === 'all' ? 'active' : ''}
                onClick={() => setCalendarAgendaFilter('all')}
              >
                All
              </button>
            </div>
          </div>

          <div className="calendar-suggestion-strip" aria-label="Calendar suggestions">
            {calendarSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setActiveTab('calendar');
                  setIsContextAssistantOpen(true);
                  setAppointmentAssistantActive(true);
                  setMenuInputs((current) => ({
                    ...current,
                    calendar: `${suggestion} on ${selectedDate} at `
                  }));
                }}
              >
                <span>Plan with AI</span>
                {suggestion}
              </button>
            ))}
          </div>

          <section className="mobile-calendar-agenda" aria-label="Mobile calendar agenda">
            <div className="mobile-agenda-header">
              <div>
                <p className="eyebrow">{language === 'ms' ? 'Agenda' : 'Agenda'}</p>
                <h4>{language === 'ms' ? 'Perkara terdekat' : 'Coming up'}</h4>
              </div>
              <button type="button" onClick={startAppointmentAssistant}>
                {language === 'ms' ? 'Tambah' : 'Add'}
              </button>
            </div>
            {plannerProfile.majlisDate ? (
              <button
                type="button"
                className="mobile-agenda-card wedding"
                onClick={() => {
                  const weddingDate = new Date(`${plannerProfile.majlisDate}T00:00:00`);
                  setCalendarMonth(new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 1));
                  setSelectedDate(plannerProfile.majlisDate);
                }}
              >
                <span>{language === 'ms' ? 'Hari majlis' : 'Wedding day'}</span>
                <strong>{plannerProfile.coupleName || [plannerProfile.groomName, plannerProfile.brideName].filter(Boolean).join(' & ') || 'MajlisMate'}</strong>
                <small>{plannerProfile.majlisDate}</small>
              </button>
            ) : null}
            {selectedMonthAppointments.slice(0, 4).map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                className="mobile-agenda-card"
                onClick={() => {
                  setSelectedDate(appointment.date);
                  setAppointmentDraft((current) => ({ ...current, date: appointment.date }));
                }}
              >
                <span>{appointment.date}{appointment.time ? `, ${appointment.time}` : ''}</span>
                <strong>{appointment.title}</strong>
                <small>{appointment.vendor || appointment.location || appointment.status || 'Planned'}</small>
              </button>
            ))}
            {selectedMonthAppointments.length === 0 && !plannerProfile.majlisDate ? (
              <div className="mobile-agenda-empty">
                <strong>{language === 'ms' ? 'Belum ada jadual.' : 'No schedule yet.'}</strong>
                <span>{language === 'ms' ? 'Tambah appointment vendor atau tarikh majlis.' : 'Add a vendor appointment or wedding date.'}</span>
              </div>
            ) : null}
          </section>

          <section className="calendar-agenda-summary" aria-label="Calendar agenda summary">
            <div className="agenda-summary-row">
              <article>
                <span>{calendarAgendaFilter === 'upcoming' ? 'Upcoming' : 'All items'}</span>
                <strong>{calendarAgendaItems.length}</strong>
              </article>
              <article>
                <span>Confirmed</span>
                <strong>{calendarAgendaItems.filter((appointment) => appointment.status === 'confirmed').length}</strong>
              </article>
              <article>
                <span>Need time</span>
                <strong>{agendaNeedsTime}</strong>
              </article>
              <article>
                <span>Next</span>
                <strong>{calendarAgendaItems[0]?.date.slice(5) || 'None'}</strong>
              </article>
            </div>

            {calendarAgendaGroups.length > 0 ? (
              <div className="calendar-agenda-list">
                {calendarAgendaGroups.map((group) => (
                  <section key={group.key} className="calendar-agenda-month">
                    <h4>{group.label}</h4>
                    <div>
                      {group.items.map((appointment) => {
                        const appointmentDate = new Date(`${appointment.date}T00:00:00`);
                        const dayLabel = appointmentDate.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-MY', {
                          day: 'numeric',
                          weekday: 'short'
                        });

                        return (
                          <button
                            key={appointment.id}
                            type="button"
                            className={`calendar-agenda-item ${appointment.id === 'wedding-day' ? 'wedding' : appointment.status || 'planned'}`}
                            onClick={() => {
                              setSelectedDate(appointment.date);
                              setCalendarMonth(new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1));
                              setAppointmentDraft((current) => ({ ...current, date: appointment.date }));
                              setCalendarView('month');
                            }}
                          >
                            <span>{dayLabel}</span>
                            <strong>{appointment.title}</strong>
                            <small>{appointment.time || appointment.vendor || appointment.location || appointment.status || 'Time not set'}</small>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="empty-state action-empty">
                <strong>No calendar items yet.</strong>
                <span>Add appointments or set your wedding date to build a year view.</span>
                <button type="button" onClick={startAppointmentAssistant}>Schedule with AI</button>
              </div>
            )}
          </section>

          <div className="calendar-workspace">
            <div className="calendar-grid" aria-label={`${monthLabel(calendarMonth)} calendar`}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="calendar-weekday">
                  {day}
                </div>
              ))}
              {calendarDays.map((day) => {
                const dayAppointments = appointments.filter((appointment) => appointment.date === day.key);
                const isWeddingDay = Boolean(plannerProfile.majlisDate && day.key === plannerProfile.majlisDate);
                const dayItemCount = dayAppointments.length + (isWeddingDay ? 1 : 0);
                const dayStatus = isWeddingDay
                  ? 'wedding'
                  : dayAppointments.some((appointment) => appointment.status === 'confirmed')
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
                    {dayItemCount > 0 ? (
                      <span className={`calendar-count ${dayStatus}`}>
                        <strong>{dayItemCount}</strong>
                        <small>{dayItemCount === 1 ? 'item' : 'items'}</small>
                      </span>
                    ) : null}
                    {isWeddingDay ? (
                      <span className="appointment-chip wedding">
                        {language === 'ms' ? 'Hari majlis' : 'Wedding day'}
                      </span>
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
                <span>{selectedDateAppointments.length + (isSelectedWeddingDay ? 1 : 0)} item{selectedDateAppointments.length + (isSelectedWeddingDay ? 1 : 0) === 1 ? '' : 's'}</span>
              </div>

              {pendingAppointment ? (
                <article className="appointment-confirm-card">
                  <p className="eyebrow">Review before adding</p>
                  <h5>{pendingAppointment.title}</h5>
                  <dl>
                    <div>
                      <dt>Date</dt>
                      <dd>{pendingAppointment.date}</dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>{pendingAppointment.time || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Vendor</dt>
                      <dd>{pendingAppointment.vendor || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{pendingAppointment.location || 'Not set'}</dd>
                    </div>
                  </dl>
                  <div className="appointment-confirm-actions">
                    <button type="button" className="primary-action" onClick={confirmPendingAppointment}>
                      Confirm
                    </button>
                    <button type="button" onClick={editPendingAppointment}>
                      Edit
                    </button>
                    <button type="button" onClick={() => setPendingAppointment(null)}>
                      Cancel
                    </button>
                  </div>
                </article>
              ) : null}

              {isSelectedWeddingDay && weddingDayAppointment ? (
                <article className="agenda-card wedding">
                  <div className="agenda-card-top">
                    <div>
                      <strong>{language === 'ms' ? 'Hari majlis' : 'Wedding day'}</strong>
                      <p>{plannerProfile.coupleName || [plannerProfile.groomName, plannerProfile.brideName].filter(Boolean).join(' & ') || 'MajlisMate'}</p>
                    </div>
                    <span>{language === 'ms' ? 'Majlis' : 'Wedding'}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>Date</dt>
                      <dd>{plannerProfile.majlisDate}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{plannerProfile.negeri || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt>Guests</dt>
                      <dd>{plannerProfile.guestTarget ? `${plannerProfile.guestTarget} pax` : 'Not set'}</dd>
                    </div>
                  </dl>
                  <div className="agenda-actions">
                    <button type="button" className="utility-action" onClick={() => addAppointmentToPhoneCalendar(weddingDayAppointment)} title="Download this event as a calendar file">
                      Add to calendar
                    </button>
                    <button type="button" onClick={() => selectTab('dashboard')}>
                      Edit wedding details
                    </button>
                  </div>
                </article>
              ) : null}

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
                        <button type="button" onClick={() => startEditingAppointment(appointment)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => updateAppointmentStatus(appointment.id, 'planned')}>
                          Planned
                        </button>
                        <button type="button" onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}>
                          Confirmed
                        </button>
                        <button type="button" onClick={() => updateAppointmentStatus(appointment.id, 'done')}>
                          Done
                        </button>
                        <button type="button" className="utility-action" onClick={() => addAppointmentToPhoneCalendar(appointment)} title="Download this event as a calendar file">
                          Add to calendar
                        </button>
                        <button type="button" onClick={() => removeAppointment(appointment.id)}>
                          Remove
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state action-empty">
                  <strong>No appointment on this day.</strong>
                  <button type="button" onClick={startAppointmentAssistant}>Schedule with AI</button>
                </div>
              )}

              <form className={`appointment-form ${editingAppointmentId ? 'editing' : ''}`} onSubmit={addManualAppointment}>
                <div className="appointment-form-heading">
                  <div>
                    <p className="eyebrow">{editingAppointmentId ? 'Edit appointment' : 'Add manually'}</p>
                    <h5>{selectedDateLabel}</h5>
                  </div>
                  {editingAppointmentId ? (
                    <button type="button" onClick={cancelEditingAppointment}>
                      Cancel
                    </button>
                  ) : null}
                </div>
                <input
                  value={appointmentDraft.title}
                  onChange={(event) => setAppointmentDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Appointment title"
                  aria-label="Appointment title"
                />
                <div className="appointment-form-row">
                  <span className="appointment-native-field date">
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
                  </span>
                  <span className="appointment-native-field time">
                    <input
                      type="time"
                      value={appointmentDraft.time}
                      onChange={(event) => setAppointmentDraft((current) => ({ ...current, time: event.target.value }))}
                      aria-label="Appointment time"
                    />
                  </span>
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
                  {editingAppointmentId ? 'Save changes' : 'Save appointment'}
                </button>
              </form>
            </aside>
          </div>

        </div>
      ) : activeTab === 'budget' ? (
        <BudgetPanel
          budgetItems={budgetItems}
          budgetSuggestions={budgetSuggestions}
          plannerProfile={plannerProfile}
          budgetDraft={budgetDraft}
          setBudgetDraft={setBudgetDraft}
          addBudgetItem={addBudgetItem}
          addSuggestedBudgetItem={addSuggestedBudgetItem}
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
          importGuestsCsv={importGuestsCsv}
          confirmedGuests={confirmedGuests}
          pendingGuests={pendingGuests}
          declinedGuests={declinedGuests}
          language={language}
          coupleNames={plannerProfile.coupleName || [plannerProfile.groomName, plannerProfile.brideName].filter(Boolean).join(' & ')}
          weddingDate={plannerProfile.majlisDate
            ? new Date(`${plannerProfile.majlisDate}T00:00:00`).toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
            : ''}
          venue={plannerProfile.venueName || ''}
          time={plannerProfile.majlisTime || ''}
          location={plannerProfile.negeri || ''}
          contact={plannerProfile.keyContact || ''}
          rsvpFormUrl={rsvpFormUrl}
          onChangeRsvpFormUrl={(url) => {
            setRsvpFormUrl(url);
            setStatusMessage(language === 'ms' ? 'Pautan RSVP disimpan.' : 'RSVP link saved.');
          }}
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
          askVendorQuestions={askVendorQuestions}
          askVendorComparison={askVendorComparison}
          addVendorToBudget={addVendorToBudget}
          language={language}
          defaultNegeri={plannerProfile.negeri}
          onSearchNearby={searchNearbyVendors}
          searchLoading={vendorSearchLoading}
          searchInfo={vendorSearchInfo}
        />
      ) : null}
        </div>
        {activeMenuTab ? (
          <>
            <button
              type="button"
              className="assistant-drawer-backdrop"
              aria-label="Close context assistant"
              onClick={() => setIsContextAssistantOpen(false)}
            />
            <aside className="planner-assistant-rail assistant-drawer" aria-label="Menu assistant">
              <div className="assistant-drawer-header">
                <div>
                  <span><RobotIcon /> {language === 'ms' ? 'Planner AI' : 'Planner AI'}</span>
                  <strong>{menuAssistantPrompts[activeMenuTab].title}</strong>
                </div>
                <button type="button" aria-label="Close context assistant" onClick={() => setIsContextAssistantOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              <MenuAssistant
                activeMenuTab={activeMenuTab}
                messages={menuMessages[activeMenuTab]}
                input={menuInputs[activeMenuTab]}
                loading={menuLoading === activeMenuTab}
                insights={contextInsights[activeMenuTab]}
                onOpenMainChat={() => {
                  setIsContextAssistantOpen(false);
                  setActiveTab('chat');
                }}
                onQuickPrompt={(prompt) => setMenuAssistantPrompt(activeMenuTab, prompt)}
                onInputChange={(value) => setMenuInputs((current) => ({ ...current, [activeMenuTab]: value }))}
                onSubmit={(event) => submitMenuAssistant(event, activeMenuTab)}
              />
            </aside>
          </>
        ) : null}
        {isChatHistoryOpen ? (
          <>
            <button
              type="button"
              className="chat-history-backdrop"
              aria-label="Close chat history"
              onClick={() => setIsChatHistoryOpen(false)}
            />
            <aside className="chat-history-drawer" aria-label="Chat history">
              <div className="chat-history-header">
                <div>
                  <p className="eyebrow">{language === 'ms' ? 'Chat history' : 'Chat history'}</p>
                  <h3>{language === 'ms' ? 'Perbualan lama' : 'Previous chats'}</h3>
                </div>
                <button type="button" aria-label="Close chat history" onClick={() => setIsChatHistoryOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              <div className="chat-history-list">
                {chatSessions.length > 0 ? (
                  chatSessions.map((session) => (
                    <article key={session.id} className={session.id === currentChatId ? 'active' : ''}>
                      <button type="button" onClick={() => openChatSession(session)}>
                        <strong>{session.title}</strong>
                        <span>
                          {new Date(session.updatedAt).toLocaleString(language === 'ms' ? 'ms-MY' : 'en-MY', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="chat-history-delete"
                        aria-label={`Delete ${session.title}`}
                        onClick={() => deleteChatSession(session.id)}
                      >
                        <TrashIcon />
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="empty-state action-empty">
                    <strong>{language === 'ms' ? 'Belum ada chat history.' : 'No chat history yet.'}</strong>
                    <span>{language === 'ms' ? 'Mula chat dan ia akan disimpan di sini.' : 'Start chatting and conversations will appear here.'}</span>
                  </div>
                )}
              </div>
            </aside>
          </>
        ) : null}
        {isSettingsOpen ? (
          <>
            <button
              type="button"
              className="settings-drawer-backdrop"
              aria-label="Close couple profile"
              onClick={() => setIsSettingsOpen(false)}
            />
            <aside className="settings-drawer" aria-label="Couple profile and planner settings">
              <div className="settings-drawer-header">
                <div>
                  <p className="eyebrow">{language === 'ms' ? 'Profil pasangan' : 'Couple profile'}</p>
                  <h3>{language === 'ms' ? 'Tetapan MajlisMate' : 'MajlisMate settings'}</h3>
                </div>
                <button type="button" className="settings-close-button" onClick={() => setIsSettingsOpen(false)} aria-label="Close settings">
                  <CloseIcon />
                </button>
              </div>

              <form
                className="settings-form"
                onSubmit={(event) => {
                  completeOnboarding(event);
                  setIsSettingsOpen(false);
                }}
              >
                <div className="settings-section">
                  <span>{language === 'ms' ? 'Maklumat utama' : 'Core details'}</span>
                  <label>
                    Couple display name
                    <input
                      value={plannerProfile.coupleName}
                      onChange={(event) => setPlannerProfile((current) => ({ ...current, coupleName: event.target.value }))}
                      placeholder="Aiman & Nabila"
                    />
                  </label>
                  <div className="settings-two-column">
                    <label>
                      Groom
                      <input
                        value={plannerProfile.groomName}
                        onChange={(event) => setPlannerProfile((current) => ({ ...current, groomName: event.target.value }))}
                        placeholder="Groom name"
                      />
                    </label>
                    <label>
                      Bride
                      <input
                        value={plannerProfile.brideName}
                        onChange={(event) => setPlannerProfile((current) => ({ ...current, brideName: event.target.value }))}
                        placeholder="Bride name"
                      />
                    </label>
                  </div>
                  <div className="settings-two-column">
                    <label>
                      Wedding date
                      <input
                        type="date"
                        value={plannerProfile.majlisDate}
                        onChange={(event) => {
                          setPlannerProfile((current) => ({ ...current, majlisDate: event.target.value }));
                          if (event.target.value) {
                            const weddingDate = new Date(`${event.target.value}T00:00:00`);
                            setCalendarMonth(new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 1));
                            setSelectedDate(event.target.value);
                          }
                        }}
                      />
                    </label>
                    <label>
                      Negeri
                      <select
                        value={plannerProfile.negeri}
                        onChange={(event) => setPlannerProfile((current) => ({ ...current, negeri: event.target.value }))}
                      >
                        <option value="">Select negeri</option>
                        {profileStates.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="settings-two-column">
                    <label>
                      {language === 'ms' ? 'Nama venue' : 'Venue name'}
                      <input
                        value={plannerProfile.venueName || ''}
                        onChange={(event) => setPlannerProfile((current) => ({ ...current, venueName: event.target.value }))}
                        placeholder={language === 'ms' ? 'cth. Dewan Seksyen 21' : 'e.g. Dewan Seksyen 21'}
                      />
                    </label>
                    <label>
                      {language === 'ms' ? 'Masa majlis' : 'Event time'}
                      <input
                        value={plannerProfile.majlisTime || ''}
                        onChange={(event) => setPlannerProfile((current) => ({ ...current, majlisTime: event.target.value }))}
                        placeholder={language === 'ms' ? 'cth. 11:00 pagi - 4:00 petang' : 'e.g. 11:00 am - 4:00 pm'}
                      />
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <span>{language === 'ms' ? 'Perancangan' : 'Planning'}</span>
                  <div className="settings-two-column">
                    <label>
                      Budget target
                      <input
                        type="number"
                        min="0"
                        value={plannerProfile.totalBudget}
                        onChange={(event) => setPlannerProfile((current) => ({ ...current, totalBudget: Number(event.target.value) || 0 }))}
                      />
                    </label>
                    <label>
                      Guest target
                      <input
                        type="number"
                        min="0"
                        value={plannerProfile.guestTarget}
                        onChange={(event) => setPlannerProfile((current) => ({ ...current, guestTarget: Number(event.target.value) || 0 }))}
                      />
                    </label>
                  </div>
                  <label>
                    Wedding style
                    <input
                      value={plannerProfile.weddingStyle}
                      onChange={(event) => setPlannerProfile((current) => ({ ...current, weddingStyle: event.target.value }))}
                      placeholder="Classic, garden, hotel, intimate..."
                    />
                  </label>
                  <label>
                    Key contact
                    <input
                      value={plannerProfile.keyContact}
                      onChange={(event) => setPlannerProfile((current) => ({ ...current, keyContact: event.target.value }))}
                      placeholder="Planner, family contact, or PIC"
                    />
                  </label>
                  <div className="settings-language-row">
                    <span>Language</span>
                    <div className="language-toggle compact" aria-label="Language">
                      {(['ms', 'en'] as AppLanguage[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={language === option ? 'active' : ''}
                          onClick={() => setLanguage(option)}
                          aria-pressed={language === option}
                        >
                          {languageLabels[option]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ThemeToggle language={language} />
                </div>

                <div className="settings-primary-actions">
                  <button type="submit">{language === 'ms' ? 'Simpan profil' : 'Save profile'}</button>
                  <button type="button" onClick={() => {
                    if (plannerProfile.majlisDate) {
                      const weddingDate = new Date(`${plannerProfile.majlisDate}T00:00:00`);
                      setCalendarMonth(new Date(weddingDate.getFullYear(), weddingDate.getMonth(), 1));
                      setSelectedDate(plannerProfile.majlisDate);
                      setActiveTab('calendar');
                      setIsSettingsOpen(false);
                    }
                  }} disabled={!plannerProfile.majlisDate}>
                    {language === 'ms' ? 'Lihat hari majlis' : 'View wedding day'}
                  </button>
                </div>
              </form>
            </aside>
          </>
        ) : null}
        {isCommandOpen ? (
          <div className="command-palette-backdrop" role="presentation" onMouseDown={() => setIsCommandOpen(false)}>
            <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command search" onMouseDown={(event) => event.stopPropagation()}>
              <input
                autoFocus
                value={commandQuery}
                onChange={(event) => setCommandQuery(event.target.value)}
                placeholder={language === 'ms' ? 'Cari task, vendor, tetamu, appointment...' : 'Search tasks, vendors, guests, appointments...'}
                aria-label="Command search"
              />
              <div className="command-results">
                {filteredCommandItems.length > 0 ? filteredCommandItems.map((item) => (
                  <button
                    key={`${item.label}-${item.detail}`}
                    type="button"
                    onClick={() => {
                      item.action();
                      setIsCommandOpen(false);
                      setCommandQuery('');
                    }}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </button>
                )) : (
                  <p>{language === 'ms' ? 'Tiada hasil.' : 'No results.'}</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>


      {!isSidebarOpen && !isCommandOpen && !isSettingsOpen && !isContextAssistantOpen && !disambiguation ? (
        <MobileBottomNav
          activeTab={activeTab as MobileTab}
          onChange={function handleMobileNavChange(tab) {
            setActiveTab(tab);
            setIsSidebarOpen(false);
            setIsContextAssistantOpen(false);
          }}
          language={language}
        />
      ) : null}
      <SetupWizardModal
        isReady={checklistProfileReady}
        language={language}
        forceOpen={setupOpen}
        onClose={() => setSetupOpen(false)}
        onComplete={handleSetupComplete}
        initialProfile={plannerProfile}
      />
      {disambiguation && disambiguation.queue.length > 0 ? (
        <div
          className="disambiguation-backdrop"
          role="presentation"
          onMouseDown={() => resolveDisambiguation(null)}
        >
          <div
            className="disambiguation-modal"
            role="dialog"
            aria-modal="true"
            aria-label={disambiguation.queue[0].question}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="disambiguation-question">{disambiguation.queue[0].question}</p>
            <div className="disambiguation-options">
              {disambiguation.queue[0].candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="disambiguation-option"
                  onClick={() => resolveDisambiguation(candidate.id)}
                >
                  <span className="disambiguation-option__label">{candidate.label}</span>
                  {candidate.sublabel ? (
                    <span className="disambiguation-option__sub">{candidate.sublabel}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="disambiguation-skip"
              onClick={() => resolveDisambiguation(null)}
            >
              {language === 'ms' ? 'Langkau' : 'Skip'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
