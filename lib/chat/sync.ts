import type { Message } from '@/components/planner/types';

/**
 * Client-side bridge to the chat persistence API (app/api/chat/sessions).
 *
 * Every call is best-effort: the UI keeps a localStorage cache and stays fully
 * usable if the network or DB is unavailable, so these helpers swallow errors
 * and report success/failure rather than throwing into render paths.
 */
export type RemoteChatSession = {
  id: string;
  title: string;
  updatedAt: string;
  pinned?: boolean;
  messages: Message[];
};

type ListResult = { sessions: RemoteChatSession[]; persisted: boolean };

/** Fetch the owner's sessions from the DB. `persisted: false` means no backend. */
export async function fetchRemoteSessions(signal?: AbortSignal): Promise<ListResult> {
  try {
    const res = await fetch('/api/chat/sessions', { method: 'GET', signal });
    if (!res.ok) return { sessions: [], persisted: false };
    const data = (await res.json()) as ListResult;
    return { sessions: Array.isArray(data.sessions) ? data.sessions : [], persisted: Boolean(data.persisted) };
  } catch {
    return { sessions: [], persisted: false };
  }
}

/**
 * One-time migration: push local sessions to the DB and get back the
 * authoritative merged list.
 */
export async function migrateRemoteSessions(sessions: RemoteChatSession[]): Promise<ListResult> {
  try {
    const res = await fetch('/api/chat/sessions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions })
    });
    if (!res.ok) return { sessions: [], persisted: false };
    const data = (await res.json()) as ListResult;
    return { sessions: Array.isArray(data.sessions) ? data.sessions : [], persisted: Boolean(data.persisted) };
  } catch {
    return { sessions: [], persisted: false };
  }
}

/** Create or update one session. Returns true when it was persisted. */
export async function saveRemoteSession(session: RemoteChatSession): Promise<boolean> {
  try {
    const res = await fetch('/api/chat/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session }),
      // Let an in-flight save complete even if the page is unloading.
      keepalive: true
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { persisted?: boolean };
    return Boolean(data.persisted);
  } catch {
    return false;
  }
}

/** Rename and/or pin a session. */
export async function patchRemoteSession(
  id: string,
  patch: { title?: string; pinned?: boolean }
): Promise<boolean> {
  try {
    const res = await fetch(`/api/chat/sessions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Delete a session. */
export async function deleteRemoteSession(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/chat/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}
