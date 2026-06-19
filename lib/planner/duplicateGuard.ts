/**
 * Reliable duplicate prevention for planner actions.
 *
 * Before the assistant offers to add something to the planner, we check whether
 * a semantically-similar item already exists. This runs as a deterministic
 * pre-check on the server (route.ts) so it behaves identically whether the
 * answer comes from the real AI backend or the demo fallback — no reliance on
 * the model honouring a prompt rule.
 *
 * Matching is intentionally conservative: a duplicate is only reported when the
 * user's message shares a wedding-domain keyword (e.g. "hiv", "hantaran",
 * "photographer") with an existing checklist task, budget category, or
 * appointment. Generic words never trigger a false match.
 */

import { MM_CLARIFY_OPEN, MM_CLARIFY_CLOSE } from './chatClarify';
import { MM_ACTIONS_OPEN, MM_ACTIONS_CLOSE } from './chatActions';

export type DuplicateCategory = 'checklist' | 'budget' | 'appointment';

export type DuplicateMatch = {
  category: DuplicateCategory;
  /** The existing planner item text the new request collides with. */
  existing: string;
  /** The shared wedding-domain keyword that identifies the topic. */
  topic: string;
};

export type DuplicateGuardContext = {
  checklistSummary?: string;
  budgetSummary?: string[];
  upcomingAppointments?: Array<{ date: string; time?: string; title: string }>;
};

type AppLanguage = 'ms' | 'en';

// Wedding-domain nouns (Malay + English). A shared token from this set between
// the user's message and an existing item is a strong duplicate signal.
const DOMAIN_KEYWORDS = new Set([
  'hiv', 'ujian', 'saringan', 'test', 'thalassemia', 'darah',
  'photographer', 'jurugambar', 'fotografi', 'videographer', 'video', 'foto', 'photo',
  'katering', 'caterer', 'catering', 'makan', 'menu',
  'dewan', 'venue', 'hall', 'banquet',
  'pelamin', 'dekorasi', 'decoration', 'decor', 'florist', 'bunga', 'bouquet',
  'hantaran', 'dulang', 'gubahan',
  'baju', 'gown', 'dress', 'butik', 'tailor', 'jahit', 'fitting',
  'makeup', 'mua', 'andaman', 'mekap',
  'kad', 'invitation', 'jemputan', 'kahwin',
  'doorgift', 'cenderahati', 'cenderamata',
  'kek', 'cake', 'cupcake',
  'kompang', 'band', 'nasyid',
  'nikah', 'akad', 'kursus', 'sppim', 'kppim',
  'honeymoon', 'pakej',
  'rehearsal', 'raptai', 'seating', 'pelan',
  'rsvp', 'transport', 'pengangkutan', 'sewa',
  'fotobooth', 'photobooth', 'live', 'streaming',
  'merisik', 'tunang', 'majlis'
]);

