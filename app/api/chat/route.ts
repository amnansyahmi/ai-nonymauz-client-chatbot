import { NextRequest } from 'next/server';
import { z } from 'zod';
import { chatRequestSchema, type ChatRequest } from '../../../lib/chatSchema';
import { formatContext, getClientName, retrieveContext, type KnowledgeDoc } from '../../../lib/retrieval';
import { clientKeyFromRequest, SimpleRateLimiter } from '../../../lib/rateLimit';
import { encodeSseError, encodeSseEvent, parseSseEvents, type StreamEvent } from '../../../lib/stream/sse';
import { MM_CLARIFY_OPEN, MM_CLARIFY_CLOSE } from '../../../lib/planner/chatClarify';
import { MM_ACTIONS_OPEN, MM_ACTIONS_CLOSE } from '../../../lib/planner/chatActions';
import {
  detectPlannerDuplicate,
  findChecklistDuplicate,
  hasAddIntent,
  wantsNewEntry,
  wantsMarkDone,
  buildDuplicateClarifyMessage,
  buildMarkDoneMessage,
  buildStillOpenMessage
} from '../../../lib/planner/duplicateGuard';
import { getSourceConfidence } from '../../../lib/ai/sourceConfidence';

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

function buildDemoPlannerAnswer(
  userMessage: string,
  language: AppLanguage,
  voiceMode = false,
  plannerContext?: ChatRequest['plannerContext']
) {
  const hasDate = Boolean(plannerContext?.majlisDate);
  const hasGuests = Boolean(plannerContext?.guestTarget);
  const hasBudget = Boolean(plannerContext?.totalBudget);
  const isChecklist = /\b(checklist|senarai|task|tugas|todo|to-do)\b/i.test(userMessage);
  const isVendor = /\b(vendor|photographer|caterer|catering|katering|dewan|venue|andaman|makeup|mua|florist|flower|floral|bunga|bouquet|pelamin|dekor|decor|hantaran|kompang|kad|invitation|cenderahati|doorgift|gubahan|baju|gown|tailor|jahit|kek|cake|dj|band|kahwin\s+\w+)\b/i.test(userMessage);
  const isBudget = /\b(budget|bajet|harga|kos|rm|payment|bayar|deposit)\b/i.test(userMessage);
  const isAppointment = /\b(appointment|temujanji|schedule|jadual|booking|book|tempah)\b/i.test(userMessage);
  const isRsvp = /\b(rsvp|guest|tetamu|jemputan|headcount|pax)\b/i.test(userMessage);
  const isPlanning = /\b(what should i|where do i start|this month|next step|focus|priorit|apa.*(buat|patut)|bulan ini|mula|fokus|seterusnya)\b/i.test(userMessage);
  const isHelpRequest = /\b(boleh tolong|tolong saya|help me|apa boleh|what can you|boleh buat apa|buat apa|boleh bantu|can you help|nak mula|where do i start|macam mana nak guna|how to use|feature|ciri|fungsi|capabilities|kemampuan)\b/i.test(userMessage);
  const isHivTest = /\bhiv\b/i.test(userMessage);
  const isKursusPra = /\b(kursus\s+pra|kppim|pra[\s-]perkahwinan)\b/i.test(userMessage);

  // Generic duplicate handling (replaces the old HIV-specific code). The clarify
  // chips carry the topic forward, so these follow-up branches can re-detect it.
  const newEntryRequested = wantsNewEntry(userMessage);
  const checklistDuplicate = findChecklistDuplicate(userMessage, plannerContext?.checklistSummary);
  const isCheckingExisting = /\b(nak semak|just checking|sama.*semak|checking on|semak je)\b/i.test(userMessage);

  // "Mark <topic> done" clarify-chip reply → emit a complete_task action.
  if (!voiceMode && wantsMarkDone(userMessage) && checklistDuplicate) {
    return buildMarkDoneMessage(checklistDuplicate, language);
  }

  // "Same one — just checking" clarify-chip reply → confirm it is still open.
  if (!voiceMode && isCheckingExisting) {
    return buildStillOpenMessage(checklistDuplicate, language);
  }

  // Topic already in the checklist and the user did NOT ask for a new entry →
  // ask whether they mean the same item instead of offering to add it again.
  if (!voiceMode && checklistDuplicate && !newEntryRequested) {
    return buildDuplicateClarifyMessage(checklistDuplicate, language);
  }

  // Feature discovery — show what the app can do with tappable entry points.
  if (isHelpRequest && !voiceMode) {
    if (language === 'en') {
      return `Of course! Here's what I can help you with:\n\n**Planning Tools**\n- Checklist — build your task list by phase (12 months, 6 months, final month)\n- Budget — track planned vs actual spending across all categories\n- Calendar — schedule vendor appointments, fittings, and tastings\n\n**Guest & Vendor**\n- Guest list & RSVP link — manage guests and share a beautiful invite link\n- Vendor guidance — shortlist vendors, draft WhatsApp messages, ask the right questions\n\n**Malaysian Wedding Guide**\n- Nikah procedure, required documents, kursus pra-perkahwinan, and SPPIM\n- Pricing ranges, adat, and planning tips specific to Malaysia\n\nWhere would you like to start?\n${MM_CLARIFY_OPEN}\n["Build my wedding checklist", "Plan my budget", "Manage guests & RSVP", "Explain nikah procedure"]\n${MM_CLARIFY_CLOSE}`;
    }
    return `Boleh! Ini yang saya boleh bantu:\n\n**Alat Perancangan**\n- Checklist — susun task ikut fasa (12 bulan, 6 bulan, bulan terakhir)\n- Bajet — jejak perbelanjaan dirancang vs sebenar merentas semua kategori\n- Kalendar — jadualkan appointment vendor, fitting, dan food tasting\n\n**Tetamu & Vendor**\n- Senarai tetamu & pautan RSVP — urus tetamu dan kongsi pautan jemputan yang cantik\n- Panduan vendor — shortlist vendor, draf mesej WhatsApp, tanya soalan yang betul\n\n**Panduan Perkahwinan Malaysia**\n- Prosedur nikah, dokumen diperlukan, kursus pra-perkahwinan, dan SPPIM\n- Anggaran harga vendor, adat, dan tip perancangan khusus Malaysia\n\nNak mula dari mana?\n${MM_CLARIFY_OPEN}\n["Buat checklist majlis saya", "Rancang bajet perkahwinan", "Urus senarai tetamu & RSVP", "Terangkan prosedur nikah"]\n${MM_CLARIFY_CLOSE}`;
  }

  if (isHivTest || isKursusPra) {
    // Same one-tap action in voice and text. In voice the spoken pipeline strips
    // everything from MM_ACTIONS onward, so only the sentence is read aloud while
    // the "add to checklist" chip still appears.
    const hivActionEn = JSON.stringify([{ type: 'add_checklist_item', text: 'HIV test (kursus pra-perkahwinan requirement)', reason: 'Mandatory for nikah registration at JAI/PAID', phase: '3-6 months before wedding' }]);
    const hivActionMs = JSON.stringify([{ type: 'add_checklist_item', text: 'Buat ujian HIV (syarat kursus pra-perkahwinan)', reason: 'Wajib untuk pendaftaran nikah di JAI/PAID', phase: '3-6 bulan sebelum majlis' }]);
    if (voiceMode) {
      if (language === 'en') return `An HIV test is required as part of the kursus pra-perkahwinan for Muslim marriage in Malaysia. Get it done at a government health clinic at least three months before your wedding. Want me to add it to your checklist?\n${MM_ACTIONS_OPEN}\n${hivActionEn}\n${MM_ACTIONS_CLOSE}`;
      return `Ujian HIV wajib untuk kursus pra-perkahwinan perkahwinan Islam di Malaysia. Buat di Klinik Kesihatan kerajaan, sekurang-kurangnya tiga bulan sebelum majlis. Nak saya tambah ke checklist?\n${MM_ACTIONS_OPEN}\n${hivActionMs}\n${MM_ACTIONS_CLOSE}`;
    }
    if (language === 'en') {
      const action = hivActionEn;
      return `An HIV test is mandatory for Muslim marriages in Malaysia, required as part of the **Kursus Pra-Perkahwinan** registration.\n\n**When to do it:**\n- At least 3–6 months before the wedding\n- Before or during kursus pra-perkahwinan registration at your state JAI\n- Can be done at a government health clinic (Klinik Kesihatan) or approved private clinic\n\n**What to bring after:**\n- Test results when registering your nikah at JAI or PAID\n\n*Source: malaysia.gov.my — procedures differ by state, verify with your state JAI or PAID.*\n${MM_ACTIONS_OPEN}\n${action}\n${MM_ACTIONS_CLOSE}`;
    }
    const action = hivActionMs;
    return `Ujian HIV adalah wajib untuk perkahwinan Islam di Malaysia, sebagai syarat pendaftaran **Kursus Pra-Perkahwinan**.\n\n**Bila kena buat:**\n- Sekurang-kurangnya 3–6 bulan sebelum majlis\n- Sebelum atau semasa mendaftar kursus pra-perkahwinan di JAI negeri anda\n- Boleh dibuat di mana-mana Klinik Kesihatan kerajaan atau klinik swasta yang diiktiraf\n\n**Apa yang perlu dibawa selepas:**\n- Keputusan ujian semasa mendaftar nikah di Jabatan Agama Islam (JAI) atau Pejabat Agama Islam Daerah (PAID)\n\n*Sumber: malaysia.gov.my — prosedur berbeza mengikut negeri, semak dengan JAI atau PAID negeri anda.*\n${MM_ACTIONS_OPEN}\n${action}\n${MM_ACTIONS_CLOSE}`;
  }

  // Voice mode: short, conversational, no markdown — meant to be spoken aloud.
  // Planner-aware: reference what we already know and offer the next step
  // instead of re-asking for details the couple has already given.
  if (voiceMode) {
    const daysLeft = plannerContext?.daysLeft;
    const daysPhraseEn = typeof daysLeft === 'number' && daysLeft >= 0 ? `With ${daysLeft} days to go, ` : '';
    const daysPhraseMs = typeof daysLeft === 'number' && daysLeft >= 0 ? `Majlis tinggal ${daysLeft} hari, ` : '';
    if (language === 'en') {
      if (isChecklist) return hasDate && hasGuests
        ? `${daysPhraseEn}I have your date and guest target. Want me to generate your checklist now?`
        : 'Sure, I can help with your checklist. Tell me your wedding date and rough guest count, and I will suggest the key tasks.';
      if (isVendor) return 'For vendors, check availability and what is included before price. Tell me the vendor type, and I can prepare questions or a WhatsApp message.';
      if (isBudget) return hasBudget && hasGuests
        ? 'I have your budget and guest target. Want me to suggest a full allocation now?'
        : 'Let us keep the budget simple. Tell me your total budget and guest count, and I will suggest a breakdown.';
      if (isAppointment) return 'Okay. Give me the vendor, date, and time, and I will help set up the appointment.';
      if (isRsvp) return 'For RSVP, group your guests first, then track who is confirmed. Want me to start a follow-up plan?';
      if (isPlanning) return daysPhraseEn
        ? `${daysPhraseEn}focus on your most urgent tasks first. Want me to suggest what to prioritise?`
        : 'Focus on your most urgent tasks first. Want me to suggest what to prioritise?';
      return 'I can help with that. Tell me a bit more, and I will turn it into a clear next step for your wedding.';
    }
    if (isChecklist) return hasDate && hasGuests
      ? `${daysPhraseMs}saya dah ada tarikh dan anggaran tetamu. Nak saya jana checklist sekarang?`
      : 'Boleh, saya boleh bantu checklist. Beritahu tarikh majlis dan anggaran tetamu, nanti saya cadangkan task penting.';
    if (isVendor) return 'Untuk vendor, semak available dan apa yang termasuk dulu sebelum harga. Bagi jenis vendor, saya boleh sediakan soalan atau mesej WhatsApp.';
    if (isBudget) return hasBudget && hasGuests
      ? 'Saya dah ada bajet dan anggaran tetamu. Nak saya cadangkan pecahan penuh sekarang?'
      : 'Jom kemaskan bajet. Beritahu jumlah bajet dan bilangan tetamu, nanti saya cadangkan pecahan.';
    if (isAppointment) return 'Okay. Bagi nama vendor, tarikh, dan masa, nanti saya bantu set appointment.';
    if (isRsvp) return 'Untuk RSVP, asingkan tetamu ikut group dulu, lepas tu track siapa dah confirm. Nak saya mulakan pelan follow-up?';
    if (isPlanning) return daysPhraseMs
      ? `${daysPhraseMs}fokus pada task paling penting dulu. Nak saya cadangkan keutamaan?`
      : 'Fokus pada task paling penting dulu. Nak saya cadangkan keutamaan?';
    return 'Boleh, saya bantu. Cerita sikit lagi, nanti saya tukarkan jadi satu langkah jelas untuk majlis anda.';
  }

  if (language === 'en') {
    if (isChecklist) return `I can help with that. A clean wedding checklist should be grouped by timing, not just category.\n\nStart with:\n- 12-9 months: date, venue, budget, main vendors\n- 8-6 months: outfits, photographer, catering, guest list\n- 5-3 months: invitation, doorgift, decoration, documents\n- Final month: vendor confirmations, seating, payment balance, day schedule\n\n${hasDate && hasGuests ? 'I have your date and guest target — want me to generate the checklist now?' : 'Tell me your wedding date and guest estimate so I can make it more specific.'}`;
    if (isVendor) return 'Good idea. For vendors, shortlist by fit before price.\n\nCompare each vendor on:\n- Availability for your date\n- Package inclusions and hidden charges\n- Deposit and cancellation terms\n- Recent portfolio or reviews\n- Travel fee and setup timing\n\nShare the vendor type and negeri, and I can prepare questions or a WhatsApp message.';
    if (isBudget) return `Here’s a realistic Malaysian wedding budget structure.\n\nFor most weddings in Malaysia, **venue + catering takes 50–60%** of the total. Many dewan offer all-in *pakej majlis* (RM60–120/pax) bundling hall, food, basic decor, and PA — always ask what is included before comparing prices separately.\n\nTypical breakdown:\n- **Venue + Catering**: 50–60% (pakej dewan RM60–120/pax · hotel RM90–200/pax · or separate hall + caterer RM25–55/pax)\n- **Pelamin + Dekorasi**: 8–12%\n- **Photography + Videography**: 6–8% (RM4,500–14,000 combined)\n- **Baju Pengantin + MUA**: 6–8%\n- **Kad + Cenderahati**: 3–5%\n- **Hantaran + lain-lain**: 5–8%\n- **Buffer / Contingency**: min 10–15%\n\nAll-in benchmark per pax: RM80–140 (budget) · RM140–220 (mid-range) · RM220–450+ (premium).\n\n${hasBudget && hasGuests ? 'I have your budget and guest target — want me to suggest a full allocation now?' : 'Tell me your total budget, guest count, and negeri so I can give you a realistic breakdown.'}`;
    if (isAppointment) return 'Sure. For appointments, track three things: who, when, and what decision must be made.\n\nUseful notes:\n- Vendor name\n- Date and time\n- Location or call link\n- Questions to ask\n- Deposit or document needed\n\nGive me the date, time, and vendor, and I’ll help format it.';
    if (isRsvp) return 'For RSVP, separate guests by family side or group first. That makes follow-up easier.\n\nTrack:\n- Name and phone\n- Group\n- Pax count\n- Status: pending, confirmed, declined\n- Notes, such as kids or transport\n\nIf you already have a guest estimate, I can suggest a follow-up plan.';
    return `Got it — happy to help with that. Could you tell me a bit more so I can give you something useful? For example, you can ask me to build a checklist, suggest a budget breakdown, shortlist vendors, draft a WhatsApp message, or set up an appointment.`;
  }

  if (isChecklist) return `Boleh. Checklist kahwin paling senang bila susun ikut masa, bukan ikut kategori semata-mata.\n\nMula dengan:\n- 12-9 bulan: tarikh, dewan, bajet, vendor utama\n- 8-6 bulan: baju, photographer, katering, senarai tetamu\n- 5-3 bulan: kad jemputan, doorgift, dekorasi, dokumen\n- Bulan terakhir: confirm vendor, seating, baki bayaran, tentatif hari majlis\n\n${hasDate && hasGuests ? 'Saya dah ada tarikh dan guest target — nak saya jana checklist sekarang?' : 'Beritahu tarikh majlis dan anggaran tetamu, saya boleh susun lebih tepat.'}`;
  if (isVendor) return 'Bagus. Untuk vendor, shortlist ikut kesesuaian dulu sebelum harga.\n\nBandingkan setiap vendor pada:\n- Available atau tidak pada tarikh majlis\n- Apa yang termasuk dalam pakej\n- Caj tambahan tersembunyi\n- Deposit dan syarat cancel\n- Portfolio atau review terkini\n- Caj travel dan masa setup\n\nBagi jenis vendor dan negeri, saya boleh bantu sediakan soalan atau mesej WhatsApp.';
  if (isBudget) return `Ini struktur bajet perkahwinan Malaysia yang realistik.\n\nUntuk kebanyakan majlis di Malaysia, **dewan + katering ambil 50–60%** daripada jumlah bajet. Ramai pasangan ambil *pakej majlis* all-in (RM60–120/pax) yang dah termasuk dewan, makanan, dekorasi asas, dan PA — tanya dulu apa yang termasuk sebelum bandingkan harga berasingan.\n\nPecahan biasa:\n- **Dewan + Katering**: 50–60% (pakej dewan RM60–120/pax · hotel RM90–200/pax · atau dewan + caterer berasingan RM25–55/pax)\n- **Pelamin + Dekorasi**: 8–12%\n- **Fotografi + Videografi**: 6–8% (RM4,500–14,000 pakej)\n- **Baju Pengantin + MUA + Andaman**: 6–8%\n- **Kad + Cenderahati**: 3–5%\n- **Hantaran + lain-lain**: 5–8%\n- **Buffer / Kontingensi**: min 10–15%\n\nAnggaran kos semua-sekali per pax: RM80–140 (bajet) · RM140–220 (sederhana) · RM220–450+ (premium).\n\n${hasBudget && hasGuests ? 'Saya dah ada bajet dan guest target — nak saya cadangkan pecahan penuh sekarang?' : 'Beritahu jumlah bajet, bilangan tetamu, dan negeri supaya saya boleh cadangkan pecahan yang realistik.'}`;
  if (isAppointment) return 'Boleh. Untuk appointment, simpan tiga benda: siapa, bila, dan keputusan apa yang perlu dibuat.\n\nNota appointment yang berguna:\n- Nama vendor\n- Tarikh dan masa\n- Lokasi atau link call\n- Soalan yang nak ditanya\n- Deposit atau dokumen yang perlu dibawa\n\nBagi tarikh, masa, dan vendor, saya boleh formatkan untuk calendar.';
  if (isRsvp) return 'Untuk RSVP, asingkan tetamu ikut side keluarga atau group dulu. Nanti follow-up lebih mudah.\n\nTrack benda ini:\n- Nama dan nombor telefon\n- Group tetamu\n- Bilangan pax\n- Status: belum reply, confirm, tidak hadir\n- Nota seperti anak kecil atau transport\n\nKalau ada anggaran tetamu, saya boleh cadangkan cara follow-up.';
  return `Okay, boleh cerita sikit lagi? Saya boleh bantu lebih tepat kalau tahu apa yang anda fikir. Contohnya, boleh minta saya buat checklist, cadangkan pecahan bajet, cari vendor, draftkan mesej WhatsApp, atau tetapkan appointment.`;
}

