import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  primaryKey,
  uuid
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

/* ============================================================
   Auth.js (NextAuth) tables — canonical Postgres schema.
   Consumed by @auth/drizzle-adapter. Do not rename columns.
   ============================================================ */

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image')
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state')
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] })
  ]
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull()
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull()
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/* ============================================================
   Affiliate system tables.
   ============================================================ */

// One affiliate account. Linked to an Auth.js user when available (OAuth
// logins persist a user row); userId stays null for demo/email-only logins.
export const affiliates = pgTable('affiliate', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  social: text('social'),
  // pending | approved | suspended | rejected
  status: text('status').notNull().default('pending'),
  // Bronze | Silver | Gold | Platinum
  tier: text('tier').notNull().default('Bronze'),
  bankName: text('bank_name'),
  bankAccount: text('bank_account'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// A referred customer attributed to an affiliate.
export const referrals = pgTable('referral', {
  id: uuid('id').primaryKey().defaultRandom(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  customerName: text('customer_name'),
  customerEmail: text('customer_email'),
  // registered | trial | active
  status: text('status').notNull().default('registered'),
  packageName: text('package_name'),
  // Subscription value (RM) captured at checkout — used to compute percentage
  // commissions at finalize time.
  amount: numeric('amount', { precision: 10, scale: 2 }),
  // External payment reference (ToyyibPay billExternalReferenceNo). Unique so
  // attribution is idempotent across checkout + callback + page refreshes.
  reference: text('reference').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Admin accounts — separate from affiliate/customer auth. Roles: superuser | admin.
// passwordHash is nullable for now (login accepts any password until hashing is
// enabled); a non-null hash will be enforced later.
export const adminUsers = pgTable('admin_user', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  role: text('role').notNull().default('admin'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// Singleton commission/payout configuration, edited from the admin page.
// Always one row, id = 'default'.
export const affiliateSettings = pgTable('affiliate_setting', {
  id: text('id').primaryKey().default('default'),
  // fixed | percentage
  commissionType: text('commission_type').notNull().default('fixed'),
  fixedAmount: numeric('fixed_amount', { precision: 10, scale: 2 }).notNull().default('30.00'),
  percentageRate: numeric('percentage_rate', { precision: 5, scale: 2 }).notNull().default('20.00'),
  recurringRate: numeric('recurring_rate', { precision: 5, scale: 2 }).notNull().default('10.00'),
  minPayout: numeric('min_payout', { precision: 10, scale: 2 }).notNull().default('50.00'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Raw click on a referral link (for tracking + attribution).
export const clicks = pgTable('click', {
  id: uuid('id').primaryKey().defaultRandom(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  ip: text('ip'),
  device: text('device'),
  browser: text('browser'),
  utmSource: text('utm_source'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// A commission earned by an affiliate, with approval lifecycle.
export const commissions = pgTable('commission', {
  id: uuid('id').primaryKey().defaultRandom(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  referralId: uuid('referral_id').references(() => referrals.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  // fixed | percentage | recurring | tier
  type: text('type').notNull().default('fixed'),
  // pending | approved | rejected | paid
  status: text('status').notNull().default('pending'),
  remark: text('remark'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// A payout request / disbursement to an affiliate.
export const payouts = pgTable('payout', {
  id: uuid('id').primaryKey().defaultRandom(),
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliates.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  // bank | duitnow
  method: text('method').notNull().default('duitnow'),
  // scheduled | processing | paid | rejected
  status: text('status').notNull().default('scheduled'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});
