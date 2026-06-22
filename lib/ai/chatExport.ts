import type { Message } from '../../components/planner/types';

export type ChatExportFormat = 'text' | 'whatsapp';

/**
 * Serialise a chat (a list of messages) into a plain-text format that
 * reads naturally when shared with a non-technical friend or pasted
 * into WhatsApp. No markdown, no JSON, no file extensions.
 */
export function formatChatAsText(messages: Message[], language: 'ms' | 'en' = 'ms'): string {
  const isMs = language === 'ms';
  const userLabel = isMs ? 'Anda' : 'You';
  const assistantLabel = 'MajlisMate';
  const lines: string[] = [];

  for (const message of messages) {
    const label = message.role === 'user' ? userLabel : assistantLabel;
    const content = (message.content || '').trim();
    if (!content) continue;
    lines.push(`${label}:`);
    lines.push(content);
    lines.push('');
  }
  const footer = isMs
    ? '— Dijana dengan MajlisMate.ai —'
    : '— Generated with MajlisMate.ai —';
  lines.push(footer);
  return lines.join('\n').trim();
}

/**
 * Build a `https://wa.me/` URL that opens WhatsApp with the chat
 * pre-filled as a message. This is the primary share path for
 * Malaysian users — no email, no link copy, no jargon.
 */
export function buildWhatsAppShareUrl(chatText: string): string {
  const encoded = encodeURIComponent(chatText);
  return `https://wa.me/?text=${encoded}`;
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    return Promise.resolve(false);
  }
  return navigator.clipboard
    .writeText(text)
    .then(() => true)
    .catch(() => false);
}

export async function shareChat(
  messages: Message[],
  format: ChatExportFormat,
  language: 'ms' | 'en' = 'ms'
): Promise<{ ok: boolean; url?: string }> {
  const text = formatChatAsText(messages, language);
  if (format === 'text') {
    const ok = await copyToClipboard(text);
    return { ok };
  }
  const url = buildWhatsAppShareUrl(text);
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  return { ok: true, url };
}
