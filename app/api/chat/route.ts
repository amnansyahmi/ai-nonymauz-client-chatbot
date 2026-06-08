import { NextRequest } from 'next/server';
import { formatContext, getClientName, retrieveContext } from '../../../lib/retrieval';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type IncomingMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

function sse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function extractTextFromJson(data: any): string {
  const text =
    data?.choices?.[0]?.delta?.content ||
    data?.choices?.[0]?.message?.content ||
    data?.delta?.content ||
    data?.answer ||
    data?.response ||
    data?.content ||
    data?.message ||
    '';

  return typeof text === 'string' ? text : '';
}

async function forwardAiNonymauzStream(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  messages: ChatMessage[]
) {
  const baseUrl = process.env.AI_NONYMAUZ_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.AI_NONYMAUZ_API_KEY;
  const model = process.env.AI_NONYMAUZ_MODEL || 'ai-nonymauz-support';

  if (!baseUrl || !apiKey || apiKey === 'your-secret-api-key') {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const demoAnswer =
      `Demo mode aktif kerana AI_NONYMAUZ_BASE_URL / AI_NONYMAUZ_API_KEY belum diset.\n\n` +
      `Saya sudah terima soalan: "${userMessage}". Selepas env diset di Vercel, jawapan sebenar akan dijana melalui AI-nonymauz backend menggunakan knowledge base client.`;

    for (const word of demoAnswer.split(/(\s+)/)) {
      controller.enqueue(encoder.encode(sse({ type: 'delta', text: word })));
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    return;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json, text/plain',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: Number(process.env.AI_NONYMAUZ_MAX_TOKENS || 700),
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI-nonymauz error ${response.status}: ${errorText}`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (!response.body) {
    const text = await response.text();
    controller.enqueue(encoder.encode(sse({ type: 'delta', text })));
    return;
  }

  if (!contentType.includes('text/event-stream')) {
    const raw = await response.text();
    try {
      const parsed = JSON.parse(raw);
      const text = extractTextFromJson(parsed) || raw;
      controller.enqueue(encoder.encode(sse({ type: 'delta', text })));
    } catch {
      controller.enqueue(encoder.encode(sse({ type: 'delta', text: raw })));
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const payload = trimmed.replace(/^data:\s*/, '').trim();
      if (!payload || payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        const text = extractTextFromJson(parsed);
        if (text) controller.enqueue(encoder.encode(sse({ type: 'delta', text })));
      } catch {
        controller.enqueue(encoder.encode(sse({ type: 'delta', text: payload })));
      }
    }
  }

  const tail = buffer.trim();
  if (tail.startsWith('data:')) {
    const payload = tail.replace(/^data:\s*/, '').trim();
    if (payload && payload !== '[DONE]') {
      try {
        const parsed = JSON.parse(payload);
        const text = extractTextFromJson(parsed);
        if (text) controller.enqueue(encoder.encode(sse({ type: 'delta', text })));
      } catch {
        controller.enqueue(encoder.encode(sse({ type: 'delta', text: payload })));
      }
    }
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? (body.messages as IncomingMessage[]) : [];
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content;

    if (!latestUserMessage || latestUserMessage.trim().length < 2) {
      return new Response(sse({ type: 'error', error: 'Please provide a valid question.' }), {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
      });
    }

    const selectedDocs = retrieveContext(latestUserMessage, 3);
    const context = formatContext(selectedDocs);
    const clientName = getClientName();
    const chatbotName = process.env.CHATBOT_NAME || `${clientName} AI Assistant`;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';

    const systemPrompt = `You are ${chatbotName}, a website support and company knowledge chatbot for ${clientName}.

Rules:
1. Answer using the internal knowledge context first.
2. If the knowledge base does not contain the answer, say you do not have enough information and suggest contacting ${supportEmail}.
3. Do not invent prices, policies, warranty decisions, refund approvals, or legal advice.
4. Be friendly, concise, and helpful. Prefer 3-6 short bullets unless the user asks for details.
5. Support English and Malay. Reply in the same language as the customer where possible.
6. If human handover is needed, summarize what information the customer should provide.

Internal knowledge context:
${context}`;

    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map((message) => ({ role: message.role, content: message.content }))
    ];

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              sse({
                type: 'sources',
                sources: selectedDocs.map((doc) => ({ id: doc.id, title: doc.title, category: doc.category }))
              })
            )
          );

          await forwardAiNonymauzStream(controller, encoder, aiMessages);
          controller.enqueue(encoder.encode(sse({ type: 'done' })));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unexpected error';
          controller.enqueue(encoder.encode(sse({ type: 'error', error: message })));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(sse({ type: 'error', error: message }), {
      status: 500,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
    });
  }
}
