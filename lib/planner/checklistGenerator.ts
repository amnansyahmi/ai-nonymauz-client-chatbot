import type { ChecklistItem } from '../../components/planner/types';
import { formatMonthLabel, getMonthBucketFromDeadline } from './monthBuckets';
import { baseChunks } from './checklist-knowledge/_registry';
import { categorizeTask } from './checklistCategories';

export type SurveyAnswers = {
  weddingDate: string;
  venueState: string;
  brideOriginState: string;
  groomOriginState: string;
  hasNikah: boolean;
  hasSanding: boolean;
  estimatedGuests: number;
};

export type GenerationSource = {
  chunkId: string;
  chunkLabel: string;
  category: 'base' | 'format' | 'state' | 'cross-state' | 'scale';
};

export type GenerationResult = {
  items: ChecklistItem[];
  sources: GenerationSource[];
  matchedChunks: string[];
};

type PhaseConfig = { phase: string; phaseEn: string; daysOffset: number };

export const PHASES: PhaseConfig[] = [
  { phase: '12+ Bulan Sebelum', phaseEn: '12+ Months Before', daysOffset: 365 },
  { phase: '9-12 Bulan Sebelum', phaseEn: '9-12 Months Before', daysOffset: 300 },
  { phase: '6-9 Bulan Sebelum', phaseEn: '6-9 Months Before', daysOffset: 200 },
  { phase: '3-6 Bulan Sebelum', phaseEn: '3-6 Months Before', daysOffset: 135 },
  { phase: '1-3 Bulan Sebelum', phaseEn: '1-3 Months Before', daysOffset: 60 },
  { phase: '1 Bulan - 2 Minggu Sebelum', phaseEn: '1 Month - 2 Weeks Before', daysOffset: 20 },
  { phase: '2 Minggu - 1 Minggu Sebelum', phaseEn: '2 Weeks - 1 Week Before', daysOffset: 10 },
  { phase: '1 Minggu - Hari Majlis', phaseEn: '1 Week - Wedding Day', daysOffset: 0 },
  { phase: 'Selepas Majlis', phaseEn: 'After Wedding', daysOffset: -7 }
];

export type ParsedChunk = {
  id: string;
  label: string;
  category: GenerationSource['category'];
  phaseItems: Record<string, Array<{ text: string; note?: string }>>;
};

function findPhaseByLabel(label: string): PhaseConfig | undefined {
  const norm = label.toLowerCase().trim();
  const direct = PHASES.find((p) => p.phase.toLowerCase() === norm || p.phaseEn.toLowerCase() === norm);
  if (direct) return direct;
  if (norm.includes('selepas') || norm.includes('after')) return PHASES[PHASES.length - 1];
  if (norm.includes('hari majlis') || norm.includes('wedding day')) return PHASES.find((p) => p.phaseEn.includes('Day')) ?? PHASES[7];
  if (norm.includes('minggu') || norm.includes('week')) return PHASES.find((p) => p.phase.includes('Minggu')) ?? PHASES[6];
  if (norm.includes('bulan') || norm.includes('month')) return PHASES[3];
  return undefined;
}