// Generic words that should never count toward a topic match.
const STOPWORDS = new Set([
  'saya', 'aku', 'kami', 'kita', 'nak', 'mahu', 'untuk', 'dengan', 'yang', 'dan',
  'atau', 'ada', 'dah', 'sudah', 'belum', 'kena', 'perlu', 'patut', 'boleh',
  'macam', 'mana', 'bila', 'apa', 'berapa', 'kenapa', 'pada', 'dalam', 'pasal',
  'tentang', 'tolong', 'sila', 'juga', 'lagi', 'ini', 'itu', 'satu', 'dua',
  'the', 'a', 'an', 'to', 'for', 'with', 'and', 'or', 'is', 'are', 'was', 'were',
  'my', 'our', 'your', 'want', 'need', 'should', 'how', 'when', 'what', 'why',
  'about', 'please', 'can', 'could', 'would', 'this', 'that', 'one', 'add',
  'tambah', 'buat', 'create', 'make', 'set', 'new', 'baru'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

/**
 * Return the shared wedding-domain keyword between a user message and an
 * existing item, or null when there is no strong overlap.
 */
function sharedTopic(userMessage: string, existing: string): string | null {
  const existingTokens = new Set(tokenize(existing));
  for (const token of tokenize(userMessage)) {
    if (existingTokens.has(token) && DOMAIN_KEYWORDS.has(token)) {
      return token;
    }
  }
  return null;
}

/** Parse the open checklist task texts out of the derived checklist summary. */
export function parseChecklistItems(checklistSummary?: string): string[] {
  if (!checklistSummary) return [];
  return checklistSummary
    .split('\n')
    .filter((line) => line.trim().startsWith('•'))
    .map((line) =>
      line
        .replace(/^\s*•\s*/, '')
        .split('—')[0]
        .replace(/\[[^\]]*\]/g, '') // strip [phase]
        .trim()
    )
    .filter(Boolean);
}

export function findChecklistDuplicate(
  userMessage: string,
  checklistSummary?: string
): DuplicateMatch | null {
  for (const item of parseChecklistItems(checklistSummary)) {
    const topic = sharedTopic(userMessage, item);
    if (topic) return { category: 'checklist', existing: item, topic };
  }
  return null;
}

export function findBudgetDuplicate(
  userMessage: string,
  budgetSummary?: string[]
): DuplicateMatch | null {
  for (const line of budgetSummary || []) {
    const category = line.split(':')[0]?.trim();
    if (!category) continue;
    const topic = sharedTopic(userMessage, category);
    if (topic) return { category: 'budget', existing: category, topic };
  }
  return null;
}

export function findAppointmentDuplicate(
  userMessage: string,
  appointments?: Array<{ title: string }>
): DuplicateMatch | null {
  for (const appointment of appointments || []) {
    const topic = sharedTopic(userMessage, appointment.title);
    if (topic) return { category: 'appointment', existing: appointment.title, topic };
  }
  return null;
}

/** Full scan across checklist, budget, and appointments. Checklist wins ties. */
export function detectPlannerDuplicate(
  userMessage: string,
  context: DuplicateGuardContext
): DuplicateMatch | null {
  return (
    findChecklistDuplicate(userMessage, context.checklistSummary) ||
    findBudgetDuplicate(userMessage, context.budgetSummary) ||
    findAppointmentDuplicate(userMessage, context.upcomingAppointments)
  );
}

const ADD_INTENT_PATTERN =
  /\b(tambah|add|masuk|masukkan|letak|letakkan|set|setkan|create|book|tempah|include|includekan|daftar|register|wujudkan|simpan)\b/i;

/** Does the message express intent to add/create a concrete planner item? */
export function hasAddIntent(userMessage: string): boolean {
  return ADD_INTENT_PATTERN.test(userMessage);
}

const NEW_ENTRY_PATTERN = /\b(baru|new|another|lain|asing|separate|berasingan)\b/i;

/**
 * The user has already seen the duplicate warning and explicitly asked for a
 * NEW separate entry — bypass the guard so the add proceeds.
 */
export function wantsNewEntry(userMessage: string): boolean {
  return NEW_ENTRY_PATTERN.test(userMessage);
}

const MARK_DONE_PATTERN = /\b(tandakan|mark|done|selesai|siap|complete[d]?)\b/i;

export function wantsMarkDone(userMessage: string): boolean {
  return MARK_DONE_PATTERN.test(userMessage);
}

/** A short, presentable label for the matched topic. */
export function topicLabel(match: DuplicateMatch): string {
  // Prefer the concise existing item text when it is short, else the keyword.
  return match.existing.length <= 40 ? match.existing : match.topic;
}

/**
 * Build the assistant reply that acknowledges the existing item and asks whether
 * the user means the same one or wants a new entry. Includes a MM_CLARIFY block
 * with topic-aware chips so the follow-up message carries the topic forward.
 */
export function buildDuplicateClarifyMessage(
  match: DuplicateMatch,
  language: AppLanguage
): string {
  const label = topicLabel(match);
  if (language === 'en') {
    const where =
      match.category === 'budget'
        ? 'is already a budget category'
        : match.category === 'appointment'
          ? 'is already in your appointments'
          : 'is already in your checklist';
    const options = [
      'Same one — just checking',
      `Add a new "${label}" entry`,
      `Mark "${label}" done`
    ];
    return `"${label}" ${where}. Is this the same item, or did you want to add a new separate entry?\n${MM_CLARIFY_OPEN}\n${JSON.stringify(options)}\n${MM_CLARIFY_CLOSE}`;
  }
  const where =
    match.category === 'budget'
      ? 'sudah ada dalam kategori bajet anda'
      : match.category === 'appointment'
        ? 'sudah ada dalam appointment anda'
        : 'sudah ada dalam checklist anda';
  const options = [
    'Sama je — nak semak',
    `Tambah "${label}" baru`,
    `Tandakan "${label}" selesai`
  ];
  return `"${label}" ${where}. Adakah ini item yang sama, atau nak tambah entri baru yang berasingan?\n${MM_CLARIFY_OPEN}\n${JSON.stringify(options)}\n${MM_CLARIFY_CLOSE}`;
}

/** Build a reply that marks the matched checklist task as done via an action. */
export function buildMarkDoneMessage(match: DuplicateMatch, language: AppLanguage): string {
  const action = JSON.stringify([
    {
      type: 'complete_task',
      text: match.existing,
      reason: language === 'en' ? 'User confirmed it is done' : 'Pengguna sahkan sudah selesai'
    }
  ]);
  const lead =
    language === 'en'
      ? `Done — marking "${topicLabel(match)}" as complete!`
      : `Siap — menandakan "${topicLabel(match)}" sebagai selesai!`;
  return `${lead}\n${MM_ACTIONS_OPEN}\n${action}\n${MM_ACTIONS_CLOSE}`;
}

/** Build a reply confirming the existing task is still open (no action). */
export function buildStillOpenMessage(match: DuplicateMatch | null, language: AppLanguage): string {
  const label = match ? topicLabel(match) : language === 'en' ? 'That task' : 'Task itu';
  if (language === 'en') {
    return `"${label}" is still open in your checklist — not marked done yet. Once you have completed it, mark it done from the checklist panel.`;
  }
  return `"${label}" masih terbuka dalam checklist anda — belum ditandakan selesai. Bila dah siap, tandakan selesai dari panel checklist.`;
}
