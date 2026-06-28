import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { userWorkspaces } from '@/lib/db/schema';
import type { WorkspaceData } from './types';

type Owner = { ownerKey: string; userId: string | null };

function rowToData(row: typeof userWorkspaces.$inferSelect): WorkspaceData {
  return {
    profile: (row.profile as WorkspaceData['profile']) ?? undefined,
    checklist: (row.checklist as WorkspaceData['checklist']) ?? undefined,
    budget: (row.budget as WorkspaceData['budget']) ?? undefined,
    appointments: (row.appointments as WorkspaceData['appointments']) ?? undefined,
    guests: (row.guests as WorkspaceData['guests']) ?? undefined,
    vendors: (row.vendors as WorkspaceData['vendors']) ?? undefined,
    activity: (row.activity as WorkspaceData['activity']) ?? undefined,
    settings: (row.settings as WorkspaceData['settings']) ?? undefined
  };
}

/** Load an owner's workspace, or null when they have no row yet. */
export async function getWorkspace(ownerKey: string): Promise<WorkspaceData | null> {
  const [row] = await db
    .select()
    .from(userWorkspaces)
    .where(eq(userWorkspaces.ownerKey, ownerKey))
    .limit(1);
  return row ? rowToData(row) : null;
}

/**
 * Create or replace an owner's workspace. The whole row is written each call;
 * the client always holds the authoritative full state in memory.
 */
export async function saveWorkspace(owner: Owner, data: WorkspaceData): Promise<WorkspaceData> {
  const values = {
    ownerKey: owner.ownerKey,
    userId: owner.userId,
    profile: data.profile ?? null,
    checklist: data.checklist ?? null,
    budget: data.budget ?? null,
    appointments: data.appointments ?? null,
    guests: data.guests ?? null,
    vendors: data.vendors ?? null,
    activity: data.activity ?? null,
    settings: data.settings ?? null,
    updatedAt: new Date()
  };

  const [row] = await db
    .insert(userWorkspaces)
    .values(values)
    .onConflictDoUpdate({
      target: userWorkspaces.ownerKey,
      set: {
        userId: values.userId,
        profile: values.profile,
        checklist: values.checklist,
        budget: values.budget,
        appointments: values.appointments,
        guests: values.guests,
        vendors: values.vendors,
        activity: values.activity,
        settings: values.settings,
        updatedAt: values.updatedAt
      }
    })
    .returning();

  return rowToData(row);
}
