import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    ok: true,
    app: 'majlismate-ai',
    mode: process.env.AI_NONYMAUZ_BASE_URL ? 'connected' : 'demo-fallback'
  });
}
