import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatSessions, userWorkspaces } from '@/lib/db/schema';
import { resolveDataOwner } from '@/lib/chat/owner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DELETE /api/account — erase all stored data for the current owner
 * (chat sessions + workspace). PDPA-friendly "delete my data". Scoped by
 * owner_key so it only ever removes the caller's own rows.
 */
export async function DELETE() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ deleted: false, persisted: false });
  }
  try {
    const owner = await resolveDataOwner();
    const [sessions, workspace] = await Promise.all([
      db.delete(chatSessions).where(eq(chatSessions.ownerKey, owner.ownerKey)).returning({ id: chatSessions.id }),
      db.delete(userWorkspaces).where(eq(userWorkspaces.ownerKey, owner.ownerKey)).returning({ ownerKey: userWorkspaces.ownerKey })
    ]);

    return NextResponse.json({
      deleted: true,
      removedSessions: sessions.length,
      removedWorkspaces: workspace.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete data.';
    return NextResponse.json({ deleted: false, error: message }, { status: 500 });
  }
}
