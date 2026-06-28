import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './lib/db';
import { users, accounts, sessions, verificationTokens } from './lib/db/schema';
import { magicLinkProvider, isEmailConfigured } from './lib/auth/magicLink';

export { isEmailConfigured };

/**
 * Auth.js (NextAuth v5) configuration for the affiliate area.
 *
 * Mirrors the app's "real when configured, demo otherwise" pattern:
 * - Google sign-in is wired only when AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET exist.
 * - The "email" provider is a Credentials provider that, with no database yet,
 *   accepts any valid email and issues a JWT session (demo onboarding). Swap its
 *   `authorize` for a real lookup + password/magic-link once a DB is added.
 *
 * Session strategy is JWT so no database is required to run.
 */
export const isGoogleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

const providers = [
  ...(isGoogleConfigured
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET
        })
      ]
    : []),
  // Passwordless magic link for the app login (verified email ownership).
  magicLinkProvider,
  Credentials({
    id: 'email',
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      name: { label: 'Name', type: 'text' }
    },
    authorize: async (credentials) => {
      const email = String(credentials?.email ?? '').trim().toLowerCase();
      if (!email || !/.+@.+\..+/.test(email)) return null;
      // TODO: replace with a real account lookup + credential check once a
      // database is wired. For now any valid email onboards (demo fallback).
      const name = String(credentials?.name ?? '').trim() || email.split('@')[0];
      return { id: email, email, name };
    }
  })
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens
  }),
  providers,
  // JWT strategy is required for the Credentials (email) provider. The adapter
  // still persists OAuth (Google) users/accounts to Postgres.
  session: { strategy: 'jwt' },
  pages: { signIn: '/affiliate/login' },
  callbacks: {
    // Keep the session lean and predictable for the affiliate UI.
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
});
