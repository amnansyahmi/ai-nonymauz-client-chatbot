import type { WorkspaceData } from './types';

/**
 * Client bridge to the workspace persistence API (app/api/workspace).
 * Best-effort, like the chat sync: errors are swallowed and reported as a
 * boolean/null so the UI keeps working from its localStorage cache offline.
 */
type LoadResult = { workspace: WorkspaceData | null; persisted: boolean; authenticated: boolean };

export async function fetchWorkspace(signal?: AbortSignal): Promise<LoadResult> {
  try {
    const res = await fetch('/api/workspace', { method: 'GET', signal });
    if (!res.ok) return { workspace: null, persisted: false, authenticated: false };
    const data = (await res.json()) as LoadResult;
    return {
      workspace: data.workspace ?? null,
      persisted: Boolean(data.persisted),
      authenticated: Boolean(data.authenticated)
    };
  } catch {
    return { workspace: null, persisted: false, authenticated: false };
  }
}

export async function saveWorkspace(
  workspace: WorkspaceData,
  options?: { keepalive?: boolean }
): Promise<boolean> {
  try {
    const res = await fetch('/api/workspace', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace }),
      keepalive: options?.keepalive ?? false
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { persisted?: boolean };
    return Boolean(data.persisted);
  } catch {
    return false;
  }
}
