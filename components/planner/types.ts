export type Source = { id: string; title: string; category: string };

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
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
  note?: string;
};

export type AppLanguage = 'ms' | 'en';

export type PlannerProfile = {
  coupleName: string;
  groomName: string;
  brideName: string;
  majlisDate: string;
  negeri: string;
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
