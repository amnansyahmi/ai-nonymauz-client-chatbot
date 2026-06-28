import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chatSessions } from '@/lib/db/schema';
import type { Message } from '@/components/planner/types';

/** Wire shape exchanged with the client — mirrors the in-app ChatSession. */
export type ChatSessionPayload = {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  messages: Message[];
};

// Hard caps so a single owner/session can't store unbounded data.
const MAX_MESSAGES_PER_SESSION = 500;
const MAX_TITLE_LENGTH = 200;

function sanitizeTitle(title: unknown): string {
  const text = typeof title === 'string' ? title.trim() : '';
  if (!text) return 'Wedding planning chat';
  return text.length > MAX_TITLE_LENGTH ? text.slice(0, MAX_TITLE_LENGTH) : text;
}

function sanitizeMessages(messages: unknown): Message[] {
  if (!Array.isArray(messages)) return [];
  const clean = messages.filter(
    (m): m is Message =>
      Boolean(m) &&
      typeof m === 'object' &&
      (m as Message).role !== undefined &&
      typeof (m as Message).content === 'string'
  );
  // Keep the most recent messages if a session somehow exceeds the cap.
  return clean.length > MAX_MESSAGES_PER_SESSION
    ? clean.slice(clean.length - MAX_MESSAGES_PER_SESSION)
    : clean;
}

function toPayload(row: typeof chatSessions.$inferSelect): ChatSessionPayload {
  return {
    id: row.id,
    title: row.title,
    pinned: row.pinned,
    updatedAt: (row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)).toISOString(),
    messages: Array.isArray(row.messages) ? row.messages : []
  };
}

/** All sessions for an owner, pinned first then most-recently updated. */
export async function listSessions(ownerKey: string): Promise<ChatSessionPayload[]> {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.ownerKey, ownerKey))
    .orderBy(desc(chatSessions.pinned), desc(chatSessions.updatedAt))
    .limit(100);
  return rows.map(toPayload);
}

/**
 * Create or update a session for the given owner. The conflict guard keeps a
 * row owned by another device/user from being overwritten via a guessed id.
 */
export async function upsertSession(
  owner: { ownerKey: string; userId: string | null },
  payload: ChatSessionPayload
): Promise<ChatSessionPayload> {
  const id = String(payload.id || '').trim();
  if (!id) throw new Error('Session id is required.');

  const title = sanitizeTitle(payload.title);
  const messages = sanitizeMessages(payload.messages);
  const pinned = Boolean(payload.pinned);
  const updatedAt = new Date();

  const [row] = await db
    .insert(chatSessions)
    .values({
      id,
      ownerKey: owner.ownerKey,
      userId: owner.userId,
      title,
      pinned,
      messages,
      updatedAt
    })
    .onConflictDoUpdate({
      target: chatSessions.id,
      set: { title, pinned, messages, userId: owner.userId, updatedAt },
      where: eq(chatSessions.ownerKey, owner.ownerKey)
    })
    .returning();

  return toPayload(row);
}

/** Upsert many sessions in one call (used for the one-time localStorage migration). */
export async function upsertSessions(
  owner: { ownerKey: string; userId: string | null },
  payloads: ChatSessionPayload[]
): Promise<ChatSessionPayload[]> {
  const results: ChatSessionPayload[] = [];
  for (const payload of payloads) {
    try {
      results.push(await upsertSession(owner, payload));
    } catch {
      // Skip malformed entries; migration is best-effort.
    }
  }
  return results;
}

/** Update title and/or pinned for a session the owner controls. */
export async function patchSession(
  ownerKey: string,
  id: string,
  patch: { title?: string; pinned?: boolean }
): Promise<ChatSessionPayload | null> {
  const set: Partial<typeof chatSessions.$inferInsert> = { updatedAt: new Date() };
  if (typeof patch.title === 'string') set.title = sanitizeTitle(patch.title);
  if (typeof patch.pinned === 'boolean') set.pinned = patch.pinned;

  const [row] = await db
    .update(chatSessions)
    .set(set)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.ownerKey, ownerKey)))
    .returning();

  return row ? toPayload(row) : null;
}

/** Delete a session the owner controls. Returns true when a row was removed. */
export async function deleteSession(ownerKey: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, id), eq(chatSessions.ownerKey, ownerKey)))
    .returning({ id: chatSessions.id });
  return rows.length > 0;
}
