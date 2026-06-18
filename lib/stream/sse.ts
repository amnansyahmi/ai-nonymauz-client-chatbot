type Source = { id: string; title: string; category: string };

export type StreamEvent =
  | { type: 'sources'; sources: Source[] }
  | { type: 'delta'; text: string }
  | { type: 'error'; error: string }
  | { type: 'done' };

export function encodeSseEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function encodeSseError(message: string): string {
  return encodeSseEvent({ type: 'error', error: message });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function extractAnswerFromJson(data: unknown): string {
  if (!isRecord(data)) return '';
  const choices = data.choices;
  if (Array.isArray(choices) && choices[0] && isRecord(choices[0])) {
    const choice = choices[0];
    const delta = isRecord(choice.delta) ? choice.delta : undefined;
    const message = isRecord(choice.message) ? choice.message : undefined;
    return readString(delta?.content) || readString(message?.content);
  }
  for (const key of ['delta', 'answer', 'response', 'content', 'message']) {
    const candidate = isRecord(data.delta) && key === 'delta' ? data.delta : data[key];
    const text = readString(candidate);
    if (text) return text;
  }
  return '';
}

export function parseSseEvents(buffer: string): { events: StreamEvent[]; remaining: string } {
  const events: StreamEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remaining = blocks.pop() ?? '';

  for (const block of blocks) {
    const dataLines = block
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.replace(/^data:\s*/, ''));

    if (dataLines.length === 0) continue;

    const payload = dataLines.join('\n').trim();
    if (!payload || payload === '[DONE]') continue;

    try {
      const parsed = JSON.parse(payload) as unknown;
      if (parsed && typeof parsed === 'object' && 'type' in parsed) {
        events.push(parsed as StreamEvent);
        continue;
      }

      const text = extractAnswerFromJson(parsed);
      if (text) {
        events.push({ type: 'delta', text });
      }
    } catch {
      events.push({ type: 'delta', text: payload });
    }
  }

  return { events, remaining };
}
