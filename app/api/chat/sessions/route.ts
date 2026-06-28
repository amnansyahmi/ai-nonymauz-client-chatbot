import { NextRequest, NextResponse } from 'next/server';
import { resolveChatOwner } from '@/lib/chat/owner';
import {
  listSessions,
  upsertSession,
  upsertSessions,
  type ChatSessionPayload
} from '@/lib/chat/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** GET /api/chat/sessions — list the current owner's chat sessions. */
export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ sessions: [], persisted: false });
  }
  try {
    const owner = await resolveChatOwner();
    const sessions = await listSessions(owner.ownerKey);
    return NextResponse.json({ sessions, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load sessions.';
    return NextResponse.json({ sessions: [], persisted: false, error: message }, { status: 500 });
  }
}

/** POST /api/chat/sessions — create or update a single session. */
export async function POST(request: NextRequest) {
  if (!dbConfigured()) {
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
  try {
    const body = (await request.json()) as { session?: ChatSessionPayload };
    if (!body?.session?.id) {
      return NextResponse.json({ error: 'session.id is required.' }, { status: 400 });
    }
    const owner = await resolveChatOwner();
    const session = await upsertSession(owner, body.session);
    return NextResponse.json({ session, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save session.';
    return NextResponse.json({ persisted: false, error: message }, { status: 500 });
  }
}

/**
 * PUT /api/chat/sessions — bulk upsert (one-time localStorage migration).
 * Returns the owner's full, authoritative list afterwards.
 */
export async function PUT(request: NextRequest) {
  if (!dbConfigured()) {
    return NextResponse.json({ sessions: [], persisted: false }, { status: 200 });
  }
  try {
    const body = (await request.json()) as { sessions?: ChatSessionPayload[] };
    const incoming = Array.isArray(body?.sessions) ? body.sessions : [];
    const owner = await resolveChatOwner();
    if (incoming.length > 0) {
      await upsertSessions(owner, incoming);
    }
    const sessions = await listSessions(owner.ownerKey);
    return NextResponse.json({ sessions, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to migrate sessions.';
    return NextResponse.json({ sessions: [], persisted: false, error: message }, { status: 500 });
  }
}