/**
 * Demo-mode clarification: when the backend isn't configured, still demonstrate
 * the "ask before acting" behavior for clearly-ambiguous add requests by asking
 * one question and emitting a clarify block of tappable options.
 */
function buildDemoClarification(
  userMessage: string,
  language: AppLanguage,
  plannerContext?: ChatRequest['plannerContext']
): string | null {
  const isMs = language === 'ms';
  const msg = userMessage.toLowerCase();
  const wantsAdd = /\b(tambah|add|buat|create|nak|cari|find|set|setkan|book|tempah|cadang|suggest)\b/.test(msg);
  if (!wantsAdd) return null;

  const block = (options: string[]) => `${MM_CLARIFY_OPEN}\n${JSON.stringify(options)}\n${MM_CLARIFY_CLOSE}`;

  const hasNegeri = Boolean(plannerContext?.negeri);
  const hasGuestTarget = Boolean(plannerContext?.guestTarget);
  const hasBudget = Boolean(plannerContext?.totalBudget);
  const guestOptions = isMs ? ['Bawah 100', '100-200', '200-300', '300+'] : ['Under 100', '100-200', '200-300', '300+'];
  const negeriOptions = ['Selangor', 'Kuala Lumpur', 'Johor', 'Pulau Pinang'];
  const budgetOptions = isMs
    ? ['Bawah RM30k', 'RM30k-RM60k', 'RM60k-RM100k', 'RM100k+']
    : ['Under RM30k', 'RM30k-RM60k', 'RM60k-RM100k', 'RM100k+'];

  // Checklist: ask only for the single most important MISSING input.
  const mentionsChecklist = /\b(checklist|senarai tugas|senarai task|to-?do|todo)\b/.test(msg);
  if (mentionsChecklist) {
    if (!hasGuestTarget) {
      const q = isMs ? 'Boleh — berapa guest target majlis anda?' : 'Sure — what is your guest target?';
      return `${q}\n${block(guestOptions)}`;
    }
    if (!hasNegeri) {
      const q = isMs ? 'Boleh — majlis dekat negeri mana?' : 'Sure — which state is the wedding in?';
      return `${q}\n${block(negeriOptions)}`;
    }
    return null;
  }

  // Budget suggestion: needs total budget and guest target to be useful.
  const budgetMentioned = /\b(bajet|budget)\b/.test(msg);
  if (budgetMentioned) {
    if (!hasBudget && !/\d/.test(msg)) {
      const q = isMs ? 'Boleh — berapa jumlah bajet keseluruhan?' : 'Sure — what is your total budget?';
      return `${q}\n${block(budgetOptions)}`;
    }
    if (!hasGuestTarget) {
      const q = isMs ? 'Boleh — berapa guest target supaya saya boleh pecahkan bajet?' : 'Sure — what is your guest target so I can split the budget?';
      return `${q}\n${block(guestOptions)}`;
    }
    if (!/\d/.test(msg)) {
      const q = isMs ? 'Boleh — bajet untuk kategori yang mana?' : 'Sure — which budget category?';
      const options = isMs
        ? ['Dewan & katering', 'Fotografi', 'Baju & makeup', 'Dekorasi']
        : ['Venue & catering', 'Photography', 'Outfit & makeup', 'Decoration'];
      return `${q}\n${block(options)}`;
    }
    return null;
  }

  const mentionsVendor = /\bvendor(s)?\b/.test(msg);
  const specificVendor =
    /(jurugambar|photographer|katering|caterer|mua|makeup|andaman|dewan|venue|hall|florist|bunga|kek|cake|dj|band|kompang|baju|gown|dekor|decor|pelamin|hantaran)/.test(msg);
  if (mentionsVendor && !specificVendor) {
    const q = isMs ? 'Boleh — vendor jenis apa yang anda fikirkan?' : 'Sure — what type of vendor are you thinking of?';
    const options = isMs ? ['Jurugambar', 'Katering', 'MUA / Andaman', 'Dewan'] : ['Photographer', 'Caterer', 'Makeup artist', 'Venue'];
    return `${q}\n${block(options)}`;
  }

  const mentionsAppointment = /\b(appointment|temujanji|jumpa|meeting)\b/.test(msg);
  if (mentionsAppointment && !/\d/.test(msg)) {
    const q = isMs ? 'Boleh — appointment dengan vendor mana?' : 'Sure — an appointment with which vendor?';
    const options = isMs ? ['Jurugambar', 'Katering', 'MUA', 'Dewan'] : ['Photographer', 'Caterer', 'Makeup artist', 'Venue'];
    return `${q}\n${block(options)}`;
  }

  return null;
}

