import { NextRequest, NextResponse } from 'next/server';
import { resolveDataOwner } from '@/lib/chat/owner';
import { getWorkspace, saveWorkspace } from '@/lib/workspace/store';
import type { WorkspaceData } from '@/lib/workspace/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** GET /api/workspace — load the current owner's saved workspace. */
export async function GET() {
  if (!dbConfigured()) {
    return NextResponse.json({ workspace: null, persisted: false });
  }
  try {
    const owner = await resolveDataOwner();
    const workspace = await getWorkspace(owner.ownerKey);
    return NextResponse.json({ workspace, persisted: true, authenticated: owner.isAuthenticated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load workspace.';
    return NextResponse.json({ workspace: null, persisted: false, error: message }, { status: 500 });
  }
}

/** PUT /api/workspace — replace the current owner's workspace. */
export async function PUT(request: NextRequest) {
  if (!dbConfigured()) {
    return NextResponse.json({ persisted: false }, { status: 200 });
  }
  try {
    const body = (await request.json()) as { workspace?: WorkspaceData };
    const data = body?.workspace ?? {};
    const owner = await resolveDataOwner();
    const workspace = await saveWorkspace(owner, data);
    return NextResponse.json({ workspace, persisted: true, authenticated: owner.isAuthenticated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save workspace.';
    return NextResponse.json({ persisted: false, error: message }, { status: 500 });
  }
}
