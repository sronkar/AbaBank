import { db, schema } from "@/db";
import { and, asc, eq, gt } from "drizzle-orm";
import { audit } from "./audit";
import { checkingBalance } from "./ledger";
import { kidLockDays } from "./settings";

export type Lot = typeof schema.savingsLots.$inferSelect;

export function openLots(userId: number): Lot[] {
  return db
    .select()
    .from(schema.savingsLots)
    .where(and(eq(schema.savingsLots.userId, userId), gt(schema.savingsLots.remaining, 0)))
    .orderBy(asc(schema.savingsLots.maturesAt))
    .all();
}

export function isMature(lot: Lot, now = Date.now()): boolean {
  return lot.maturesAt <= now;
}

/** Move money from checking into a new locked savings lot. */
export function moveToSavings(
  user: { id: number; lockDays: number | null },
  amount: number
): { ok: true } | { ok: false; error: string } {
  if (checkingBalance(user.id) < amount) {
    return { ok: false, error: "Not enough money in checking" };
  }
  const lockDays = kidLockDays(user);
  const now = Date.now();
  const result = db.transaction((txDb) => {
    const tx = txDb
      .insert(schema.transactions)
      .values({
        userId: user.id,
        kind: "savings_in",
        status: "approved",
        amount,
        checkingDelta: -amount,
        description: `Moved to savings (locked ${lockDays} days)`,
        createdAt: now,
        decidedAt: now,
      })
      .returning()
      .get();
    txDb
      .insert(schema.savingsLots)
      .values({
        userId: user.id,
        originalAmount: amount,
        remaining: amount,
        source: "deposit",
        createdAt: now,
        maturesAt: now + lockDays * 24 * 60 * 60 * 1000,
        txId: tx.id,
      })
      .run();
    return tx;
  });
  audit(user.id, "savings_in", "transaction", result.id, { amount, lockDays });
  return { ok: true };
}

/**
 * Withdraw from a specific lot back to checking.
 * Mature lots withdraw freely; breaking an immature lot is allowed —
 * the "penalty" is inherent: the money won't be there at the next interest payday.
 */
export function withdrawFromLot(
  userId: number,
  lotId: number,
  amount: number
): { ok: true; early: boolean } | { ok: false; error: string } {
  const lot = db
    .select()
    .from(schema.savingsLots)
    .where(and(eq(schema.savingsLots.id, lotId), eq(schema.savingsLots.userId, userId)))
    .get();
  if (!lot || lot.remaining <= 0) return { ok: false, error: "Savings lot not found" };
  if (amount > lot.remaining) return { ok: false, error: "Amount exceeds what's in this lot" };
  const now = Date.now();
  const early = !isMature(lot, now);
  db.transaction((txDb) => {
    txDb
      .update(schema.savingsLots)
      .set({ remaining: lot.remaining - amount })
      .where(eq(schema.savingsLots.id, lotId))
      .run();
    txDb
      .insert(schema.transactions)
      .values({
        userId,
        kind: "savings_out",
        status: "approved",
        amount,
        checkingDelta: amount,
        description: early
          ? "Withdrew from savings early (lost this month's interest on it)"
          : "Withdrew from savings",
        meta: JSON.stringify({ lotId, early }),
        createdAt: now,
        decidedAt: now,
      })
      .run();
  });
  audit(userId, "savings_out", "savings_lot", lotId, { amount, early });
  return { ok: true, early };
}

/** Total savings principal for a kid (sum of open lot remainders). */
export function savingsPrincipal(userId: number): number {
  return openLots(userId).reduce((sum, lot) => sum + lot.remaining, 0);
}

/** Credit one month of interest: creates an approved interest tx and an already-mature lot (compounds). */
export function creditMonthlyInterest(
  user: { id: number; interestPctMonthly: number | null },
  ratePct: number,
  monthLabel: string
): number {
  const principal = savingsPrincipal(user.id);
  const interest = Math.round((principal * ratePct) / 100);
  if (interest <= 0) return 0;
  const now = Date.now();
  db.transaction((txDb) => {
    const tx = txDb
      .insert(schema.transactions)
      .values({
        userId: user.id,
        kind: "interest",
        status: "approved",
        amount: interest,
        checkingDelta: 0,
        description: `Interest payday for ${monthLabel} (${ratePct}% on savings)`,
        meta: JSON.stringify({ principal, ratePct, month: monthLabel }),
        createdAt: now,
        decidedAt: now,
      })
      .returning()
      .get();
    txDb
      .insert(schema.savingsLots)
      .values({
        userId: user.id,
        originalAmount: interest,
        remaining: interest,
        source: "interest",
        createdAt: now,
        maturesAt: now, // interest is never locked
        txId: tx.id,
      })
      .run();
  });
  audit(null, "interest", "user", user.id, { principal, ratePct, interest, month: monthLabel });
  return interest;
}
