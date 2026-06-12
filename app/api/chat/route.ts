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
  groomName?: string;
  brideName?: string;
  majlisDate?: string;
  negeri?: string;
  totalBudget?: number;
  guestTarget?: number;
  checklistSummary?: string;
  budgetSummary?: string[];
  upcomingAppointments?: Array<{ title: string; date: string; time?: string; vendor?: string; location?: string }>;
};

type AppLanguage = 'ms' | 'en';

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

function buildDemoPlannerAnswer(userMessage: string, language: AppLanguage) {
  const isChecklist = /\b(checklist|senarai|task|tugas|todo|to-do)\b/i.test(userMessage);
  const isVendor = /\b(vendor|photographer|caterer|katering|dewan|venue|andaman|makeup|mua|florist)\b/i.test(userMessage);
  const isBudget = /\b(budget|bajet|harga|kos|rm|payment|bayar)\b/i.test(userMessage);
  const isAppointment = /\b(appointment|temujanji|schedule|jadual|booking|book|tempah)\b/i.test(userMessage);
  const isRsvp = /\b(rsvp|guest|tetamu|jemputan|headcount|pax)\b/i.test(userMessage);

  if (language === 'en') {
    if (isChecklist) return 'I can help with that. A clean wedding checklist should be grouped by timing, not just category.\n\nStart with:\n- 12-9 months: date, venue, budget, main vendors\n- 8-6 months: outfits, photographer, catering, guest list\n- 5-3 months: invitation, doorgift, decoration, documents\n- Final month: vendor confirmations, seating, payment balance, day schedule\n\nTell me your wedding date and guest estimate so I can make it more specific.';
    if (isVendor) return 'Good idea. For vendors, shortlist by fit before price.\n\nCompare each vendor on:\n- Availability for your date\n- Package inclusions and hidden charges\n- Deposit and cancellation terms\n- Recent portfolio or reviews\n- Travel fee and setup timing\n\nShare the vendor type and negeri, and I can prepare questions or a WhatsApp message.';
    if (isBudget) return 'Let’s keep the budget practical. Split it into confirmed, estimated, and optional costs.\n\nA simple structure:\n- Venue and catering\n- Outfit and makeup\n- Photo/video\n- Decoration and pelamin\n- Door gifts and invitation\n- Buffer, usually 8-12%\n\nTell me your total budget and guest count, and I’ll suggest a cleaner allocation.';
    if (isAppointment) return 'Sure. For appointments, track three things: who, when, and what decision must be made.\n\nUseful notes:\n- Vendor name\n- Date and time\n- Location or call link\n- Questions to ask\n- Deposit or document needed\n\nGive me the date, time, and vendor, and I’ll help format it.';
    if (isRsvp) return 'For RSVP, separate guests by family side or group first. That makes follow-up easier.\n\nTrack:\n- Name and phone\n- Group\n- Pax count\n- Status: pending, confirmed, declined\n- Notes, such as kids or transport\n\nIf you already have a guest estimate, I can suggest a follow-up plan.';
    return 'I’ve noted that. Here’s a practical next step: turn it into one clear planning action.\n\nTry this:\n- Decide whether it affects checklist, budget, vendor, guest list, or appointment\n- Add the key date or amount if there is one\n- Ask me to draft the next message, task, or reminder\n\nFor example: “Create a checklist for my final month” or “Draft a WhatsApp message to a caterer.”';
  }

  if (isChecklist) return 'Boleh. Checklist kahwin paling senang bila susun ikut masa, bukan ikut kategori semata-mata.\n\nMula dengan:\n- 12-9 bulan: tarikh, dewan, bajet, vendor utama\n- 8-6 bulan: baju, photographer, katering, senarai tetamu\n- 5-3 bulan: kad jemputan, doorgift, dekorasi, dokumen\n- Bulan terakhir: confirm vendor, seating, baki bayaran, tentatif hari majlis\n\nBeritahu tarikh majlis dan anggaran tetamu, saya boleh susun lebih tepat.';
  if (isVendor) return 'Bagus. Untuk vendor, shortlist ikut kesesuaian dulu sebelum harga.\n\nBandingkan setiap vendor pada:\n- Available atau tidak pada tarikh majlis\n- Apa yang termasuk dalam pakej\n- Caj tambahan tersembunyi\n- Deposit dan syarat cancel\n- Portfolio atau review terkini\n- Caj travel dan masa setup\n\nBagi jenis vendor dan negeri, saya boleh bantu sediakan soalan atau mesej WhatsApp.';
  if (isBudget) return 'Jom kemaskan bajet. Pecahkan kepada kos confirm, kos anggaran, dan kos optional.\n\nStruktur mudah:\n- Dewan dan katering\n- Baju dan makeup\n- Photo/video\n- Dekorasi dan pelamin\n- Doorgift dan jemputan\n- Buffer sekitar 8-12%\n\nBeritahu jumlah bajet dan jumlah tetamu, saya boleh cadangkan pecahan yang lebih sesuai.';
  if (isAppointment) return 'Boleh. Untuk appointment, simpan tiga benda: siapa, bila, dan keputusan apa yang perlu dibuat.\n\nNota appointment yang berguna:\n- Nama vendor\n- Tarikh dan masa\n- Lokasi atau link call\n- Soalan yang nak ditanya\n- Deposit atau dokumen yang perlu dibawa\n\nBagi tarikh, masa, dan vendor, saya boleh formatkan untuk calendar.';
  if (isRsvp) return 'Untuk RSVP, asingkan tetamu ikut side keluarga atau group dulu. Nanti follow-up lebih mudah.\n\nTrack benda ini:\n- Nama dan nombor telefon\n- Group tetamu\n- Bilangan pax\n- Status: belum reply, confirm, tidak hadir\n- Nota seperti anak kecil atau transport\n\nKalau ada anggaran tetamu, saya boleh cadangkan cara follow-up.';
  return 'Saya dah noted. Langkah terbaik sekarang ialah tukarkan perkara ini kepada satu tindakan planning yang jelas.\n\nCuba pilih kategori:\n- Checklist\n- Bajet\n- Vendor\n- Tetamu\n- Appointment\n\nContoh: “Buat checklist untuk bulan terakhir” atau “Draft mesej WhatsApp untuk caterer.”';
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
  messages: ChatMessage[],
  language: AppLanguage
) {
  const baseUrl = process.env.AI_NONYMAUZ_BASE_URL?.replace(/\/$/, '');
  const apiKey = process.env.AI_NONYMAUZ_API_KEY;
  const model = process.env.AI_NONYMAUZ_MODEL || 'ai-nonymauz-support';

  if (!baseUrl || !apiKey || apiKey === 'your-secret-api-key') {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const demoAnswer = buildDemoPlannerAnswer(userMessage, language);

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
    const language: AppLanguage = body.language === 'en' ? 'en' : 'ms';
    const languageName = language === 'en' ? 'English' : 'Malay/Bahasa Melayu';
    const plannerContext = (body.plannerContext || {}) as PlannerContext;
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content;

    if (!latestUserMessage || latestUserMessage.trim().length < 2) {
      return new Response(sse({ type: 'error', error: language === 'en' ? 'Please provide a valid question.' : 'Sila masukkan soalan yang sah.' }), {
        status: 400,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' }
      });
    }

    if (isCodingRequest(latestUserMessage)) {
      const redirectMessage = language === 'en'
        ? 'I cannot help create code, HTML, CSS, scripts, apps, or websites. I can still help with non-code wedding planning, such as invitation wording, vendor messages, checklists, timelines, budgets, RSVP planning, and appointment planning.'
        : 'Saya tak boleh bantu cipta kod, HTML, CSS, skrip, app, atau website. Saya masih boleh bantu perancangan kahwin tanpa kod seperti wording jemputan, mesej vendor, checklist, timeline, bajet, RSVP, dan appointment.';

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
      const redirectMessage = language === 'en'
        ? 'I can help create non-code prompts, copy, wording, and templates when they are for your wedding or majlis planning. For example, ask me to write invitation wording, a vendor-message template, a majlis checklist prompt, or RSVP reminder copy.'
        : 'Saya boleh bantu cipta prompt, copy, wording, dan template tanpa kod bila ia berkaitan wedding atau majlis. Contohnya, minta saya tulis wording jemputan, template mesej vendor, prompt checklist majlis, atau copy reminder RSVP.';

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
9. The user selected ${languageName} in the app language toggle. Reply in ${languageName} for all assistant messages, labels, headings, and bullets, even if the user typed in another language. Do not translate or rewrite the user's own typed text when quoting it.

Internal knowledge context:
${context}

Current planner context from the local MajlisMate.ai workspace:
- Groom name: ${plannerContext.groomName || 'not set'}
- Bride name: ${plannerContext.brideName || 'not set'}
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

          await forwardAiNonymauzStream(controller, encoder, aiMessages, language);
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
