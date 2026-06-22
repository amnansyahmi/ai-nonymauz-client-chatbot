export type DetectedLanguageTag = 'ms' | 'en' | 'unknown';

export type LanguageDetection = {
  language: DetectedLanguageTag;
  confidence: number;
  malayScore: number;
  englishScore: number;
  tokenCount: number;
};

const MALAY_WORDS = new Set([
  'saya', 'awak', 'anda', 'kamu', 'kami', 'kita', 'mereka', 'dia', 'beliau',
  'boleh', 'tidak', 'tak', 'ya', 'nak', 'hendak', 'mahu', 'suka',
  'tolong', 'bantu', 'sini', 'situ', 'sana',
  'macam', 'apa', 'siapa', 'bilakah', 'mengapa', 'kenapa', 'bagaimana',
  'okay', 'ok', 'hai', 'assalamualaikum', 'selamat', 'terima', 'kasih',
  'buat', 'kerja', 'bekerja', 'pergi', 'datang', 'mari',
  'rumah', 'sekolah', 'pejabat', 'kedai', 'pasar', 'makan', 'minum',
  'majlis', 'kahwin', 'pengantin', 'tetamu', 'jemaah', 'vendor', 'bajet',
  'checklist', 'senarai', 'appointment', 'temu', 'jumpa', 'atur',
  'hari', 'minggu', 'bulan', 'tahun', 'masa', 'waktu', 'pukul',
  'ini', 'itu', 'sangat', 'amat', 'sekali', 'paling', 'lebih',
  'kalau', 'jika', 'bila', 'apabila', 'sebab', 'kerana',
  'nak', 'saya', 'belum', 'sudah', 'dah', 'baru', 'lagi', 'pun'
]);

const ENGLISH_WORDS = new Set([
  'i', 'you', 'we', 'they', 'he', 'she', 'it', 'me', 'us', 'them', 'my', 'your', 'our', 'their',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'may', 'might',
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'what', 'when', 'where', 'why', 'how', 'who', 'which',
  'please', 'thanks', 'thank', 'ok', 'okay', 'yeah', 'yes', 'no',
  'make', 'do', 'go', 'come', 'see', 'look', 'want', 'need', 'have',
  'house', 'home', 'work', 'school', 'office', 'shop', 'store',
  'wedding', 'guest', 'guests', 'vendor', 'vendors', 'budget', 'checklist',
  'day', 'week', 'month', 'year', 'time', 'hour',
  'and', 'or', 'but', 'so', 'because', 'if', 'when', 'while',
  'about', 'with', 'for', 'from', 'into', 'over', 'under', 'than', 'then', 'there', 'here', 'how',
  'can', 'could', 'should', 'would', 'will', 'shall', 'may', 'might', 'must'
]);

const CONFIDENCE_THRESHOLD = 0.4;

/**
 * Lightweight Malay vs English detector for short transcripts. Web Speech API
 * does not expose the detected language reliably, so we use a small word-list
 * heuristic. Returns a confidence score in [0, 1] so callers can choose to
 * only act on confident detections (e.g. when switching the TTS voice).
 */
export function detectLanguage(text: string): LanguageDetection {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.length === 0 ? [] : cleaned.split(' ').filter((token) => token.length >= 2);
  const tokenCount = tokens.length;

  let malayScore = 0;
  let englishScore = 0;

  for (const token of tokens) {
    if (MALAY_WORDS.has(token)) malayScore += 1;
    if (ENGLISH_WORDS.has(token)) englishScore += 1;
  }

  if (tokenCount === 0) {
    return { language: 'unknown', confidence: 0, malayScore: 0, englishScore: 0, tokenCount: 0 };
  }

  const total = malayScore + englishScore;
  if (total === 0) {
    return { language: 'unknown', confidence: 0, malayScore, englishScore, tokenCount };
  }

  if (malayScore === englishScore) {
    return { language: 'unknown', confidence: 0, malayScore, englishScore, tokenCount };
  }

  const dominant = Math.max(malayScore, englishScore);
  const other = Math.min(malayScore, englishScore);
  // Confidence = how dominant the leading language is among recognized tokens,
  // weighted by how many of the tokens we actually recognized.
  const dominance = (dominant - other) / dominant;
  const coverage = dominant / tokenCount;
  const confidence = Math.max(0, Math.min(1, dominance * 0.6 + coverage * 0.4));

  return {
    language: malayScore > englishScore ? 'ms' : 'en',
    confidence,
    malayScore,
    englishScore,
    tokenCount
  };
}

export function isConfident(detection: LanguageDetection, threshold = CONFIDENCE_THRESHOLD): boolean {
  return detection.language !== 'unknown' && detection.confidence >= threshold;
}
