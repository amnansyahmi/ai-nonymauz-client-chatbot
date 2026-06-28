import { cookies } from 'next/headers';
import { auth } from '@/auth';

/**
 * Data ownership for the app (chat + planner workspace).
 *
 * When the visitor is signed in (email login, no password), data is owned by
 * their user id (the email) so it follows them across devices. When anonymous,
 * data is owned by a per-device key stored in an httpOnly cookie, so the demo
 * works without a login wall. On login the client re-saves its current state
 * under the email, carrying anonymous progress forward.
 */
const DEVICE_COOKIE = 'mm_device';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years

export type DataOwner = {
  /** Row owner key: the signed-in user id (email) when present, else device id. */
  ownerKey: string;
  /** Auth.js user id when signed in, else null. */
  userId: string | null;
  /** True when ownership is tied to an authenticated email. */
  isAuthenticated: boolean;
};

/** Back-compat alias for the chat callers. */
export type ChatOwner = DataOwner;

function newDeviceId(): string {
  return `dev_${crypto.randomUUID()}`;
}

/**
 * Resolve (and, if missing, create) the data owner for the current request.
 * Safe to call from Route Handlers — it may set the device cookie on the
 * outgoing response when a new device id is minted.
 */
export async function resolveDataOwner(): Promise<DataOwner> {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch {
    // Auth misconfigured or unavailable — fall back to anonymous device owner.
  }

  // Always ensure a device cookie exists so anonymous ownership is stable and
  // a later login can migrate that device's data forward.
  const store = await cookies();
  let deviceId = store.get(DEVICE_COOKIE)?.value;
  if (!deviceId) {
    deviceId = newDeviceId();
    store.set(DEVICE_COOKIE, deviceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE_SECONDS
    });
  }

  return {
    ownerKey: userId ?? deviceId,
    userId,
    isAuthenticated: Boolean(userId)
  };
}

/** Back-compat wrapper for existing chat callers. */
export async function resolveChatOwner(): Promise<ChatOwner> {
  return resolveDataOwner();
}
