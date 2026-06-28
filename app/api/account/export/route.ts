import { NextResponse } from 'next/server';
import { resolveDataOwner } from '@/lib/chat/owner';
import { getWorkspace } from '@/lib/workspace/store';
import { listSessions } from '@/lib/chat/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/account/export — download everything stored for the current owner
 * (workspace + chat sessions) as a JSON file. PDPA-friendly "export my data".
 */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Storage not configured.' }, { status: 501 });
  }
  try {
    const owner = await resolveDataOwner();
    const [workspace, chatSessions] = await Promise.all([
      getWorkspace(owner.ownerKey),
      listSessions(owner.ownerKey)
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'MajlisMate.ai',
      authenticated: owner.isAuthenticated,
      workspace,
      chatSessions
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="majlismate-data-${Date.now()}.json"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to export data.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
