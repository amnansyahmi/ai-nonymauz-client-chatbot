import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Admin session — deliberately separate from the affiliate/customer auth
 * (Auth.js). It is a small HMAC-signed cookie (no extra dependency), so admins
 * have their own login that never mixes with affiliate sessions.
 */
export type AdminRole = 'superuser' | 'admin';
export type AdminSession = { email: string; name: string; role: AdminRole };

const COOKIE = 'mm_admin';
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set — required to sign admin sessions.');
  return s;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', secret()).update(data).digest('base64url');
}

function encode(session: AdminSession): string {
  const body = Buffer.from(
    JSON.stringify({ ...session, exp: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decode(token: string): AdminSession | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString()) as AdminSession & { exp: number };
    if (typeof obj.exp !== 'number' || obj.exp < Date.now()) return null;
    if (obj.role !== 'superuser' && obj.role !== 'admin') return null;
    return { email: obj.email, name: obj.name, role: obj.role };
  } catch {
    return null;
  }
}

export async function setAdminSession(session: AdminSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, '', { path: '/', maxAge: 0 });
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? decode(token) : null;
}

/** Gate for admin pages/actions. Redirects to the admin login when absent. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect('/admin-login');
  return session;
}

/** Superuser-only gate (e.g. managing other admins). */
export async function requireSuperuser(): Promise<AdminSession> {
  const session = await requireAdmin();
  if (session.role !== 'superuser') redirect('/admin');
  return session;
}
