import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

// All money amounts are integer cents in the family currency.

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  role: text("role", { enum: ["parent", "kid"] }).notNull(),
  pinHash: text("pin_hash").notNull(),
  // per-kid overrides; null falls back to family settings
  interestPctMonthly: real("interest_pct_monthly"),
  lockDays: integer("lock_days"),
  createdAt: integer("created_at").notNull(),
});

export const familySettings = sqliteTable("family_settings", {
  id: integer("id").primaryKey(), // always 1
  currency: text("currency").notNull().default("USD"),
  interestPctMonthly: real("interest_pct_monthly").notNull().default(5),
  lockDays: integer("lock_days").notNull().default(30),
  ntfyTopic: text("ntfy_topic"),
  lastInterestRun: text("last_interest_run"), // "YYYY-MM" of last credited month
  lastJobsRun: text("last_jobs_run"), // "YYYY-MM-DD" of last daily job pass
});

export type TxKind =
  | "deposit"
  | "withdrawal"
  | "allowance"
  | "interest"
  | "savings_in"
  | "savings_out"
  | "buy"
  | "sell"
  | "adjustment";

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  kind: text("kind").$type<TxKind>().notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull(),
  // positive display amount in cents
  amount: integer("amount").notNull(),
  // signed effect on checking balance, applied only when status = approved
  checkingDelta: integer("checking_delta").notNull(),
  description: text("description").notNull(),
  // JSON: { ticker, shares, priceCents, usdClose, fxRate, lotIds, actorId, ... }
  meta: text("meta"),
  createdAt: integer("created_at").notNull(),
  decidedAt: integer("decided_at"),
  decidedById: integer("decided_by_id").references(() => users.id),
});

export const savingsLots = sqliteTable("savings_lots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  originalAmount: integer("original_amount").notNull(),
  remaining: integer("remaining").notNull(),
  source: text("source", { enum: ["deposit", "interest"] }).notNull(),
  createdAt: integer("created_at").notNull(),
  maturesAt: integer("matures_at").notNull(),
  txId: integer("tx_id").references(() => transactions.id),
});

export const positions = sqliteTable(
  "positions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id),
    ticker: text("ticker").notNull(),
    shares: real("shares").notNull(),
    // average cost per share, in cents of family currency (fractional cents allowed)
    avgCostCents: real("avg_cost_cents").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("positions_user_ticker").on(t.userId, t.ticker)]
);

export const allowances = sqliteTable("allowances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  cadence: text("cadence", { enum: ["weekly", "monthly"] }).notNull(),
  // weekly: 0-6 (Sunday=0); monthly: 1-28
  day: integer("day").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // "YYYY-MM-DD" of the last due date that was paid
  lastPaidDue: text("last_paid_due"),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  target: integer("target").notNull(),
  createdAt: integer("created_at").notNull(),
  achievedAt: integer("achieved_at"),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorId: integer("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  detail: text("detail"), // JSON
  createdAt: integer("created_at").notNull(),
});

// Latest known EOD close per ticker, in USD.
export const prices = sqliteTable("prices", {
  ticker: text("ticker").primaryKey(),
  closeUsd: real("close_usd").notNull(),
  asOf: text("as_of").notNull(), // trade date "YYYY-MM-DD"
  fetchedAt: integer("fetched_at").notNull(),
});

// USD -> family currency rate (single row, id 1). rate = 1 when currency is USD.
export const fxRate = sqliteTable("fx_rate", {
  id: integer("id").primaryKey(),
  rate: real("rate").notNull(),
  asOf: text("as_of").notNull(),
  fetchedAt: integer("fetched_at").notNull(),
});
