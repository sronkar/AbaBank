import { db, schema } from "@/db";
import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { audit } from "./audit";
import { notify } from "./notify";
import { formatCents } from "./money";
import { getSettings } from "./settings";

export type Tx = typeof schema.transactions.$inferSelect;

export function checkingBalance(userId: number): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${schema.transactions.checkingDelta}), 0)` })
    .from(schema.transactions)
    .where(and(eq(schema.transactions.userId, userId), eq(schema.transactions.status, "approved")))
    .get();
  return row?.total ?? 0;
}

export function savingsBalance(userId: number): number {
  const row = db
    .select({ total: sql<number>`coalesce(sum(${schema.savingsLots.remaining}), 0)` })
    .from(schema.savingsLots)
    .where(eq(schema.savingsLots.userId, userId))
    .get();
  return row?.total ?? 0;
}

export function recentTransactions(userId: number, limit = 50): Tx[] {
  return db
    .select()
    .from(schema.transactions)
    .where(eq(schema.transactions.userId, userId))
    .orderBy(desc(schema.transactions.createdAt), desc(schema.transactions.id))
    .limit(limit)
    .all();
}

export function pendingRequests(): (Tx & { userName: string })[] {
  return db
    .select({ ...getTableColumns(schema.transactions), userName: schema.users.name })
    .from(schema.transactions)
    .innerJoin(schema.users, eq(schema.transactions.userId, schema.users.id))
    .where(eq(schema.transactions.status, "pending"))
    .orderBy(desc(schema.transactions.createdAt))
    .all();
}

/** Kid requests a deposit or withdrawal. Sits pending until a parent approves. */
export async function requestTransaction(
  userId: number,
  userName: string,
  kind: "deposit" | "withdrawal",
  amount: number,
  description: string
): Promise<Tx> {
  const delta = kind === "deposit" ? amount : -amount;
  const tx = db
    .insert(schema.transactions)
    .values({
      userId,
      kind,
      status: "pending",
      amount,
      checkingDelta: delta,
      description,
      createdAt: Date.now(),
    })
    .returning()
    .get();
  audit(userId, "request", "transaction", tx.id, { kind, amount, description });
  const { currency } = getSettings();
  await notify(
    `AbaBank: ${userName} requests a ${kind}`,
    `${formatCents(amount, currency)} — "${description}"`
  );
  return tx;
}

export function decideTransaction(
  txId: number,
  parentId: number,
  decision: "approved" | "rejected"
): { ok: true } | { ok: false; error: string } {
  const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, txId)).get();
  if (!tx) return { ok: false, error: "Transaction not found" };
  if (tx.status !== "pending") return { ok: false, error: "Already decided" };
  if (decision === "approved" && tx.checkingDelta < 0) {
    const balance = checkingBalance(tx.userId);
    if (balance + tx.checkingDelta < 0) {
      return { ok: false, error: "Insufficient funds — kid's checking balance is too low" };
    }
  }
  db.update(schema.transactions)
    .set({ status: decision, decidedAt: Date.now(), decidedById: parentId })
    .where(eq(schema.transactions.id, txId))
    .run();
  audit(parentId, decision === "approved" ? "approve" : "reject", "transaction", txId, {
    kind: tx.kind,
    amount: tx.amount,
  });
  return { ok: true };
}

/**
 * Parent correction: a signed adjustment to a kid's checking balance,
 * recorded as its own approved transaction plus an audit entry.
 */
export function adjustBalance(
  parentId: number,
  kidId: number,
  signedAmount: number,
  reason: string
): Tx {
  const tx = db
    .insert(schema.transactions)
    .values({
      userId: kidId,
      kind: "adjustment",
      status: "approved",
      amount: Math.abs(signedAmount),
      checkingDelta: signedAmount,
      description: reason,
      meta: JSON.stringify({ actorId: parentId }),
      createdAt: Date.now(),
      decidedAt: Date.now(),
      decidedById: parentId,
    })
    .returning()
    .get();
  audit(parentId, "adjust", "transaction", tx.id, { kidId, signedAmount, reason });
  return tx;
}
