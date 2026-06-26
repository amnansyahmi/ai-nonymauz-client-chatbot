import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema';

/**
 * Neon Postgres connection for the affiliate system.
 *
 * - `sql`  — Neon's HTTP tagged-template for ad-hoc queries:
 *              await sql`SELECT * FROM affiliate WHERE code = ${code}`
 * - `db`   — Drizzle ORM instance (type-safe queries + the Auth.js adapter).
 *
 * Works in both Node and Edge runtimes; no pooling setup needed. The connection
 * string lives in DATABASE_URL (.env.local — never committed).
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Add it to .env.local.');
}

export const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
