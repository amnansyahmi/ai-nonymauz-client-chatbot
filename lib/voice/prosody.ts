import type { AppLanguage } from '../../components/planner/types';

const CONTRACTIONS_EN: Array<[RegExp, string]> = [
  [/\bI am\b/g, "I'm"],
  [/\bdo not\b/g, "don't"],
  [/\bwill not\b/g, "won't"],
  [/\bcannot\b/g, "can't"],
  [/\bcan not\b/g, "can't"],
  [/\bit is\b/g, "it's"],
  [/\bthat is\b/g, "that's"],
  [/\bwe are\b/g, "we're"],
  [/\bthey are\b/g, "they're"],
  [/\byou are\b/g, "you're"],
  [/\bwhat is\b/g, "what's"],
  [/\bwhere is\b/g, "where's"],
  [/\bwho is\b/g, "who's"],
  [/\bhow is\b/g, "how's"],
  [/\blet us\b/g, "let's"],
  [/\bI will\b/g, "I'll"],
  [/\bI would\b/g, "I'd"],
  [/\bI have\b/g, "I've"],
  [/\bwould not\b/g, "wouldn't"],
  [/\bshould not\b/g, "shouldn't"],
  [/\bcould not\b/g, "couldn't"],
  [/\bI had\b/g, "I'd"],
  [/\bhe is\b/g, "he's"],
  [/\bshe is\b/g, "she's"],
  [/\bthere is\b/g, "there's"]
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

function expandCurrency(text: string, language: AppLanguage): string {
  // RM1,500 / RM 1500 → "1500 ringgit"
  const ringgit = language === 'ms' ? 'ringgit' : 'ringgit';
  return text.replace(/RM\s*([\d,]+(?:\.\d{2})?)/g, (_, amount) =>
    `${amount.replace(/,/g, '')} ${ringgit}`
  );
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

export function humanize(text: string, language: AppLanguage): string {
  if (!text) return text;

  let result = stripMarkdown(text);
  result = expandCurrency(result, language);
  result = expandNumbers(result, language);

  if (language === 'en') {
    for (const [pattern, replacement] of CONTRACTIONS_EN) {
      result = result.replace(pattern, replacement);
    }
    result = result.replace(/(\w{20,})\s+and\s+/g, '$1, and ');
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