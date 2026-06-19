import type { AppLanguage } from '../../components/planner/types';

// Phonetic corrections for common Malay wedding terms when read by an English TTS voice.
// English phoneme rules mispronounce Malay vowels — "a" becomes "ay", "i" becomes "ai", etc.
// These substitutions guide the English TTS to produce sounds closer to Malay pronunciation.
// ONLY applied when the active voice is not ms-MY or id-ID.
const MALAY_PHONETIC: Array<[RegExp, string]> = [
  // Nikah / ceremony
  [/\bbernikah\b/gi,    'ber-nee-kah'],
  [/\bnikahkan\b/gi,    'nee-kah-kan'],
  [/\bnikah\b/gi,       'nee-kah'],
  [/\bakad\b/gi,        'ah-kad'],
  [/\bbersanding\b/gi,  'ber-sahn-ding'],
  [/\bsanding\b/gi,     'sahn-ding'],
  [/\bpelamin\b/gi,     'peh-lah-meen'],
  [/\bpengantin\b/gi,   'peng-ahn-teen'],
  [/\bberinai\b/gi,     'beh-ree-nai'],
  [/\bandaman\b/gi,     'un-dah-mun'],
  [/\bkenduri\b/gi,     'ken-doo-ree'],
  [/\bwalimah\b/gi,     'wah-lee-mah'],
  [/\bmajlis\b/gi,      'mah-jliss'],
  // People / roles
  [/\bjurunikah\b/gi,   'joo-roo-nee-kah'],
  [/\bwali\b/gi,        'wah-lee'],
  [/\btetamu\b/gi,      'teh-tah-moo'],
  [/\bjemputan\b/gi,    'jem-poo-tun'],
  // Budget / finance
  [/\bmahar\b/gi,       'mah-har'],
  [/\bhantaran\b/gi,    'hun-tah-run'],
  [/\bbajet\b/gi,       'bah-jet'],
  // Venue / space
  [/\bdewan\b/gi,       'deh-wun'],
  [/\bnegeri\b/gi,      'neh-geh-ree'],
  [/\bpejabat\b/gi,     'peh-jah-bat'],
  // Common words that English TTS distorts
  [/\bselamat\b/gi,     'seh-lah-maht'],
  [/\bterima\b/gi,      'teh-ree-mah'],
  [/\bkahwin\b/gi,      'kah-win'],
  [/\bbersama\b/gi,     'ber-sah-mah'],
  [/\btidak\b/gi,       'tee-dak'],
  [/\bboleh\b/gi,       'boh-leh'],
  [/\bsudah\b/gi,       'soo-dah'],
  [/\bbelum\b/gi,       'beh-loom'],
  [/\buntuk\b/gi,       'oon-took'],
  [/\bdengan\b/gi,      'deng-an'],
  [/\bsebab\b/gi,       'seh-bab'],
  [/\bkerana\b/gi,      'keh-rah-nah'],
  [/\bsesama\b/gi,      'seh-sah-mah'],
  [/\btapi\b/gi,        'tah-pee'],
  [/\bjuga\b/gi,        'joo-gah'],
  [/\bkalau\b/gi,       'kah-lao'],
  [/\bpihak\b/gi,       'pee-hak'],
  [/\bperkara\b/gi,     'per-kah-rah'],
  [/\bkepada\b/gi,      'keh-pah-dah'],
  [/\bseperti\b/gi,     'seh-per-tee'],
];

