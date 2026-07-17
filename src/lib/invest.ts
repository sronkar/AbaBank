import { db, schema } from "@/db";
import { and, eq, gt } from "drizzle-orm";
import { audit } from "./audit";
import { checkingBalance } from "./ledger";
import { getPriceCents } from "./market";
import { getSettings } from "./settings";
import { formatShares } from "./money";

export type Position = typeof schema.positions.$inferSelect;

const EPSILON_SHARES = 1e-6;

export function getPositions(userId: number): Position[] {
  return db
    .select()
    .from(schema.positions)
    .where(and(eq(schema.positions.userId, userId), gt(schema.positions.shares, EPSILON_SHARES)))
    .all();
}

/** Buy `amount` cents worth of a ticker at the latest EOD price. Updates average cost. */
const INSUFFICIENT = "__insufficient__";

export async function buyStock(
  userId: number,
  ticker: string,
  amount: number
): Promise<{ ok: true; shares: number; priceCents: number } | { ok: false; error: string }> {
  // Cheap early-out for a nicer message; the authoritative check is inside the txn below.
  if (checkingBalance(userId) < amount) {
    return { ok: false, error: "Not enough money in checking" };
  }
  const { currency } = getSettings();
  const priced = await getPriceCents(ticker, currency);
  if (!priced) return { ok: false, error: `Couldn't find a price for "${ticker.toUpperCase()}"` };
  const { priceCents, quote, fxRate } = priced;
  const shares = amount / priceCents;
  const now = Date.now();
  try {
    db.transaction((txDb) => {
      // Re-check balance atomically: the price fetch above yielded the event loop,
      // so a concurrent buy could have spent the money in the meantime.
      if (checkingBalance(userId) < amount) throw new Error(INSUFFICIENT);
      txDb
        .insert(schema.transactions)
      .values({
        userId,
        kind: "buy",
        status: "approved",
        amount,
        checkingDelta: -amount,
        description: `Bought ${formatShares(shares)} ${quote.ticker}`,
        meta: JSON.stringify({
          ticker: quote.ticker,
          shares,
          priceCents,
          usdClose: quote.closeUsd,
          fxRate,
          asOf: quote.asOf,
        }),
        createdAt: now,
        decidedAt: now,
      })
      .run();
    const existing = txDb
      .select()
      .from(schema.positions)
      .where(and(eq(schema.positions.userId, userId), eq(schema.positions.ticker, quote.ticker)))
      .get();
    if (existing && existing.shares > EPSILON_SHARES) {
      const totalShares = existing.shares + shares;
      const totalCost = existing.shares * existing.avgCostCents + amount;
      txDb
        .update(schema.positions)
        .set({ shares: totalShares, avgCostCents: totalCost / totalShares, updatedAt: now })
        .where(eq(schema.positions.id, existing.id))
        .run();
    } else if (existing) {
      txDb
        .update(schema.positions)
        .set({ shares, avgCostCents: priceCents, updatedAt: now })
        .where(eq(schema.positions.id, existing.id))
        .run();
    } else {
      txDb
        .insert(schema.positions)
        .values({ userId, ticker: quote.ticker, shares, avgCostCents: priceCents, updatedAt: now })
        .run();
    }
    });
  } catch (err) {
    if (err instanceof Error && err.message === INSUFFICIENT) {
      return { ok: false, error: "Not enough money in checking" };
    }
    throw err;
  }
  audit(userId, "buy", "position", null, { ticker: quote.ticker, amount, shares, priceCents });
  return { ok: true, shares, priceCents };
}

/**
 * Sell shares at the latest EOD price. `sellAll` liquidates the position;
 * otherwise `amount` is the target proceeds in cents.
 * Profit = (price - avgCost) * sharesSold.
 */
export async function sellStock(
  userId: number,
  ticker: string,
  opts: { amount?: number; sellAll?: boolean }
): Promise<
  | { ok: true; proceeds: number; profit: number; sharesSold: number }
  | { ok: false; error: string }
