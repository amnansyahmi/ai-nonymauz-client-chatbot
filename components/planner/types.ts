export type Source = { id: string; title: string; category: string };

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  actions?: import('../../lib/planner/chatActions').PlannerAction[];
  actionsState?: 'pending' | 'applied' | 'dismissed';
  /** Suggested quick-reply options when the AI asks a clarifying question. */
  clarify?: string[];
  /** Set once the user taps a clarify chip, so the chips collapse. */
  clarifyAnswered?: boolean;
};

export type StreamEvent = {
  type?: 'sources' | 'delta' | 'error' | 'done';
  text?: string;
  error?: string;
  sources?: Source[];
};

export type ChecklistItem = {
  id: string;
  text: string;
  textMs?: string;
  textEn?: string;
  completed: boolean;
  phase?: string;
  phaseMs?: string;
  phaseEn?: string;
  status?: 'not-started' | 'in-progress' | 'done';
  deadline?: string;
  monthBucket?: string;
  monthBucketMs?: string;
  monthBucketEn?: string;
  note?: string;
};

export type AppLanguage = 'ms' | 'en';

export type PlannerProfile = {
  coupleName: string;
  groomName: string;
  brideName: string;
  majlisDate: string;
  negeri: string;
  brideOriginState?: string;
  groomOriginState?: string;
  hasNikah?: boolean;
  hasSanding?: boolean;
  estimatedGuests?: number;
  checklistGeneratedAt?: string;
  totalBudget: number;
  guestTarget: number;
  weddingStyle: string;
  keyContact: string;
  completed: boolean;
};

export type BudgetItem = {
  id: string;
  category: string;
  planned: number;
  actual: number;
  paid: number;
  status: 'not-started' | 'in-progress' | 'done';
  note: string;
};

export type Guest = {
  id: string;
  name: string;
  phone: string;
  group: string;
  pax: number;
  status: 'confirmed' | 'declined' | 'pending';
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  negeri: string;

  minPrice: number;
  maxPrice: number;
  contact: string;
  instagram?: string;
  rating: number;
  note: string;
  // Optional metadata for live results fetched from Google Maps.
  address?: string;
  website?: string;
  mapsUri?: string;
  ratingCount?: number;
  source?: 'directory' | 'google';
};

export type ActivityItem = {
  id: string;
  text: string;
  time: string;
};

export type Appointment = {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  vendor?: string;
  status?: 'planned' | 'confirmed' | 'done';
  note: string;
};

export type AppointmentDraft = {
  title: string;
  date: string;
  time: string;
  location: string;
  vendor: string;
  status: 'planned' | 'confirmed' | 'done';
  note: string;
};

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type CalendarDay = {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

export type ActiveTab = 'dashboard' | 'chat' | 'checklist' | 'calendar' | 'budget' | 'rsvp' | 'vendors';

