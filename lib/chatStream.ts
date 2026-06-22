import { parseSseEvents, type StreamEvent } from './stream/sse';

export type ChatStream = {
  deltas: AsyncIterable<string>;
  cancel: () => void;
};

export type AskStreamRequest = {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  language?: 'ms' | 'en';
  plannerContext?: Record<string, unknown>;
  voiceMode?: boolean;
  signal?: AbortSignal;
};

export async function askStream({
  messages,
  language = 'ms',
  plannerContext,
  voiceMode,
  signal
}: AskStreamRequest): Promise<ChatStream> {
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, language, plannerContext, voiceMode }),
    signal: controller.signal
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new Error(`chat stream error ${response.status}: ${text || 'no body'}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  async function* iter() {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSseEvents(buffer);
        buffer = remaining;
        for (const event of events as StreamEvent[]) {
          if (event.type === 'delta' && event.text) yield event.text;
          if (event.type === 'error') throw new Error(event.error);
        }
      }
      const tail = parseSseEvents(buffer);
      for (const event of tail.events as StreamEvent[]) {
        if (event.type === 'delta' && event.text) yield event.text;
        if (event.type === 'error') throw new Error(event.error);
      }
    } finally {
      try {
        await reader.cancel();
      } catch {}
    }
  }

  return {
    deltas: iter(),
    cancel: () => {
      controller.abort();
      try {
        reader.cancel();
      } catch {}
    }
  };
}
