/**
 * Model-driven clarification prompts. When the user asks to add/change something
 * but a key detail is missing (so the AI shouldn't guess), the assistant asks ONE
 * short question in its visible reply AND appends a machine-readable block listing
 * 2-4 short, tappable suggested answers. The client renders these as quick-reply
 * chips; tapping one sends it as the next user message.
 *
 * This is deliberately separate from MM_ACTIONS: actions are confirm-then-apply
 * mutations to planner state, whereas clarifications are just suggested replies.
 *
 * Block format (on its own lines, after the normal reply):
 *   <<<MM_CLARIFY
 *   ["Dalam 6 bulan", "Dalam 1 tahun", "Belum pasti"]
 *   MM_CLARIFY>>>
 */

export const MM_CLARIFY_OPEN = '<<<MM_CLARIFY';
export const MM_CLARIFY_CLOSE = 'MM_CLARIFY>>>';

const MAX_OPTIONS = 4;
const MAX_OPTION_LENGTH = 60;

/** Extract the JSON payload between the clarify markers, if present. */
function extractClarifyJson(text: string): string | null {
  const openIndex = text.indexOf(MM_CLARIFY_OPEN);
  if (openIndex === -1) return null;
  const afterOpen = text.slice(openIndex + MM_CLARIFY_OPEN.length);
  const closeIndex = afterOpen.indexOf(MM_CLARIFY_CLOSE);
  if (closeIndex === -1) return null; // only treat as complete once fully streamed
  const jsonRaw = afterOpen.slice(0, closeIndex).trim();
  return jsonRaw || null;
}

/**
 * Parse the clarify block into a list of suggested reply options.
 * Accepts either a bare JSON array of strings, or an object
 * `{ "options": string[] }`. Returns [] when absent or invalid.
 */
export function parseClarify(text: string): string[] {
  const jsonRaw = extractClarifyJson(text);
  if (!jsonRaw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonRaw);
  } catch {
    const unfenced = jsonRaw.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try {
      parsed = JSON.parse(unfenced);
    } catch {
      return [];
    }
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { options?: unknown }).options)
      ? (parsed as { options: unknown[] }).options
      : [];

  const seen = new Set<string>();
  const options: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim().slice(0, MAX_OPTION_LENGTH);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(value);
    if (options.length >= MAX_OPTIONS) break;
  }

  // A single option isn't a meaningful choice — require at least two.
  return options.length >= 2 ? options : [];
}

/**
 * Remove the clarify block from text for display/speech. Handles partial blocks
 * during streaming (open marker present but close marker not yet streamed).
 */
export function stripClarifyBlock(text: string): string {
  const openIndex = text.indexOf(MM_CLARIFY_OPEN);
  if (openIndex === -1) return text;
  const before = text.slice(0, openIndex);
  const afterOpen = text.slice(openIndex + MM_CLARIFY_OPEN.length);
  const closeIndex = afterOpen.indexOf(MM_CLARIFY_CLOSE);
  if (closeIndex === -1) return before.trimEnd();
  const after = afterOpen.slice(closeIndex + MM_CLARIFY_CLOSE.length);
  return `${before.trimEnd()}${after.trimStart() ? `\n${after.trimStart()}` : ''}`.trimEnd();
}
