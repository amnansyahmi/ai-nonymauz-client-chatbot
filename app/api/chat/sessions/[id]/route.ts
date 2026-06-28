import { NextRequest, NextResponse } from 'next/server';
import { resolveChatOwner } from '@/lib/chat/owner';
import { deleteSession, patchSession } from '@/lib/chat/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** PATCH /api/chat/sessions/:id — rename and/or pin a session. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!dbConfigured()) {
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
  try {
    const { id } = await params;
    const body = (await request.json()) as { title?: string; pinned?: boolean };
    const owner = await resolveChatOwner();
    const session = await patchSession(owner.ownerKey, id, {
      title: body.title,
      pinned: body.pinned
    });
    if (!session) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    return NextResponse.json({ session, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update session.';
    return NextResponse.json({ persisted: false, error: message }, { status: 500 });
  }
}

/** DELETE /api/chat/sessions/:id — remove a session the owner controls. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!dbConfigured()) {
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
  try {
    const { id } = await params;
    const owner = await resolveChatOwner();
    const removed = await deleteSession(owner.ownerKey, id);
    return NextResponse.json({ removed, persisted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete session.';
    return NextResponse.json({ persisted: false, error: message }, { status: 500 });
  }
}