function cleanDemoText(text: string) {
  return text
    .replace(/â€™/g, "'")
    .replace(/â€œ|â€/g, '"');
}

/**
 * When in demo mode and a knowledge doc matches the query closely, return a
 * grounded answer from the doc content instead of the generic regex response.
 * Returns null when no doc is relevant enough, falling back to the regex path.
 */
function buildDemoFromKnowledge(
  userMessage: string,
  docs: KnowledgeDoc[],
  language: AppLanguage,
  voiceMode: boolean
): string | null {
  if (docs.length === 0) return null;
  const topDoc = docs[0];
  const queryLower = userMessage.toLowerCase();
  const docText = `${topDoc.title} ${topDoc.category} ${topDoc.content}`.toLowerCase();
  const queryWords = queryLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
  const matchCount = queryWords.filter((w) => docText.includes(w)).length;
  if (matchCount < 2 && queryWords.length > 1) return null;
  if (matchCount < 1) return null;

  const sourceNote = language === 'en'
    ? `\n\n*Source: ${topDoc.title} — ${topDoc.category}. Verify with the relevant authority as procedures and details may vary by state.*`
    : `\n\n*Sumber: ${topDoc.title} — ${topDoc.category}. Sahkan dengan pihak berkenaan kerana prosedur dan butiran mungkin berbeza mengikut negeri.*`;

  const sentences = topDoc.content.split(/(?<=[.!?])\s+/).slice(0, voiceMode ? 3 : 6);
  const answer = sentences.join(' ');

  return `${answer}${sourceNote}`;
}

