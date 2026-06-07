import { NextRequest, NextResponse } from 'next/server';
import { askAiNonymauz } from '../../../lib/aiNonymauz';
import { formatContext, getClientName, retrieveContext } from '../../../lib/retrieval';

export const runtime = 'nodejs';

type IncomingMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body.messages) ? (body.messages as IncomingMessage[]) : [];
    const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content;

    if (!latestUserMessage || latestUserMessage.trim().length < 2) {
      return NextResponse.json({ error: 'Please provide a valid question.' }, { status: 400 });
    }

    const selectedDocs = retrieveContext(latestUserMessage, 4);
    const context = formatContext(selectedDocs);
    const clientName = getClientName();
    const chatbotName = process.env.CHATBOT_NAME || `${clientName} AI Assistant`;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@example.com';

    const systemPrompt = `You are ${chatbotName}, a website support and company knowledge chatbot for ${clientName}.

Rules:
1. Answer using the internal knowledge context first.
2. If the knowledge base does not contain the answer, say you do not have enough information and suggest contacting ${supportEmail}.
3. Do not invent prices, policies, warranty decisions, refund approvals, or legal advice.
4. Be friendly, concise, and helpful.
5. Support English and Malay. Reply in the same language as the customer where possible.
6. If human handover is needed, summarize what information the customer should provide.

Internal knowledge context:
${context}`;

    const aiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.slice(-8).map((message) => ({ role: message.role, content: message.content }))
    ];

    const result = await askAiNonymauz(aiMessages);

    return NextResponse.json({
      answer: result.answer,
      provider: result.provider,
      sources: selectedDocs.map((doc) => ({ id: doc.id, title: doc.title, category: doc.category }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