> {
  const tickerUp = ticker.trim().toUpperCase();
  const position = db
    .select()
    .from(schema.positions)
    .where(and(eq(schema.positions.userId, userId), eq(schema.positions.ticker, tickerUp)))
    .get();
  if (!position || position.shares <= EPSILON_SHARES) {
    return { ok: false, error: `You don't own any ${tickerUp}` };
  }
  if (!opts.sellAll && (!opts.amount || opts.amount <= 0)) {
    return { ok: false, error: "Invalid amount" };
  }
  const { currency } = getSettings();
  const priced = await getPriceCents(tickerUp, currency);
  if (!priced) return { ok: false, error: `Couldn't get a price for ${tickerUp}` };
  const { priceCents, quote, fxRate } = priced;
  const now = Date.now();

  let proceeds = 0;
  let profit = 0;
  let sharesSold = 0;
  try {
    db.transaction((txDb) => {
      // Re-read the position atomically — a concurrent sell during the price
      // fetch could have reduced or liquidated it.
      const fresh = txDb
        .select()
        .from(schema.positions)
        .where(and(eq(schema.positions.userId, userId), eq(schema.positions.ticker, tickerUp)))
        .get();
      if (!fresh || fresh.shares <= EPSILON_SHARES) throw new Error(INSUFFICIENT);

      sharesSold = opts.sellAll ? fresh.shares : opts.amount! / priceCents;
      if (sharesSold > fresh.shares) sharesSold = fresh.shares;
      const liquidated = fresh.shares - sharesSold <= EPSILON_SHARES;
      if (liquidated) sharesSold = fresh.shares;

      proceeds = Math.round(sharesSold * priceCents);
      profit = proceeds - Math.round(sharesSold * fresh.avgCostCents);

      txDb
        .insert(schema.transactions)
        .values({
          userId,
          kind: "sell",
          status: "approved",
          amount: proceeds,
          checkingDelta: proceeds,
          description: `Sold ${formatShares(sharesSold)} ${tickerUp}`,
          meta: JSON.stringify({
            ticker: tickerUp,
            shares: sharesSold,
            priceCents,
            avgCostCents: fresh.avgCostCents,
            profit,
            usdClose: quote.closeUsd,
            fxRate,
            asOf: quote.asOf,
          }),
          createdAt: now,
          decidedAt: now,
        })
        .run();
      txDb
        .update(schema.positions)
        .set({ shares: liquidated ? 0 : fresh.shares - sharesSold, updatedAt: now })
        .where(eq(schema.positions.id, fresh.id))
        .run();
    });
  } catch (err) {
    if (err instanceof Error && err.message === INSUFFICIENT) {
      return { ok: false, error: `You don't own any ${tickerUp}` };
    }
    throw err;
  }
  audit(userId, "sell", "position", position.id, { ticker: tickerUp, sharesSold, proceeds, profit });
  return { ok: true, proceeds, profit, sharesSold };
}

/** Portfolio with live values and unrealized profit, in family-currency cents. */
export async function portfolioView(userId: number): Promise<{
  positions: Array<
    Position & { priceCents: number | null; value: number | null; unrealized: number | null }
  >;
  totalValue: number;
}> {
  const { currency } = getSettings();
  const positions = getPositions(userId);
  let totalValue = 0;
  const enriched = await Promise.all(
    positions.map(async (p) => {
      const priced = await getPriceCents(p.ticker, currency).catch(() => null);
      if (!priced) return { ...p, priceCents: null, value: null, unrealized: null };
      const value = Math.round(p.shares * priced.priceCents);
      const unrealized = Math.round(p.shares * (priced.priceCents - p.avgCostCents));
      totalValue += value;
      return { ...p, priceCents: priced.priceCents, value, unrealized };
    })
  );
  return { positions: enriched, totalValue };
}
