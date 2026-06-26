import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';

// drizzle-kit does not auto-load .env.local, so pull DATABASE_URL from it
// (keeps the secret out of the command line / package scripts).
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync('.env.local', 'utf8');
    const match = env.match(/^DATABASE_URL=(.+)$/m);
    if (match) process.env.DATABASE_URL = match[1].trim();
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ''
  }
});
