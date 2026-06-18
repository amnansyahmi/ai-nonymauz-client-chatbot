import { extractAnswerFromJson, parseSseEvents, type StreamEvent } from './stream/sse';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AIResponse = {
  answer: string;
  provider: 'ai-nonymauz' | 'demo-fallback';
};

export function readEnv() {
  return {
    baseUrl: process.env.AI_NONYMAUZ_BASE_URL?.replace(/\/$/, '') ?? '',
    apiKey: process.env.AI_NONYMAUZ_API_KEY ?? '',
    model: process.env.AI_NONYMAUZ_MODEL || 'ai-nonymauz-support',
    maxTokens: Number(process.env.AI_NONYMAUZ_MAX_TOKENS || 900)
  };
}

export function isDemoMode(env: { baseUrl: string; apiKey: string }): boolean {
  return !env.baseUrl || !env.apiKey || env.apiKey === 'your-secret-api-key';
}

export async function askAiNonymauz(messages: ChatMessage[]): Promise<AIResponse> {
  const env = readEnv();

  if (isDemoMode(env)) {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    return {
      provider: 'demo-fallback',
      answer:
        `Demo mode aktif kerana AI_NONYMAUZ_BASE_URL / AI_NONYMAUZ_API_KEY belum diset.\n\n` +
        `Saya sudah terima soalan: "${userMessage}". Selepas env diset di Vercel, jawapan sebenar akan dijana melalui AI-nonymauz backend menggunakan knowledge base client.`
    };
  }

  const response = await fetch(`${env.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${env.apiKey}`
    },
    body: JSON.stringify({
      model: env.model,
      messages,
      temperature: 0.2,
      max_tokens: env.maxTokens,
      stream: false
    })
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`AI-nonymauz error ${response.status}: ${rawText}`);
  }

  const answer = extractAnswer(rawText);
  if (!answer) {
    throw new Error('AI-nonymauz returned an empty or unsupported response format.');
  }

  return { answer, provider: 'ai-nonymauz' };
}

function extractAnswer(rawText: string): string | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  try {
    const data: unknown = JSON.parse(trimmed);
    const answer = extractAnswerFromJson(data);
    if (answer) return answer;
  } catch {
    // Not plain JSON; may be SSE: data: {...}\n\n
  }

  if (trimmed.startsWith('data:') || trimmed.includes('\ndata:')) {
    const { events } = parseSseEvents(trimmed);
    return collectDeltaText(events);
  }

  return trimmed;
}

function collectDeltaText(events: StreamEvent[]): string | null {
  let combined = '';
  for (const event of events) {
    if (event.type === 'delta' && event.text) {
      combined += event.text;
    }
  }
  return combined.trim() || null;
}