function applyMalayPhonetics(text: string): string {
  let result = text;
  for (const [pattern, replacement] of MALAY_PHONETIC) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

const CONTRACTIONS_EN: Array<[RegExp, string]> = [
  [/\bI am\b/gi, "I'm"],
  [/\bdo not\b/gi, "don't"],
  [/\bwill not\b/gi, "won't"],
  [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"],
  [/\bit is\b/gi, "it's"],
  [/\bthat is\b/gi, "that's"],
  [/\bwe are\b/gi, "we're"],
  [/\bthey are\b/gi, "they're"],
  [/\byou are\b/gi, "you're"],
  [/\bwhat is\b/gi, "what's"],
  [/\bwhere is\b/gi, "where's"],
  [/\bwho is\b/gi, "who's"],
  [/\bhow is\b/gi, "how's"],
  [/\blet us\b/gi, "let's"],
  [/\bI will\b/gi, "I'll"],
  [/\bI would\b/gi, "I'd"],
  [/\bI have\b/gi, "I've"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bI had\b/gi, "I'd"],
  [/\bhe is\b/gi, "he's"],
  [/\bshe is\b/gi, "she's"],
  [/\bthere is\b/gi, "there's"]
];

function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // [text](url) → text
    .replace(/https?:\/\/\S+/g, '')             // bare URLs
    .replace(/\*\*([^*]+)\*\*/g, '$1')          // **bold**
    .replace(/\*([^*]+)\*/g, '$1')              // *italic*
    .replace(/_([^_]+)_/g, '$1')                // _italic_
    .replace(/`([^`]+)`/g, '$1')                // `code`
    .replace(/#{1,6}\s*/g, '')                  // ## headings
    .replace(/^[-*+]\s+/gm, '')                 // bullet points
    .replace(/^\d+\.\s+/gm, '');               // numbered lists
}

const MS_ONES = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'lapan', 'sembilan'];

/** Convert 0..999 to spoken Malay, honouring the "se-" prefix (seratus, sepuluh, sebelas). */
function malayThreeDigits(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rem = n % 100;
  if (hundreds === 1) parts.push('seratus');
  else if (hundreds > 1) parts.push(`${MS_ONES[hundreds]} ratus`);
  if (rem > 0) {
    if (rem < 10) parts.push(MS_ONES[rem]);
    else if (rem === 10) parts.push('sepuluh');
    else if (rem === 11) parts.push('sebelas');
    else if (rem < 20) parts.push(`${MS_ONES[rem - 10]} belas`);
    else {
      const tens = Math.floor(rem / 10);
      const unit = rem % 10;
      parts.push(`${MS_ONES[tens]} puluh`);
      if (unit > 0) parts.push(MS_ONES[unit]);
    }
  }
  return parts.join(' ');
}

/** Spoken Malay for whole numbers up to the billions (seribu, sejuta-style scaling). */
export function malayNumberToWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'kosong';
  let remaining = n;
  const parts: string[] = [];
  const billions = Math.floor(remaining / 1_000_000_000);
  remaining %= 1_000_000_000;
  const millions = Math.floor(remaining / 1_000_000);
  remaining %= 1_000_000;
  const thousands = Math.floor(remaining / 1_000);
  remaining %= 1_000;
  if (billions > 0) parts.push(`${malayThreeDigits(billions)} bilion`);
  if (millions > 0) parts.push(`${malayThreeDigits(millions)} juta`);
  if (thousands > 0) parts.push(thousands === 1 ? 'seribu' : `${malayThreeDigits(thousands)} ribu`);
  if (remaining > 0) parts.push(malayThreeDigits(remaining));
  return parts.join(' ');
}

function expandCurrency(text: string, language: AppLanguage): string {
  return text.replace(/RM\s*([\d,]+)(?:\.(\d{1,2}))?/g, (_, intPart: string, decPart?: string) => {
    const ringgit = Number.parseInt(intPart.replace(/,/g, ''), 10) || 0;
    if (language !== 'ms') {
      // English voices read digits naturally; just normalise the symbol.
      const decimals = decPart ? `.${decPart}` : '';
      return `${intPart.replace(/,/g, '')}${decimals} ringgit`;
    }
    let out = `${malayNumberToWords(ringgit)} ringgit`;
    if (decPart) {
      const sen = Number.parseInt(decPart.padEnd(2, '0').slice(0, 2), 10);
      if (sen > 0) out += ` ${malayNumberToWords(sen)} sen`;
    }
    return out;
  });
}

const MS_MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Speak dates as "14 September 2026" (ms) / "September 14, 2026" (en) instead of "2026-09-14". */
function expandDates(text: string, language: AppLanguage): string {
  const months = language === 'ms' ? MS_MONTHS : EN_MONTHS;

  // ISO: 2026-09-14 (unambiguous)
  let result = text.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match, year: string, mo: string, day: string) => {
    const monthIndex = Number.parseInt(mo, 10) - 1;
    const dayNum = Number.parseInt(day, 10);
    if (monthIndex < 0 || monthIndex > 11 || dayNum < 1 || dayNum > 31) return match;
    return language === 'ms' ? `${dayNum} ${months[monthIndex]} ${year}` : `${months[monthIndex]} ${dayNum}, ${year}`;
  });

  // D/M/YYYY — require a year to avoid mangling fractions like "1/2".
  result = result.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g, (match, day: string, mo: string, year: string) => {
    const monthIndex = Number.parseInt(mo, 10) - 1;
    const dayNum = Number.parseInt(day, 10);
    if (monthIndex < 0 || monthIndex > 11 || dayNum < 1 || dayNum > 31) return match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return language === 'ms' ? `${dayNum} ${months[monthIndex]} ${fullYear}` : `${months[monthIndex]} ${dayNum}, ${fullYear}`;
  });

  return result;
}

function expandNumbers(text: string, language: AppLanguage): string {
  // 50% → "50 percent" / "50 peratus"
  const percentWord = language === 'ms' ? 'peratus' : 'percent';
  let result = text.replace(/(\d+(?:\.\d+)?)%/g, `$1 ${percentWord}`);

  // 5k / 5K → "5 thousand" / "5 ribu"
  const thousandWord = language === 'ms' ? 'ribu' : 'thousand';
  result = result.replace(/\b(\d+(?:\.\d+)?)k\b/gi, `$1 ${thousandWord}`);

  // 2M / 2m → "2 million" / "2 juta"
  const millionWord = language === 'ms' ? 'juta' : 'million';
  result = result.replace(/\b(\d+(?:\.\d+)?)M\b/g, `$1 ${millionWord}`);

  return result;
}

export function humanize(text: string, language: AppLanguage, voiceLang?: string): string {
  if (!text) return text;

  let result = stripMarkdown(text);
  result = expandDates(result, language);
  result = expandCurrency(result, language);
  result = expandNumbers(result, language);

  if (language === 'en') {
    for (const [pattern, replacement] of CONTRACTIONS_EN) {
      // Preserve leading-case of the original match (regex `i` flag is case-insensitive
      // but the replacement string is taken literally).
      result = result.replace(pattern, (match) => {
        if (!match || !replacement) return match;
        if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
          return replacement[0].toUpperCase() + replacement.slice(1);
        }
        return replacement;
      });
    }
    // Add a breath comma before "and" when the preceding phrase is long enough
    // (≥ 30 characters from the start of the sentence or after a period).
    result = result.replace(/(^|\.\s+)(.{30,})\s+and\s+/g, '$1$2, and ');
  }

  // Apply Malay phonetic corrections when the active TTS voice is not a
  // Malay (ms-*) or Indonesian (id-*) voice — English voices mispronounce
  // Malay vowels, so we guide the engine with explicit phonetic spellings.
  if (language === 'ms' && voiceLang) {
    const vl = voiceLang.toLowerCase();
    const isMalayOrIndonesian = vl.startsWith('ms') || vl.startsWith('id');
    if (!isMalayOrIndonesian) {
      result = applyMalayPhonetics(result);
    }
  }

  return result.replace(/\s{2,}/g, ' ').trim();
}

export type SentenceProsody = {
  rate: number;
  pitch: number;
};

// Rate/pitch nudges per sentence-position cycle (index % 4)
const RATE_CYCLE = [0.02, -0.01, 0.01, -0.02] as const;
const PITCH_CYCLE = [0.02, -0.02, 0.01, -0.01] as const;

export function sentenceProsody(
  index: number,
  isQuestion: boolean,
  baseRate: number,
  basePitch: number,
  isLast = false
): SentenceProsody {
  let rate = baseRate;
  let pitch = basePitch;

  // Opening sentence: slightly brighter/attentive
  if (index === 0) {
    rate += 0.03;
    pitch += 0.05;
  }

  // Closing sentence: slightly slower for a conclusive feel
  if (isLast && !isQuestion) {
    rate -= 0.05;
    pitch -= 0.02;
  }

  // Questions: rise in pitch, slow slightly
  if (isQuestion) {
    pitch += 0.1;
    rate -= 0.03;
  }

  // Cycle-based variation (less predictable than sin/cos)
  rate += RATE_CYCLE[index % 4];
  pitch += PITCH_CYCLE[index % 4];

  rate = Math.max(0.5, Math.min(2, rate));
  pitch = Math.max(0.5, Math.min(2, pitch));

  return { rate, pitch };
}

export function isQuestionSentence(sentence: string): boolean {
  return /[?]\s*$/.test(sentence.trim());
}