function parseChunk(id: string, label: string, category: GenerationSource['category'], md: string): ParsedChunk {
  const phaseItems: Record<string, Array<{ text: string; note?: string }>> = {};
  const phaseRegex = /^##\s+(.+?)\s*$/gm;
  let m: RegExpExecArray | null;
  let current: string | null = null;
  const slices: Array<{ phase: string; body: string }> = [];
  let lastIndex = 0;

  while ((m = phaseRegex.exec(md)) !== null) {
    if (current !== null) slices.push({ phase: current, body: md.slice(lastIndex, m.index) });
    current = m[1].trim();
    lastIndex = m.index + m[0].length;
  }
  if (current !== null) slices.push({ phase: current, body: md.slice(lastIndex) });

  for (const slice of slices) {
    const phase = findPhaseByLabel(slice.phase);
    if (!phase) continue;
    const key = phase.phase;
    if (!phaseItems[key]) phaseItems[key] = [];

    const itemRegex = /^\s*-\s*\[\s*\]\s*(.+?)\s*$/gm;
    let im: RegExpExecArray | null;
    while ((im = itemRegex.exec(slice.body)) !== null) {
      const raw = im[1].trim();
      if (!raw) continue;
      // Knowledge format is "Task text | optional note"
      const pipe = raw.indexOf('|');
      const text = pipe >= 0 ? raw.slice(0, pipe).trim() : raw;
      const note = pipe >= 0 ? raw.slice(pipe + 1).trim() : undefined;
      if (!text) continue;
      phaseItems[key].push(note ? { text, note } : { text });
    }
  }

  return { id, label, category, phaseItems };
}

const CHUNK_META: Record<string, { label: string; category: GenerationSource['category'] }> = {
  '00-base': { label: 'Asas semua majlis', category: 'base' },
  '01-nikah': { label: 'Akad nikah', category: 'format' },
  '02-sanding': { label: 'Majlis sanding', category: 'format' },
  '03-cross-state': { label: 'Dua negeri', category: 'cross-state' },
  'scale/intimate': { label: 'Skala kecil', category: 'scale' },
  'scale/medium': { label: 'Skala sederhana', category: 'scale' },
  'scale/large': { label: 'Skala besar', category: 'scale' },
  'states/johor': { label: 'Johor', category: 'state' },
  'states/kedah': { label: 'Kedah', category: 'state' },
  'states/kelantan': { label: 'Kelantan', category: 'state' },
  'states/melaka': { label: 'Melaka', category: 'state' },
  'states/negeri-sembilan': { label: 'Negeri Sembilan', category: 'state' },
  'states/pahang': { label: 'Pahang', category: 'state' },
  'states/perak': { label: 'Perak', category: 'state' },
  'states/perlis': { label: 'Perlis', category: 'state' },
  'states/pulau-pinang': { label: 'Pulau Pinang', category: 'state' },
  'states/sabah': { label: 'Sabah', category: 'state' },
  'states/sarawak': { label: 'Sarawak', category: 'state' },
  'states/selangor': { label: 'Selangor', category: 'state' },
  'states/terengganu': { label: 'Terengganu', category: 'state' },
  'states/wp-kuala-lumpur': { label: 'WP KL', category: 'state' },
  'states/wp-putrajaya': { label: 'WP Putrajaya', category: 'state' },
  'states/wp-labuan': { label: 'WP Labuan', category: 'state' }
};

export function loadChunk(path: string): ParsedChunk | null {
  const raw = (baseChunks as Record<string, string | undefined>)[path];
  if (!raw) return null;
  const meta = CHUNK_META[path];
  if (!meta) return null;
  return parseChunk(path, meta.label, meta.category, raw);
}

const STATE_SLUG_MAP: Record<string, string> = {
  Johor: 'johor', Kedah: 'kedah', Kelantan: 'kelantan', Melaka: 'melaka',
  'Negeri Sembilan': 'negeri-sembilan', Pahang: 'pahang', Perak: 'perak', Perlis: 'perlis',
  'Pulau Pinang': 'pulau-pinang', Sabah: 'sabah', Sarawak: 'sarawak', Selangor: 'selangor',
  Terengganu: 'terengganu', 'Kuala Lumpur': 'wp-kuala-lumpur', Putrajaya: 'wp-putrajaya',
  Labuan: 'wp-labuan'
};

export function stateSlug(state: string): string | undefined {
  if (!state) return undefined;
  if (STATE_SLUG_MAP[state]) return STATE_SLUG_MAP[state];
  const hit = Object.entries(STATE_SLUG_MAP).find(([k]) => state.includes(k));
  return hit?.[1];
}

