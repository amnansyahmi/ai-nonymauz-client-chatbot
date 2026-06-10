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

type PlannerContext = {
  majlisDate?: string;
  negeri?: string;
  totalBudget?: number;
  guestTarget?: number;
  checklistSummary?: string;
  budgetSummary?: string[];
  upcomingAppointments?: Array<{ title: string; date: string; time?: string; vendor?: string; location?: string }>;
};

const WEDDING_RELATED_PATTERN =
  /\b(akad|andaman|baju|banquet|bride|bridal|budget|caterer|catering|ceremony|checklist|decor|dewan|engagement|event|florist|groom|guest|hantaran|hotel|invitation|jemputan|kahwin|kenduri|majlis|makeup|nikah|pelamin|photographer|reception|rsvp|sanding|seating|venue|vendor|wedding)\b/i;

const CODING_REQUEST_PATTERN =
  /\b(html|css|javascript|typescript|react|next\.?js|nextjs|python|php|java|c\+\+|c#|sql|api|code|coding|script|component|function|class|website|landing page|web app|app|software|program)\b/i;

const CREATION_REQUEST_PATTERN =
  /\b(create|buat|generate|write|build|make|design)\b[\s\S]{0,80}\b(prompt|copy|template|caption|message|wording|content)\b/i;

function sse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function isCodingRequest(message: string) {
  return CODING_REQUEST_PATTERN.test(message);
}

function isUnrelatedCreationRequest(message: string) {
  return CREATION_REQUEST_PATTERN.test(message) && !WEDDING_RELATED_PATTERN.test(message);
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
      `MajlisMate.ai sudah terima soalan wedding planner anda: "${userMessage}". Selepas env diset di Vercel, jawapan sebenar akan dijana menggunakan knowledge base MajlisMate.ai.`;

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
    throw new Error(`MajlisMate.ai backend error ${response.status}: ${errorText}`);
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
    const plannerContext = (body.plannerContext || {}) as PlannerContext;
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content;

    if (!latestUserMessage || latestUserMessage.trim().length < 2) {
      return new Response(sse({ type: 'error', error: 'Please provide a valid question.' }), {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
      });
    }

    if (isCodingRequest(latestUserMessage)) {
      const redirectMessage =
        'I cannot help create code, HTML, CSS, scripts, apps, or websites. I can still help with non-code wedding planning, such as invitation wording, vendor messages, checklists, timelines, budgets, RSVP planning, and appointment planning.';

      return new Response(`${sse({ type: 'sources', sources: [] })}${sse({ type: 'delta', text: redirectMessage })}${sse({ type: 'done' })}`, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      });
    }

    if (isUnrelatedCreationRequest(latestUserMessage)) {
      const redirectMessage =
        'I can help create non-code prompts, copy, wording, and templates when they are for your wedding or majlis planning. For example, ask me to write invitation wording, a vendor-message template, a majlis checklist prompt, or RSVP reminder copy.';

      return new Response(`${sse({ type: 'sources', sources: [] })}${sse({ type: 'delta', text: redirectMessage })}${sse({ type: 'done' })}`, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no'
        }
      });
    }

    const selectedDocs = retrieveContext(latestUserMessage, 3);
    const context = formatContext(selectedDocs);
    const clientName = getClientName();
    const chatbotName = process.env.CHATBOT_NAME || 'MajlisMate.ai';

    const systemPrompt = `You are ${chatbotName}, an AI wedding planning assistant for ${clientName}.

Rules:
1. Stay focused on wedding and event planning, but treat adjacent questions as in-scope when they can help the user's wedding.
2. You may help with majlis planning, nikah, sanding, reception, engagement, budgets, vendors, guest lists, seating, timelines, checklists, appointment planning, venue discovery, nearby venue shortlisting, vendor questions, and location-based planning.
3. If the user asks for nearby venues or vendors and no exact location is available, ask for the city/negeri or use the workspace Negeri if it is set. Do not reject the question.
4. Never create or explain code, HTML, CSS, JavaScript, scripts, apps, websites, APIs, or software, even when the subject is wedding-related. Briefly redirect to non-code wedding planning help.
5. If the user asks to create generic prompts, copy, wording, or templates that are not related to wedding, majlis, kahwin, vendor, event, or planning work, do not fulfill it. Briefly redirect them to a wedding-planning version of the request.
6. Use the internal knowledge context first.
7. Do not invent vendor prices, legal advice, medical advice, financial advice, religious rulings, or binding contract advice. If current/local vendor availability is needed, ask for location and suggest what to compare.
8. Be warm, concise, and practical. Prefer 3-6 short bullets unless the user asks for details.
9. Support English and Malay. Reply in the same language as the customer where possible.

Internal knowledge context:
${context}

Current planner context from the local MajlisMate.ai workspace:
- Majlis date: ${plannerContext.majlisDate || 'not set'}
- Negeri: ${plannerContext.negeri || 'not set'}
- Total budget: ${plannerContext.totalBudget ? `RM${plannerContext.totalBudget}` : 'not set'}
- Guest target: ${plannerContext.guestTarget || 'not set'}
- Checklist progress: ${plannerContext.checklistSummary || 'not set'}
- Budget snapshot: ${(plannerContext.budgetSummary || []).join('; ') || 'not set'}
- Upcoming appointments: ${(plannerContext.upcomingAppointments || [])
      .map((appointment) => `${appointment.date}${appointment.time ? ` ${appointment.time}` : ''} - ${appointment.title}`)
      .join('; ') || 'not set'}`;

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
