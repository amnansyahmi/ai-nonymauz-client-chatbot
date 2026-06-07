type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AIResponse = {
  answer: string;
  provider: 'ai-nonymauz' | 'demo-fallback';
};

function extractAnswerFromJson(data: any): string | null {
  const answer =
    data?.choices?.[0]?.message?.content ||
    data?.choices?.[0]?.delta?.content ||
    data?.answer ||
    data?.response ||
    data?.content ||
    data?.message;

  return typeof answer === 'string' && answer.trim() ? answer : null;
}

function extractAnswerFromSse(rawText: string): string | null {
  const chunks: string[] = [];

  for (const line of rawText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const payload = trimmed.replace(/^data:\s*/, '').trim();
    if (!payload || payload === '[DONE]') continue;

    try {
      const parsed = JSON.parse(payload);
      const text = extractAnswerFromJson(parsed);
      if (text) chunks.push(text);
    } catch {
      // Ignore non-JSON SSE keepalive lines.
    }
  }

  const answer = chunks.join('').trim();
  return answer || null;
}

function extractAnswer(rawText: string): string | null {
  const trimmed = rawText.trim();

  if (!trimmed) return null;

  try {
    const data = JSON.parse(trimmed);
    const answer = extractAnswerFromJson(data);
    if (answer) return answer;
  } catch {
    // Not plain JSON. It may be SSE: data: {...}\n\n
  }

  if (trimmed.startsWith('data:') || trimmed.includes('\ndata:')) {
    return extractAnswerFromSse(trimmed);
  }

  return trimmed;
}

export async function askAiNonymauz(messages: ChatMessage[]): Promise<AIResponse> {
  const baseUrl = process.env.AI_NONYMAUZ_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.AI_NONYMAUZ_API_KEY;
  const model = process.env.AI_NONYMAUZ_MODEL || 'ai-nonymauz-support';

  if (!baseUrl || !apiKey || apiKey === 'your-secret-api-key') {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    return {
      provider: 'demo-fallback',
      answer:
        `Demo mode aktif kerana AI_NONYMAUZ_BASE_URL / AI_NONYMAUZ_API_KEY belum diset.\n\n` +
        `Saya sudah terima soalan: "${userMessage}". Selepas env diset di Vercel, jawapan sebenar akan dijana melalui AI-nonymauz backend menggunakan knowledge base client.`
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 900,
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