function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function generatePersonalizedChecklist(
  answers: SurveyAnswers,
  options?: { nowIso?: string }
): GenerationResult {
  const chunksToLoad: string[] = ['00-base'];
  if (answers.hasNikah) chunksToLoad.push('01-nikah');
  if (answers.hasSanding) chunksToLoad.push('02-sanding');

  const brideSlug = stateSlug(answers.brideOriginState);
  const groomSlug = stateSlug(answers.groomOriginState);
  const venueSlug = stateSlug(answers.venueState);

  for (const slug of [brideSlug, groomSlug, venueSlug]) {
    if (slug && !chunksToLoad.includes(`states/${slug}`)) chunksToLoad.push(`states/${slug}`);
  }

  if (
    answers.brideOriginState &&
    answers.groomOriginState &&
    answers.brideOriginState !== answers.groomOriginState
  ) {
    chunksToLoad.push('03-cross-state');
  }

  const scale = answers.estimatedGuests < 50 ? 'intimate' : answers.estimatedGuests < 200 ? 'medium' : 'large';
  chunksToLoad.push(`scale/${scale}`);

  const seen = new Set<string>();
  const itemsByPhase: Record<string, Array<{ text: string; note?: string; source: GenerationSource }>> = {};
  const sources: GenerationSource[] = [];

  for (const chunkId of chunksToLoad) {
    const chunk = loadChunk(chunkId);
    if (!chunk) continue;
    const meta = CHUNK_META[chunkId];
    sources.push({ chunkId, chunkLabel: meta.label, category: meta.category });
    for (const [phaseKey, phaseItems] of Object.entries(chunk.phaseItems)) {
      if (!itemsByPhase[phaseKey]) itemsByPhase[phaseKey] = [];
      for (const item of phaseItems) {
        const key = normalizeForDedup(item.text);
        if (seen.has(key)) continue;
        seen.add(key);
        itemsByPhase[phaseKey].push({
          text: item.text,
          note: item.note,
          source: { chunkId, chunkLabel: meta.label, category: meta.category }
        });
      }
    }
  }

  const phaseList = PHASES.filter((p) => itemsByPhase[p.phase]);
  const now = options?.nowIso ?? new Date().toISOString();
  const items: ChecklistItem[] = [];
  let counter = 0;

  for (const phase of phaseList) {
    const phaseItems = itemsByPhase[phase.phase] ?? [];
    for (const item of phaseItems) {
      counter += 1;
      const deadline = answers.weddingDate ? addDays(answers.weddingDate, phase.daysOffset) : '';
      const bucketKey = deadline ? getMonthBucketFromDeadline(deadline) : null;
      items.push({
        id: `gen_${now}_${counter}`,
        text: item.text,
        completed: false,
        phase: phase.phase,
        phaseEn: phase.phaseEn,
        status: 'not-started',
        category: categorizeTask(item.text),
        deadline,
        monthBucket: bucketKey ?? undefined,
        monthBucketMs: bucketKey ? formatMonthLabel(bucketKey, 'ms') : undefined,
        monthBucketEn: bucketKey ? formatMonthLabel(bucketKey, 'en') : undefined,
        note: item.note
      });
    }
  }

  return { items, sources, matchedChunks: chunksToLoad };
}

export function profileReadyForChecklist(p: {
  weddingDate?: string;
  brideOriginState?: string;
  groomOriginState?: string;
  hasNikah?: boolean;
  hasSanding?: boolean;
  estimatedGuests?: number;
}): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!p.weddingDate) missing.push('weddingDate');
  if (!p.brideOriginState) missing.push('brideOriginState');
  if (!p.groomOriginState) missing.push('groomOriginState');
  if (p.hasNikah === undefined) missing.push('hasNikah');
  if (p.hasSanding === undefined) missing.push('hasSanding');
  if (!p.estimatedGuests) missing.push('estimatedGuests');
  return { ready: missing.length === 0, missing };
}
