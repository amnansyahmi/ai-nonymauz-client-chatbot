import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    app: 'ai-nonymauz-client-chatbot',
    mode: process.env.AI_NONYMAUZ_BASE_URL ? 'connected' : 'demo-fallback'
  });
}
