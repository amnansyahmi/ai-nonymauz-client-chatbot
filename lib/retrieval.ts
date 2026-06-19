import knowledge from '../data/knowledge.json';

export type KnowledgeDoc = {
  id: string;
  title: string;
  category: string;
  content: string;
};

type KnowledgeBundle = {
  clientName?: string;
  lastUpdated?: string;
  documents: KnowledgeDoc[];
};

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'you', 'your', 'apa', 'yang', 'dan', 'untuk', 'saya', 'kami', 'awak', 'boleh', 'atau', 'dengan', 'how', 'what', 'when', 'where', 'why', 'can', 'do', 'does', 'is', 'are'
]);

const bundle = knowledge as KnowledgeBundle;

// Domain synonym groups (Malay <-> English + common variants) so a query in one
// language still retrieves docs written in the other, and colloquial terms map
// to formal ones. Each term in a group expands to every other term in the group.
const SYNONYM_GROUPS: string[][] = [
  ['bajet', 'budget', 'kos', 'harga', 'price', 'cost', 'belanja', 'perbelanjaan'],
  ['tetamu', 'guest', 'guests', 'jemputan', 'rsvp', 'pax', 'headcount'],
  ['dewan', 'venue', 'hall', 'tempat', 'lokasi', 'location'],
  ['katering', 'catering', 'caterer', 'makanan', 'food'],
  ['jurugambar', 'photographer', 'fotografi', 'photography', 'foto', 'gambar', 'photo'],
  ['andaman', 'mua', 'makeup', 'solek', 'mekap'],
  ['baju', 'gaun', 'gown', 'attire', 'pakaian', 'dress', 'butik'],
  ['nikah', 'akad', 'solemnisation', 'perkahwinan', 'kahwin', 'marriage', 'wedding'],
  ['hantaran', 'dulang', 'gubahan'],
  ['kursus', 'course', 'kppim', 'praperkahwinan'],
  ['hiv', 'ujian', 'saringan', 'darah', 'screening', 'health', 'kesihatan'],
  ['kebenaran', 'permit', 'borang', 'permission', 'sppim', 'pendaftaran', 'registration', 'daftar'],
  ['wali', 'guardian'],
  ['mahar', 'maskahwin', 'dowry'],
  ['dekorasi', 'decor', 'decoration', 'pelamin', 'hiasan'],
  ['kad', 'invitation', 'card'],
  ['cenderahati', 'doorgift', 'doorgifts', 'favour', 'favor'],
  ['appointment', 'temujanji', 'jadual', 'schedule', 'booking', 'tempahan', 'tempah'],
  ['checklist', 'senarai', 'task', 'tugas', 'todo'],
  ['vendor', 'vendors', 'supplier', 'pembekal']
];

const SYNONYM_INDEX: Map<string, Set<string>> = (() => {
  const index = new Map<string, Set<string>>();
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      const set = index.get(term) ?? new Set<string>();
      for (const other of group) if (other !== term) set.add(other);
      index.set(term, set);
    }
  }
  return index;
})();

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/** Expand query tokens with their domain synonyms (weighted lower than originals). */
function expandQueryTerms(terms: string[]): { term: string; weight: number }[] {
  const expanded = new Map<string, number>();
  for (const term of terms) {
    expanded.set(term, Math.max(expanded.get(term) ?? 0, 1));
    for (const synonym of SYNONYM_INDEX.get(term) ?? []) {
      expanded.set(synonym, Math.max(expanded.get(synonym) ?? 0, 0.6));
    }
  }
  return [...expanded.entries()].map(([term, weight]) => ({ term, weight }));
}

/** Partial match for agglutinative Malay: "tunang" ⊂ "pertunangan", "foto" ⊂ "fotografi". */
function partialMatchCount(term: string, termFrequency: Map<string, number>): number {
  if (term.length < 4) return 0;
  let count = 0;
  for (const [token, freq] of termFrequency) {
    if (token === term) continue;
    if (token.length >= 4 && (token.includes(term) || term.includes(token))) count += freq;
  }
  return count;
}

export function getClientName(): string {
  return process.env.CLIENT_NAME || bundle.clientName || 'Client Company';
}

export function getKnowledgeBundle(): KnowledgeBundle {
  return bundle;
}

export function retrieveContext(question: string, maxDocs = 4): KnowledgeDoc[] {
  const queryTerms = tokenize(question);
  const docs = bundle.documents;

  if (queryTerms.length === 0) {
    return docs.slice(0, maxDocs);
  }

  const weightedTerms = expandQueryTerms(queryTerms);

  return docs
    .map((doc) => {
      const haystack = tokenize(`${doc.title} ${doc.category} ${doc.content}`);
      const termFrequency = new Map<string, number>();
      for (const term of haystack) {
        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
      }

      let score = 0;
      for (const { term, weight } of weightedTerms) {
        const exact = termFrequency.get(term) || 0;
        if (exact > 0) {
          score += weight * (1 + Math.log(exact));
          continue;
        }
        // Fall back to partial (affix) matching at a reduced weight.
        const partial = partialMatchCount(term, termFrequency);
        if (partial > 0) {
          score += weight * 0.4 * (1 + Math.log(partial));
        }
      }

      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDocs)
    .map((item) => item.doc);
}

export function formatContext(docs: KnowledgeDoc[]): string {
  if (docs.length === 0) {
    return 'No matching internal knowledge found.';
  }

  return docs
    .map((doc, index) => `[Source ${index + 1}: ${doc.title} | ${doc.category}]\n${doc.content}`)
    .join('\n\n');
}