async function forwardAiNonymauzStream(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  messages: ChatMessage[],
  language: AppLanguage,
  voiceMode = false,
  plannerContext?: ChatRequest['plannerContext'],
  selectedDocs: KnowledgeDoc[] = []
) {
  const env = {
    baseUrl: process.env.AI_NONYMAUZ_BASE_URL?.replace(/\/$/, '') ?? '',
    apiKey: process.env.AI_NONYMAUZ_API_KEY ?? '',
    model: process.env.AI_NONYMAUZ_MODEL || 'ai-nonymauz-support',
    maxTokens: Number(process.env.AI_NONYMAUZ_MAX_TOKENS || 700)
  };

  if (!env.baseUrl || !env.apiKey || env.apiKey === 'your-secret-api-key') {
    const userMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const demoClarification = voiceMode ? null : buildDemoClarification(userMessage, language, plannerContext);
    const knowledgeAnswer = !demoClarification ? buildDemoFromKnowledge(userMessage, selectedDocs, language, voiceMode) : null;
    const demoAnswer = cleanDemoText(demoClarification ?? knowledgeAnswer ?? buildDemoPlannerAnswer(userMessage, language, voiceMode, plannerContext));

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

// Durable signals worth remembering from earlier in the conversation —
// decisions, preferences, and concrete details the couple stated.
const MEMORY_SIGNAL_PATTERN =
  /\b(tema|theme|warna|colou?r|pilih|chose|choose|decided|putus|prefer|suka|nak|mahu|want|elak|avoid|tarikh|date|negeri|state|bajet|budget|rm\s?\d|guest|tetamu|pax|vendor|dewan|venue|katering|caterer|photographer|jurugambar|mua|makeup|outdoor|indoor|garden|hotel|masjid|pagi|petang|malam)\b/i;

/**
 * Build a compact memory of the older part of the conversation (the messages
 * that fall outside the recent window we forward verbatim). Pure heuristic
 * extraction — no extra AI call — so it stays free and fast. Returns '' when
 * there is nothing worth remembering.
 */
function buildPriorConversationNotes(messages: ChatMessage[], keepRecent: number): string {
  if (messages.length <= keepRecent) return '';
  const older = messages.slice(0, messages.length - keepRecent);
  const notes: string[] = [];
  const seen = new Set<string>();
  for (let i = older.length - 1; i >= 0 && notes.length < 10; i--) {
    const message = older[i];
    if (message.role !== 'user') continue;
    const text = message.content.trim().replace(/\s+/g, ' ');
    if (text.length < 4 || text.length > 240) continue;
    if (!MEMORY_SIGNAL_PATTERN.test(text)) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    notes.unshift(`- ${text}`);
  }
  return notes.join('\n');
}

const MALAYSIAN_WEDDING_PRICING = `
MALAYSIAN WEDDING MARKET PRICING (use these as realistic benchmarks when giving budget estimates):

VENUE + CATERING — the biggest cost, often 50-60% of total budget:
Important: In Malaysia, many couples book a "pakej majlis" where venue and catering are bundled together.
- Dewan Orang Ramai / Community Hall (MPAJ, MBPJ, MPKj, etc.): Hall rental RM3,000–15,000 + separate caterer at RM25–55/pax
- Dewan Besar / Private Convention Hall: Pakej all-in RM60–120/pax (includes hall, catering, basic decor, PA)
- Hotel Ballroom (3-4 star): Pakej RM90–160/pax (includes catering, basic decor, bridal suite)
- Hotel Ballroom (5 star / premium): Pakej RM160–300/pax
- Garden / Resort / Outdoor: Pakej RM100–250/pax (varies widely)
- Tent at home / Kenduri Kampung style: Caterer RM20–45/pax + tent & equipment rental RM5,000–15,000

State-specific price context (300 pax, mid-range):
- Selangor / KL: RM30,000–80,000 for venue+catering (community halls cheaper; hotels expensive)
- Johor: RM25,000–65,000
- Pulau Pinang: RM35,000–85,000 (higher due to tourism demand)
- Negeri Sembilan / Melaka: RM18,000–50,000
- Perak / Pahang / Kedah / Perlis: RM15,000–45,000
- Kelantan / Terengganu: RM12,000–35,000 (strong community culture, lower vendor costs)
- Sabah / Sarawak: RM20,000–55,000

Other vendor market averages (Peninsula Malaysia, 2024-2025):
- Photographer (full day, edited album): RM2,500–8,000
- Videographer (cinematic edit): RM2,000–6,000
- MUA + Andaman (akad + sanding): RM1,500–5,000
- Pelamin + Dekorasi: RM3,500–18,000 (depends on scale, fresh flowers cost more)
- Baju Pengantin (rental package): RM800–3,000 | Custom tailored: RM2,000–10,000
- Kad Jemputan: RM0.80–3.00/card (digital saves RM500–1,500)
- Cenderahati / Doorgift: RM3–15/pax
- Kompang: RM500–1,500
- PA System + Lighting: RM1,500–5,000
- Wedding Coordinator (full service): RM2,000–8,000
- Hantaran (gubahan dulang): RM300–600/tray (typically 7–11 trays each side)

Cost-per-pax benchmarks (all-in, full wedding):
- Budget (community dewan, simple setup): RM80–140/pax
- Mid-range (private hall or pakej dewan): RM140–220/pax
- Premium (hotel ballroom, floral decor): RM220–450+/pax

Key realities to always mention:
- Always add 10–15% buffer/contingency (last-minute additions are common)
- Many caterers bundle makanan + khemah + equipment + wait staff — always ask what is included
- Get minimum 3 quotations; prices vary by availability date and location
- Hantaran, pelamin nikah, and pre-wedding expenses (photoshoot, door gift design) add RM5,000–20,000 on top
`;

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

  const sourceConfidenceNote = selectedDocs.length > 0
    ? selectedDocs.map((doc, i) => {
        const conf = getSourceConfidence(doc, i);
        const label = conf === 'pasti' ? 'Confirmed' : conf === 'mungkin' ? 'Likely' : 'General';
        return `- [${doc.title}] → ${label}`;
      }).join('\n')
    : 'No sources matched for this query.';

  return `You are ${chatbotName}, an AI wedding planning assistant for ${clientName}.

=== SCOPE ===
1. Stay focused on wedding and event planning. Adjacent questions are in-scope when they help the user's wedding.
2. You may help with: majlis planning, nikah, sanding, reception, engagement, budgets, vendors, guest lists, seating, timelines, checklists, appointment planning, venue discovery, vendor questions, and location-based planning.
3. If the user asks for nearby venues/vendors and no location is available, ask for the city/negeri or use the workspace Negeri. Do not reject the question.
4. Never create or explain code, HTML, CSS, JavaScript, scripts, apps, websites, APIs, or software. Briefly redirect to wedding planning.
5. If the user asks for generic prompts, copy, wording, or templates unrelated to wedding/majlis/kahwin/vendor/event planning, do not fulfill. Redirect to a wedding-planning version.

=== KNOWLEDGE RULES ===
6. For factual questions about Malaysian wedding procedures, legal requirements, Islamic marriage rules, and government fees — answer ONLY from the Internal knowledge context and the Malaysian Wedding Market Pricing reference below. If the context does not contain information to answer, say: "I don't have that information in my knowledge base. Please verify with the relevant authority (JAI/PAID for nikah, JPN for registration)." NEVER guess or fabricate details to fill a gap.
7. For vendor price estimates and budget ranges, use the Malaysian Wedding Market Pricing reference below. Always frame these as "market averages" and advise getting actual vendor quotations (minimum 3).
8. Do not invent vendor names, phone numbers, addresses, websites, legal advice, medical advice, financial advice, religious rulings, or binding contract advice.
9. When citing facts from knowledge sources, indicate confidence: "Confirmed" (from source) or "Likely" (general knowledge). Never claim "Confirmed" for information not in the sources.

=== LANGUAGE ===
10. The user selected ${languageName}. Reply in ${languageName} for all messages, labels, headings, and bullets, even if the user typed in another language. Do not translate the user's own text when quoting it.
10a. MALAY IS MALAYSIAN MALAY (Bahasa Melayu Malaysia), NOT Bahasa Indonesia. Use Malaysian vocabulary and spelling: "keperluan" not "kebutuhan", "tetamu" not "tamu", "pengantin" not "mempelai", "majlis" not "resepsi", "bajet" not "anggaran" (for budget), "dewan" not "gedung", "jurugambar" not "fotografer", "tempah" not "pesan" (for booking), "jemputan" not "undangan", "hantaran" not "seserahan", "pelamin" not "pelaminan", "persiapan" not "pernikahan" (use "perkahwinan"). When the user writes in Indonesian, still reply in Malaysian Malay.
11. GREETINGS: If the message is just a greeting (hi, hello, hai, salam, assalamualaikum, selamat pagi/petang/malam, etc.), respond warmly in 1-2 sentences. Introduce yourself briefly and invite them to ask about their wedding. Do NOT output menus, bullets, or action blocks for greetings.
12. FEATURE DISCOVERY: When the user asks what you can do, how to use MajlisMate, or "where do I start?" — respond with a brief list of six features (Checklist, Budget, Vendor, Guest & RSVP, Calendar, AI guidance) then append a MM_CLARIFY block with 4 tappable entry points. Do NOT hallucinate features that do not exist.

=== RESPONSE STYLE ===
13. Be warm, concise, and practical. Prefer 3-6 short bullets unless the user asks for details.
14. For official Islamic marriage procedures (nikah, kursus pra-perkahwinan, SPPIM, etc.), use the knowledge context sourced from malaysia.gov.my. Cite the source as "Sumber: malaysia.gov.my" and remind the couple that procedures differ by state — verify with their state JAI or PAID.
15. ANSWER-FIRST: If the user asks a factual question, FIRST answer it, THEN propose a planner action with a reason. NEVER skip the answer to just ask which category.
16. ACTION-FIRST CLOSE: End almost every reply with one specific next step the user can act on. Prefer planner actions (add to checklist, budget, appointment, guest, profile). Also offer "draft a WhatsApp message" or "compare vendors" when relevant. ONE clear next step only, not a menu.
${voiceMode ? `\n=== VOICE MODE ===\n17. This is a voice conversation. Answer in 1–3 short spoken sentences only. No markdown, no bullets, no numbered lists, no headings, no asterisks. Speak naturally as if talking aloud.` : ''}

=== PLANNER ACTIONS ===
18. When the user clearly asks to add/change something concrete in their planner AND you have the needed details, propose actions for one-tap confirmation.${voiceMode ? ' In voice mode, keep your spoken reply to 1-3 short sentences AND place the action block at the very end (hidden from speech).' : ''} After your normal reply, append exactly one block on its own lines:
${'<<<MM_ACTIONS'}
[ {"type":"add_checklist_item","text":"..."} ]
${'MM_ACTIONS>>>'}
Supported action types:
- {"type":"add_checklist_item","text":string,"reason":string?,"deadline":"YYYY-MM-DD"?,"phase":string?}
- {"type":"add_budget_item","category":string,"reason":string?,"planned":number(RM)?,"note":string?}
- {"type":"add_appointment","title":string,"reason":string?,"date":"YYYY-MM-DD","time":"HH:MM"?,"vendor":string?,"location":string?}
- {"type":"add_guest","name":string,"reason":string?,"pax":number?,"group":string?,"phone":string?}
- {"type":"update_budget","category":string,"reason":string?,"planned":number?,"actual":number?,"paid":number?} (when user reports a quote/cost/payment; match existing budget category)
- {"type":"complete_task","text":string,"reason":string?} (when user says a task is done; match existing checklist item)
- {"type":"update_appointment","title":string,"reason":string?,"date":"YYYY-MM-DD"?,"time":"HH:MM"?,"status":"planned"|"confirmed"|"done"?}
- {"type":"set_profile","majlisDate":"YYYY-MM-DD"?,"negeri":string?,"totalBudget":number?,"guestTarget":number?} (when user states date, state, budget, or guest count)
Action rules: Today is ${todayIso}. Resolve relative dates to YYYY-MM-DD. Never invent prices, dates, names, or phone numbers the user did not provide — omit unsure optional fields. Only include actions you are confident the user wants now. Do NOT mention the block, JSON, or "actions" in your visible reply. If no concrete change is requested, do not output the block.
19. DUPLICATE PREVENTION: Before any MM_ACTIONS block, scan the planner context:
- add_checklist_item: if a similar item is already open in "Checklist progress", do NOT add again. Acknowledge it and ask using MM_CLARIFY: ["Same task — checking on it", "Add a new entry", "Mark it done"].
- add_budget_item: if the category exists in "Budget snapshot", prefer update_budget.
- add_appointment: if the same vendor/title is in "Upcoming appointments", ask before duplicating.
Only proceed after explicit user confirmation for a new separate entry.

=== CLARIFICATION ===
20. ASK BEFORE ACTING: When the user asks to add/change something but a key detail is missing — do NOT guess and do NOT output actions. Ask exactly ONE short clarifying question, then append:
${'<<<MM_CLARIFY'}
["...", "...", "..."]
${'MM_CLARIFY>>>'}
Rules: Never use MM_CLARIFY to dodge a factual question — always answer first. Only ask when the detail genuinely matters. Ask at most ONE question. Do NOT output both MM_CLARIFY and MM_ACTIONS in the same reply. Do NOT mention the block in your visible reply.
TARGETED CLARIFY: Check PLANNER STATE SUMMARY first. Only ask for a genuinely missing field. For "buat checklist": ask for guest target or negeri if missing. For "cadang bajet": ask for total budget or guest target if missing. Pick the single most important missing field and ask only that.

=== PLANNER STATE SUMMARY ===
${plannerContext?.stateSummary || 'not available yet'}
Use this to prioritise: lead with urgent tasks given days-left, flag budget risk, nudge on pending guests, reference vendor shortlist. Do not repeat the summary back.

=== MALAYSIAN WEDDING MARKET PRICING (authoritative for all price estimates) ===
${MALAYSIAN_WEDDING_PRICING}

=== SOURCE CONFIDENCE FOR THIS QUERY ===
${sourceConfidenceNote}

=== INTERNAL KNOWLEDGE CONTEXT ===
${context}

=== PLANNER CONTEXT ===
- Groom name: ${plannerContext?.groomName || 'not set'}
- Bride name: ${plannerContext?.brideName || 'not set'}
- Majlis date: ${plannerContext?.majlisDate || 'not set'}${typeof plannerContext?.daysLeft === 'number' ? ` (${plannerContext.daysLeft} days left)` : ''}
- Negeri: ${plannerContext?.negeri || 'not set'}
- Total budget: ${plannerContext?.totalBudget ? `RM${plannerContext.totalBudget}` : 'not set'}
- Guest target: ${plannerContext?.guestTarget || 'not set'}
- Checklist progress: ${plannerContext?.checklistSummary || 'not set'}
- Budget snapshot: ${(plannerContext?.budgetSummary || []).join('; ') || 'not set'}
- Upcoming appointments: ${(plannerContext?.upcomingAppointments || [])
      .map((appointment: { date: string; time?: string; title: string }) =>
        `${appointment.date}${appointment.time ? ` ${appointment.time}` : ''} - ${appointment.title}`
      )
      .join('; ') || 'not set'}
${plannerContext?.memoryContext ? `\n=== CROSS-SESSION MEMORY ===\n${plannerContext.memoryContext}\nHonour these facts from previous sessions. Do not contradict them or re-ask for information already captured.` : ''}`;
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

    // Deterministic duplicate guard: if the user explicitly asks to ADD something
    // that already exists in the planner, short-circuit with a clarify question
    // instead of calling the AI. Runs before BOTH the real backend and the demo
    // fallback so the behaviour is reliable regardless of which answers.
    if (!voiceMode && hasAddIntent(latestUserMessage) && !wantsNewEntry(latestUserMessage)) {
      const duplicate = detectPlannerDuplicate(latestUserMessage, {
        checklistSummary: plannerContext?.checklistSummary,
        budgetSummary: plannerContext?.budgetSummary,
        upcomingAppointments: plannerContext?.upcomingAppointments
      });
      if (duplicate) {
        const clarify = buildDuplicateClarifyMessage(duplicate, language);
        return new Response(
          `${encodeSseEvent({ type: 'sources', sources: [] })}${encodeSseEvent({ type: 'delta', text: clarify })}${sseDone()}`,
          { headers: sseHeaders() }
        );
      }
    }

    const selectedDocs = retrieveContext(latestUserMessage, 4);
    const systemPrompt = buildSystemPrompt(language, plannerContext, selectedDocs, voiceMode);
    const RECENT_WINDOW = 8;
    const priorNotes = buildPriorConversationNotes(messages, RECENT_WINDOW);
    const aiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(priorNotes
        ? [{
            role: 'system' as const,
            content: `EARLIER CONVERSATION NOTES (things the couple said earlier in this chat — honour these and do not contradict or re-ask them):\n${priorNotes}`
          }]
        : []),
      ...messages.slice(-RECENT_WINDOW).map((message) => ({ role: message.role, content: message.content }))
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

          await forwardAiNonymauzStream(controller, encoder, aiMessages, language, voiceMode, plannerContext, selectedDocs);
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
