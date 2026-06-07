type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AIResponse = {
  answer: string;
  provider: 'ai-nonymauz' | 'demo-fallback';
};

export async function askAiNonymauz(messages: ChatMessage[]): Promise<AIResponse> {
  const baseUrl = process.env.AI_NONYMAUZ_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.AI_NONYMAUZ_API_KEY;
  const model = process.env.AI_NONYMAUZ_MODEL || 'ai-nonymauz-support';

  if (!baseUrl || !apiKey) {
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
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 900
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI-nonymauz error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;

  if (!answer || typeof answer !== 'string') {
    throw new Error('AI-nonymauz returned an empty or unsupported response format.');
  }

  return { answer, provider: 'ai-nonymauz' };
}
