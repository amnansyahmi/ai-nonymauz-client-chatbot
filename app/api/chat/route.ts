import { NextRequest } from 'next/server';
import { z } from 'zod';
import { chatRequestSchema, type ChatRequest } from '../../../lib/chatSchema';
import { formatContext, getClientName, retrieveContext, type KnowledgeDoc } from '../../../lib/retrieval';
import { clientKeyFromRequest, SimpleRateLimiter } from '../../../lib/rateLimit';
import { encodeSseError, encodeSseEvent, parseSseEvents, type StreamEvent } from '../../../lib/stream/sse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const limiter = new SimpleRateLimiter({ windowMs: 60_000, max: 30 });

const WEDDING_RELATED_PATTERN =
  /\b(akad|andaman|baju|banquet|bride|bridal|budget|caterer|catering|ceremony|checklist|decor|dewan|engagement|event|florist|groom|guest|hantaran|hotel|invitation|jemputan|kahwin|kenduri|majlis|makeup|nikah|pelamin|photographer|reception|rsvp|sanding|seating|venue|vendor|wedding)\b/i;

const CODING_REQUEST_PATTERN =
  /\b(html|css|javascript|typescript|react|next\.?js|nextjs|python|php|java|c\+\+|c#|sql|api|code|coding|script|component|function|class|website|landing page|web app|app|software|program)\b/i;

const CREATION_REQUEST_PATTERN =
  /\b(create|buat|generate|write|build|make|design)\b[\s\S]{0,80}\b(prompt|copy|template|caption|message|wording|content)\b/i;

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type AppLanguage = 'ms' | 'en';

function sseHeaders(): HeadersInit {
  return {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  };
}

function sseDone(): string {
  return encodeSseEvent({ type: 'done' });
}

function isCodingRequest(message: string) {
  return CODING_REQUEST_PATTERN.test(message);
}

function isUnrelatedCreationRequest(message: string) {
  return CREATION_REQUEST_PATTERN.test(message) && !WEDDING_RELATED_PATTERN.test(message);
}

function buildDemoPlannerAnswer(userMessage: string, language: AppLanguage, voiceMode = false) {
  const isChecklist = /\b(checklist|senarai|task|tugas|todo|to-do)\b/i.test(userMessage);
  const isVendor = /\b(vendor|photographer|caterer|catering|katering|dewan|venue|andaman|makeup|mua|florist|flower|floral|bunga|bouquet|pelamin|dekor|decor|hantaran|kompang|kad|invitation|cenderahati|doorgift|gubahan|baju|gown|tailor|jahit|kek|cake|dj|band|kahwin\s+\w+)\b/i.test(userMessage);
  const isBudget = /\b(budget|bajet|harga|kos|rm|payment|bayar|deposit)\b/i.test(userMessage);
  const isAppointment = /\b(appointment|temujanji|schedule|jadual|booking|book|tempah)\b/i.test(userMessage);
  const isRsvp = /\b(rsvp|guest|tetamu|jemputan|headcount|pax)\b/i.test(userMessage);
  const isPlanning = /\b(what should i|where do i start|this month|next step|focus|priorit|apa.*(buat|patut)|bulan ini|mula|fokus|seterusnya)\b/i.test(userMessage);

  // Voice mode: short, conversational, no markdown — meant to be spoken aloud.
  if (voiceMode) {
    if (language === 'en') {
      if (isChecklist) return 'Sure, I can help with your checklist. Tell me your wedding date and rough guest count, and I will suggest the key tasks.';
      if (isVendor) return 'For vendors, check availability and what is included before price. Tell me the vendor type and your state, and I can prepare questions.';
      if (isBudget) return 'Let us keep the budget simple. Tell me your total budget and guest count, and I will suggest a breakdown.';
      if (isAppointment) return 'Okay. Give me the vendor, date, and time, and I will help set up the appointment.';
      if (isRsvp) return 'For RSVP, group your guests first, then track who is confirmed. Want me to start a follow-up plan?';
      if (isPlanning) return 'This month, focus on your most urgent tasks first. Want me to suggest what to prioritise based on your timeline?';
      return 'I can help with that. Tell me a bit more, and I will turn it into a clear next step for your wedding.';
    }
    if (isChecklist) return 'Boleh, saya boleh bantu checklist. Beritahu tarikh majlis dan anggaran tetamu, nanti saya cadangkan task penting.';
    if (isVendor) return 'Untuk vendor, semak available dan apa yang termasuk dulu sebelum harga. Bagi jenis vendor dan negeri, saya boleh sediakan soalan.';
    if (isBudget) return 'Jom kemaskan bajet. Beritahu jumlah bajet dan bilangan tetamu, nanti saya cadangkan pecahan.';
    if (isAppointment) return 'Okay. Bagi nama vendor, tarikh, dan masa, nanti saya bantu set appointment.';
    if (isRsvp) return 'Untuk RSVP, asingkan tetamu ikut group dulu, lepas tu track siapa dah confirm. Nak saya mulakan pelan follow-up?';
    if (isPlanning) return 'Bulan ni, fokus pada task paling penting dulu. Nak saya cadangkan keutamaan ikut timeline anda?';
    return 'Boleh, saya bantu. Cerita sikit lagi, nanti saya tukarkan jadi satu langkah jelas untuk majlis anda.';
  }

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

function cleanDemoText(text: string) {
  return text
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"');
}

async function forwardAiNonymauzStream(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  messages: ChatMessage[],
  language: AppLanguage,
  voiceMode = false
) {
  const env = {
    baseUrl: process.env.AI_NONYMAUZ_BASE_URL?.replace(/\/$/, '') ?? '',
    apiKey: process.env.AI_NONYMAUZ_API_KEY ?? '',
    model: process.env.AI_NONYMAUZ_MODEL || 'ai-nonymauz-support',
    maxTokens: Number(process.env.AI_NONYMAUZ_MAX_TOKENS || 700)
  };

  if (!env.baseUrl || !env.apiKey || env.apiKey === 'your-secret-api-key') {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const demoAnswer = cleanDemoText(buildDemoPlannerAnswer(userMessage, language, voiceMode));

    for (const word of demoAnswer.split(/(\s+)/)) {
      controller.enqueue(encoder.encode(encodeSseEvent({ type: 'delta', text: word })));
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    return;
  }

  const response = await fetch(`${env.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json, text/plain',
      Authorization: `Bearer ${env.apiKey}`
    },
    body: JSON.stringify({
      model: env.model,
      messages,
      temperature: 0.2,
      max_tokens: env.maxTokens,
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
    controller.enqueue(encoder.encode(encodeSseEvent({ type: 'delta', text })));
    return;
  }

  if (!contentType.includes('text/event-stream')) {
    const raw = await response.text();
    try {
      const parsed: unknown = JSON.parse(raw);
      const text = parsed && typeof parsed === 'object' ? extractFromUnknown(parsed) : '';
      controller.enqueue(encoder.encode(encodeSseEvent({ type: 'delta', text: text || raw })));
    } catch {
      controller.enqueue(encoder.encode(encodeSseEvent({ type: 'delta', text: raw })));
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
    const { events, remaining } = parseSseEvents(buffer);
    buffer = remaining;
    forwardSseEvents(controller, encoder, events);
  }

  const tail = parseSseEvents(buffer);
  forwardSseEvents(controller, encoder, tail.events);
}

function extractFromUnknown(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const record = data as Record<string, unknown>;
  const choices = record.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === 'object') {
    const choice = choices[0] as Record<string, unknown>;
    const delta = choice.delta as Record<string, unknown> | undefined;
    const message = choice.message as Record<string, unknown> | undefined;
    if (delta && typeof delta.content === 'string') return delta.content;
    if (message && typeof message.content === 'string') return message.content;
  }
  for (const key of ['delta', 'answer', 'response', 'content', 'message']) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function forwardSseEvents(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  events: StreamEvent[]
) {
  for (const event of events) {
    if (event.type === 'delta' && event.text) {
      controller.enqueue(encoder.encode(encodeSseEvent({ type: 'delta', text: event.text })));
    } else if (event.type === 'error') {
      controller.enqueue(encoder.encode(encodeSseError(event.error)));
    }
  }
}

function buildSystemPrompt(
  language: AppLanguage,
  plannerContext: ChatRequest['plannerContext'],
  selectedDocs: KnowledgeDoc[],
  voiceMode?: boolean
) {
  const languageName = language === 'en' ? 'English' : 'Malay/Bahasa Melayu';
  const clientName = getClientName();
  const chatbotName = process.env.CHATBOT_NAME || 'MajlisMate.ai';
  const context = formatContext(selectedDocs);
  const todayIso = new Date().toISOString().split('T')[0];

  const actionsRule = `\n12. PLANNER ACTIONS: When the user clearly asks you to add or change something concrete in their planner — a checklist task, a budget item, an appointment, or a guest — AND you already have the needed details, propose actions for one-tap confirmation.${voiceMode ? ' In this voice conversation, keep your spoken reply to 1-3 short sentences AND still place the action block at the very end (it is hidden from speech).' : ''} After your normal reply, append exactly one block on its own lines:
${'<<<MM_ACTIONS'}
[ {"type":"add_checklist_item","text":"..."} ]
${'MM_ACTIONS>>>'}
Supported actions (use only these types and fields):
- {"type":"add_checklist_item","text":string,"deadline":"YYYY-MM-DD"?,"phase":string?}
- {"type":"add_budget_item","category":string,"planned":number(RM)?,"note":string?}
- {"type":"add_appointment","title":string,"date":"YYYY-MM-DD","time":"HH:MM"?,"vendor":string?,"location":string?}
- {"type":"add_guest","name":string,"pax":number?,"group":string?,"phone":string?}
- {"type":"update_budget","category":string,"planned":number?,"actual":number?,"paid":number?} (use when the user reports a quote/cost or a payment made; match an existing budget category from the budget snapshot)
- {"type":"complete_task","text":string} (use when the user says a task is done; text should match an existing checklist item)
- {"type":"update_appointment","title":string,"date":"YYYY-MM-DD"?,"time":"HH:MM"?,"status":"planned"|"confirmed"|"done"?} (title should match an existing appointment)
- {"type":"set_profile","majlisDate":"YYYY-MM-DD"?,"negeri":string?,"totalBudget":number?,"guestTarget":number?} (use when the user states their wedding date, state, total budget, or guest count)
Action rules: Today is ${todayIso}; resolve any relative dates (e.g. "next month", "minggu depan") to absolute YYYY-MM-DD using today and the majlis date. Never invent prices, dates, names, or phone numbers the user did not provide — omit optional fields you are unsure about. Only include actions you are confident the user wants now. Do NOT mention the block, JSON, or "actions" in your visible reply; the app renders confirm buttons automatically. If the user is only asking a question or no concrete change is requested, do not output the block at all.`;

  return `You are ${chatbotName}, an AI wedding planning assistant for ${clientName}.

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
10. When answering questions about official Islamic marriage procedures in Malaysia — including prosedur nikah, kursus pra-perkahwinan, kebenaran berkahwin, SPPIM, or pendaftaran nikah — use the internal knowledge context which is sourced from the official Malaysia government portal (malaysia.gov.my). Cite the source as "Sumber: malaysia.gov.my" and always remind the couple that procedures and fees differ by state, so they should verify with their state Jabatan Agama Islam (JAI) or Pejabat Agama Islam Daerah (PAID).${voiceMode ? '\n11. This is a voice conversation. Answer in 1–3 short spoken sentences only. No markdown, no bullet lists, no numbered lists, no headings, no asterisks. Speak naturally and conversationally as if talking aloud.' : ''}${actionsRule}

Internal knowledge context:
${context}

Current planner context from the local MajlisMate.ai workspace:
- Groom name: ${plannerContext?.groomName || 'not set'}
- Bride name: ${plannerContext?.brideName || 'not set'}
- Majlis date: ${plannerContext?.majlisDate || 'not set'}
- Negeri: ${plannerContext?.negeri || 'not set'}
- Total budget: ${plannerContext?.totalBudget ? `RM${plannerContext.totalBudget}` : 'not set'}
- Guest target: ${plannerContext?.guestTarget || 'not set'}
- Checklist progress: ${plannerContext?.checklistSummary || 'not set'}
- Budget snapshot: ${(plannerContext?.budgetSummary || []).join('; ') || 'not set'}
  - Upcoming appointments: ${(plannerContext?.upcomingAppointments || [])
      .map((appointment: { date: string; time?: string; title: string }) =>
        `${appointment.date}${appointment.time ? ` ${appointment.time}` : ''} - ${appointment.title}`
      )
      .join('; ') || 'not set'}`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const key = clientKeyFromRequest(request);
  const limit = limiter.hit(key);
  if (!limit.allowed) {
    return new Response(encodeSseError('Too many requests. Please slow down.'), {
      status: 429,
      headers: {
        ...sseHeaders(),
        'Retry-After': String(Math.ceil(limit.resetInMs / 1000))
      }
    });
  }

  try {
    const raw = await request.json();
    const parsed = chatRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(encodeSseError('Invalid request payload.'), {
        status: 400,
        headers: sseHeaders()
      });
    }

    const { messages, language, plannerContext, voiceMode } = parsed.data;
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content?.trim();

    if (!latestUserMessage || latestUserMessage.length < 2) {
      return new Response(
        encodeSseError(language === 'en' ? 'Please provide a valid question.' : 'Sila masukkan soalan yang sah.'),
        { status: 400, headers: sseHeaders() }
      );
    }

    if (isCodingRequest(latestUserMessage)) {
      const redirect = language === 'en'
        ? 'I cannot help create code, HTML, CSS, scripts, apps, or websites. I can still help with non-code wedding planning, such as invitation wording, vendor messages, checklists, timelines, budgets, RSVP planning, and appointment planning.'
        : 'Saya tak boleh bantu cipta kod, HTML, CSS, skrip, app, atau website. Saya masih boleh bantu perancangan kahwin tanpa kod seperti wording jemputan, mesej vendor, checklist, timeline, bajet, RSVP, dan appointment.';
      return new Response(
        `${encodeSseEvent({ type: 'sources', sources: [] })}${encodeSseEvent({ type: 'delta', text: redirect })}${sseDone()}`,
        { headers: sseHeaders() }
      );
    }

    if (isUnrelatedCreationRequest(latestUserMessage)) {
      const redirect = language === 'en'
        ? 'I can help create non-code prompts, copy, wording, and templates when they are for your wedding or majlis planning. For example, ask me to write invitation wording, a vendor-message template, a majlis checklist prompt, or RSVP reminder copy.'
        : 'Saya boleh bantu cipta prompt, copy, wording, dan template tanpa kod bila ia berkaitan wedding atau majlis. Contohnya, minta saya tulis wording jemputan, template mesej vendor, prompt checklist majlis, atau copy reminder RSVP.';
      return new Response(
        `${encodeSseEvent({ type: 'sources', sources: [] })}${encodeSseEvent({ type: 'delta', text: redirect })}${sseDone()}`,
        { headers: sseHeaders() }
      );
    }

    const selectedDocs = retrieveContext(latestUserMessage, 3);
    const systemPrompt = buildSystemPrompt(language, plannerContext, selectedDocs, voiceMode);
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map((message) => ({ role: message.role, content: message.content }))
    ];

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              encodeSseEvent({
                type: 'sources',
                sources: selectedDocs.map((doc) => ({ id: doc.id, title: doc.title, category: doc.category }))
              })
            )
          );

          await forwardAiNonymauzStream(controller, encoder, aiMessages, language, voiceMode);
          controller.enqueue(encoder.encode(sseDone()));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unexpected error';
          controller.enqueue(encoder.encode(encodeSseError(message)));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: sseHeaders() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(encodeSseError('Invalid request payload.'), {
        status: 400,
        headers: sseHeaders()
      });
    }
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(encodeSseError(message), {
      status: 500,
      headers: sseHeaders()
    });
  }
}
