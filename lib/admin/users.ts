import { eq } from 'drizzle-orm';
import { db } from '../db';
import { adminUsers } from '../db/schema';

export type AdminUserRow = typeof adminUsers.$inferSelect;

export async function getAdminUserByEmail(email: string): Promise<AdminUserRow | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, normalized)).limit(1);
  return rows[0] ?? null;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  return db.select().from(adminUsers).orderBy(adminUsers.createdAt);
}

export async function createAdminUser(input: {
  email: string;
  name?: string | null;
  role: 'superuser' | 'admin';
}): Promise<void> {
  await db
    .insert(adminUsers)
    .values({
      email: input.email.trim().toLowerCase(),
      name: input.name?.trim() || null,
      role: input.role
    })
    .onConflictDoNothing({ target: adminUsers.email });
}

export async function deleteAdminUser(id: string): Promise<void> {
  await db.delete(adminUsers).where(eq(adminUsers.id, id));
}
