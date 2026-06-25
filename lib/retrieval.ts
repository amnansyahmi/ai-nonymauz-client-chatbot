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

/** Conservative English plural stemmer. Strips trailing -s when the stem is >= 4 chars and the word doesn't end in -ss, -us, -is, -os. */
function stem(word: string): string {
  if (word.length >= 5 && word.endsWith('s') && !/(?:ss|us|is|os)$/.test(word)) {
    return word.slice(0, -1);
  }
  return word;
}

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
  ['jakim', 'jabatan', 'kemajuan', 'islam', 'malaysia', 'federal', 'persekutuan'],
  ['jai', 'jawi', 'jais', 'jaj', 'jaim', 'jains', 'jaipk', 'jaik', 'jaip', 'jaipp', 'jaheaik', 'jheat', 'muip', 'jheains', 'mais', 'agama', 'negeri', 'majlis'],
  ['merentas', 'negeri', 'cross', 'state', 'luar', 'negeri'],
  ['wali', 'hakim', 'wali hakim', 'wali nasab', 'guardian'],
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
    const stemmed = [...new Set(group.map(stem))];
    for (const term of stemmed) {
      const set = index.get(term) ?? new Set<string>();
      for (const other of stemmed) if (other !== term) set.add(other);
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
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map(stem);
}

// Inverse document frequency: how many docs each token appears in. Ubiquitous
// terms in a wedding corpus ("wedding", "perkahwinan") get downweighted so rare,
// specific terms ("kos", "bajet") drive ranking. Keeps retrieval robust as the
// corpus grows. Computed once at module load.
const TOTAL_DOCS = bundle.documents.length;
const DOC_FREQUENCY: Map<string, number> = (() => {
  const df = new Map<string, number>();
  for (const doc of bundle.documents) {
    const unique = new Set(tokenize(`${doc.title} ${doc.category} ${doc.content}`));
    for (const token of unique) df.set(token, (df.get(token) ?? 0) + 1);
  }
  return df;
})();

function idf(term: string): number {
  const df = DOC_FREQUENCY.get(term) ?? 0;
  // Smoothed; always >= 1 so a match never scores zero, but rarer terms score higher.
  return Math.log((TOTAL_DOCS + 1) / (df + 1)) + 1;
}

type QueryConcept = { term: string; weight: number }[];

/**
 * Group each distinct query token with its domain synonyms (weighted lower than
 * the original). Scoring takes the BEST match within a concept, then sums across
 * concepts — so one query term's large synonym set can't monopolise ranking by
 * stacking many partial hits (e.g. "kahwin" → perkahwinan+nikah+akad+wedding)
 * and starving another concept in the query ("kos").
 */
function buildQueryConcepts(terms: string[]): QueryConcept[] {
  const concepts: QueryConcept[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    if (seen.has(term)) continue;
    seen.add(term);
    const members = new Map<string, number>([[term, 1]]);
    for (const synonym of SYNONYM_INDEX.get(term) ?? []) {
      members.set(synonym, Math.max(members.get(synonym) ?? 0, 0.6));
    }
    concepts.push([...members.entries()].map(([t, w]) => ({ term: t, weight: w })));
  }
  return concepts;
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

  const concepts = buildQueryConcepts(queryTerms);

  return docs
    .map((doc) => {
      const haystack = tokenize(`${doc.title} ${doc.category} ${doc.content}`);
      const termFrequency = new Map<string, number>();
      for (const term of haystack) {
        termFrequency.set(term, (termFrequency.get(term) || 0) + 1);
      }

      // Best match per concept, summed across concepts (not summed per synonym).
      let score = 0;
      for (const concept of concepts) {
        let best = 0;
        for (const { term, weight } of concept) {
          const rarity = idf(term);
          const exact = termFrequency.get(term) || 0;
          let contribution = 0;
          if (exact > 0) {
            contribution = weight * rarity * (1 + Math.log(exact));
          } else {
            // Fall back to partial (affix) matching at a reduced weight.
            const partial = partialMatchCount(term, termFrequency);
            if (partial > 0) contribution = weight * rarity * 0.4 * (1 + Math.log(partial));
          }
          if (contribution > best) best = contribution;
        }
        score += best;
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
