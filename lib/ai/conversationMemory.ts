/**
 * Conversation memory — extracts durable facts from chat messages so the
 * assistant can "remember" things the user mentioned in previous
 * sessions (partner name, wedding date, budget, theme, etc.).
 *
 * Pure client-side, no API calls. Facts are regex-based heuristics tuned
 * for Bahasa Melayu + English wedding vocabulary. Stored in localStorage.
 */

export type MemoryFact = {
  key: string;
  value: string;
  capturedAt: string; // ISO date
  source?: string; // first 60 chars of the message we extracted from
};

export type MemoryCategory = 'couple' | 'wedding' | 'budget' | 'venue' | 'theme' | 'guest' | 'preference';

const STORAGE_KEY = 'mm-conversation-memory';

const KEYWORD_PATTERNS: Array<{ category: MemoryCategory; regex: RegExp; key: (m: RegExpMatchArray) => string }> = [
  // Couple
  { category: 'couple', regex: /(?:partner\s*(?:saya|aku|name)?|suami|isteri|tunang)\s+(?:saya\s+)?(?:adalah|ialah|iaitu|nama)?\s*([A-Z][a-zA-Z\u00C0-\u017F']{2,20})/i, key: (m) => `partner:${m[1]}` },
  { category: 'couple', regex: /\b(?:my\s+(?:partner|wife|husband|fiancé|fiancee|fiancé))\s+(?:is\s+)?([A-Z][a-zA-Z']{2,20})/i, key: (m) => `partner:${m[1]}` },
  { category: 'couple', regex: /\bnama\s+(?:saya|aku)\s+(?:adalah\s+)?([A-Z][a-zA-Z\u00C0-\u017F']{2,20})/i, key: (m) => `self:${m[1]}` },

  // Wedding date
  { category: 'wedding', regex: /\b(?:majlis\s+(?:saya\s+)?(?:pada|akan\s+dilangsungkan\s+pada))\s+(\d{1,2}\s+\w+\s+\d{4})/i, key: () => 'wedding:date' },
  { category: 'wedding', regex: /\b(?:tarikh\s+majlis|date\s+is)\s*[:\-]?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/i, key: () => 'wedding:date' },
  { category: 'wedding', regex: /\b(?:wedding\s+(?:date|is\s+on))\s*[:\-]?\s*(\d{1,2}\s+\w+\s+\d{4})/i, key: () => 'wedding:date' },
  { category: 'wedding', regex: /\b(\d{1,2}\s+(?:Januari|Februari|Mac|April|Mei|Jun|Julai|Ogos|September|Oktober|November|Disember)\s+\d{4})\b/i, key: () => 'wedding:date' },

  // Budget
  { category: 'budget', regex: /\bbajet\s+(?:saya\s+)?(?:adalah|sekitar|hampir\s*)?\s*(?:RM|MYR|RM\s*)?(\d{1,3}(?:[,.\s]\d{3})*|\d+)\s*(?:ribu|ribuan|k|puluh\s*ribu)?/i, key: (m) => `budget:total:${m[1]}` },
  { category: 'budget', regex: /\bbudget\s+(?:is|of)?\s*(?:RM|MYR)?\s*(\d{1,3}(?:[,.\s]\d{3})*|\d+)\s*(?:k|thousand)?/i, key: (m) => `budget:total:${m[1]}` },

  // Guest count
  { category: 'guest', regex: /\b(?:jumlah\s+)?tetamu\s+(?:saya\s+)?(?:ada|hampir\s*)?(\d{2,4})\s*(?:orang|pax)?/i, key: (m) => `guest:count:${m[1]}` },
  { category: 'guest', regex: /\b(\d{2,4})\s*(?:guests|pax|pax\s+will\s+attend)/i, key: (m) => `guest:count:${m[1]}` },

  // Venue
  { category: 'venue', regex: /\b(?:dewan|tempat|venue)\s+(?:saya\s+)?(?:adalah|kat|di)\s+([A-Z][\w\s]{2,40})/i, key: (m) => `venue:${m[1].trim()}` },

  // Theme / colour
  { category: 'theme', regex: /\btema\s+(?:saya\s+)?(?:adalah|ialah)\s+([a-zA-Z\u00C0-\u017F\s]{3,30})/i, key: (m) => `theme:${m[1].trim()}` },
  { category: 'theme', regex: /\btheme\s+(?:is|will\s+be)\s+([a-zA-Z\s]{3,30})/i, key: (m) => `theme:${m[1].trim()}` },
  { category: 'theme', regex: /\bwarna\s+(?:utama\s+)?(?:saya\s+)?(?:adalah|ialah)\s+([a-zA-Z\u00C0-\u017F]{3,15})/i, key: (m) => `colour:${m[1].trim()}` },

  // Preferences (length, language)
  { category: 'preference', regex: /\b(?:suka|gemar|prefer|love)\s+(?:jawapan\s+)?(?:yang\s+)?(pendek|singkat|panjang|detail|terperinci|simple|formal|casual|santai|mesra)/i, key: (m) => `preference:${m[1].toLowerCase()}` }
];

function extractFromMessage(content: string, capturedAt: string, source: string): MemoryFact[] {
  const facts: MemoryFact[] = [];
  const seen = new Set<string>();
  for (const { regex, key } of KEYWORD_PATTERNS) {
    const match = content.match(regex);
    if (!match) continue;
    const k = key(match);
    if (seen.has(k)) continue;
    seen.add(k);
    facts.push({ key: k, value: match[1].trim(), capturedAt, source });
  }
  return facts;
}

export function extractFacts(messages: Array<{ role: string; content: string }>): MemoryFact[] {
  const facts: MemoryFact[] = [];
  const seen = new Set<string>();
  for (const message of messages) {
    if (message.role !== 'user') continue;
    const extracted = extractFromMessage(message.content, new Date().toISOString(), message.content.slice(0, 60));
    for (const fact of extracted) {
      if (seen.has(fact.key)) continue;
      seen.add(fact.key);
      facts.push(fact);
    }
  }
  return facts;
}

export function loadMemory(): MemoryFact[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoryFact[]) : [];
  } catch {
    return [];
  }
}

export function saveMemory(facts: MemoryFact[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(facts));
  } catch {
    // Ignore storage errors
  }
}

export function clearMemory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Merge newly-extracted facts with existing ones. Newer facts for the
 * same key replace older ones; if equal, keep the older capturedAt.
 */
export function mergeFacts(existing: MemoryFact[], incoming: MemoryFact[]): MemoryFact[] {
  const map = new Map<string, MemoryFact>();
  for (const fact of existing) map.set(fact.key, fact);
  for (const fact of incoming) {
    map.set(fact.key, fact); // newer always wins — replaces stale value for same key
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Format the memory as a short paragraph the AI can prepend to its
 * context. Falls back to an empty string if no facts.
 */
export function memoryToContext(facts: MemoryFact[], language: 'ms' | 'en' = 'ms'): string {
  if (facts.length === 0) return '';
  const isMs = language === 'ms';
  const lines = facts.slice(0, 10).map((fact) => {
    const [category, key] = fact.key.split(':');
    if (isMs) {
      return `- ${translateCategoryMs(category)}: ${fact.value}`;
    }
    return `- ${translateCategoryEn(category, key)}: ${fact.value}`;
  });
  const header = isMs
    ? 'Apa yang saya tahu tentang user setakat ini:'
    : 'What I know about the user so far:';
  return `${header}\n${lines.join('\n')}`;
}

function translateCategoryMs(category: string): string {
  switch (category) {
    case 'partner': return 'Pasangan';
    case 'self': return 'Nama sendiri';
    case 'wedding': return 'Majlis';
    case 'budget': return 'Bajet';
    case 'guest': return 'Tetamu';
    case 'venue': return 'Tempat';
    case 'theme': return 'Tema';
    case 'colour': return 'Warna';
    case 'preference': return 'Keutamaan';
    default: return category;
  }
}

function translateCategoryEn(category: string, key: string): string {
  switch (category) {
    case 'partner': return key === 'self' ? 'Name' : 'Partner';
    case 'wedding': return 'Wedding';
    case 'budget': return 'Budget';
    case 'guest': return 'Guests';
    case 'venue': return 'Venue';
    case 'theme': return 'Theme';
    case 'colour': return 'Colour';
    case 'preference': return 'Preference';
    default: return category;
  }
}
