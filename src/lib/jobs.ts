import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { audit } from "./audit";
import { dueDates, isoDate, isoMonth, monthsBetween } from "./dates";
import { getFxRate, getQuote } from "./market";
import { creditMonthlyInterest } from "./savings";
import { getSettings, kidInterestPct } from "./settings";

/**
 * Credit interest for every month since the last run (compounding across
 * missed months if the server was asleep). Runs are keyed by "YYYY-MM".
 */
export function runInterestCatchUp(now = new Date()): void {
  const settings = getSettings();
  const currentMonth = isoMonth(now);
  // First boot: don't back-pay history that predates the app; start from now.
  const from = settings.lastInterestRun ?? currentMonth;
  const months = monthsBetween(from, currentMonth);
  if (months.length === 0) {
    if (!settings.lastInterestRun) {
      db.update(schema.familySettings)
        .set({ lastInterestRun: currentMonth })
        .where(eq(schema.familySettings.id, 1))
        .run();
    }
    return;
  }
  const kids = db.select().from(schema.users).where(eq(schema.users.role, "kid")).all();
  for (const month of months) {
    for (const kid of kids) {
      creditMonthlyInterest(kid, kidInterestPct(kid), month);
    }
    db.update(schema.familySettings)
      .set({ lastInterestRun: month })
      .where(eq(schema.familySettings.id, 1))
      .run();
  }
}

/** Pay any allowance due dates that haven't been paid yet (auto-approved deposits). */
export function runAllowances(now = new Date()): void {
  const today = isoDate(now);
  const rules = db
    .select()
    .from(schema.allowances)
    .where(eq(schema.allowances.active, true))
    .all();
  for (const rule of rules) {
    // Unpaid rules start from today (set at creation); never back-pay more than 8 periods.
    const due = dueDates(rule.cadence, rule.day, rule.lastPaidDue, today).slice(-8);
    for (const dueDate of due) {
      db.transaction((txDb) => {
        txDb
          .insert(schema.transactions)
          .values({
            userId: rule.userId,
            kind: "allowance",
            status: "approved",
            amount: rule.amount,
            checkingDelta: rule.amount,
            description: `Allowance for ${dueDate}`,
            meta: JSON.stringify({ allowanceId: rule.id, dueDate }),
            createdAt: Date.now(),
            decidedAt: Date.now(),
          })
          .run();
        txDb
          .update(schema.allowances)
          .set({ lastPaidDue: dueDate })
          .where(eq(schema.allowances.id, rule.id))
          .run();
      });
      audit(null, "allowance", "user", rule.userId, { amount: rule.amount, dueDate });
    }
  }
}

/** Refresh cached prices for every held ticker, plus the FX rate. */
export async function refreshMarketData(): Promise<void> {
  const settings = getSettings();
  const held = db
    .selectDistinct({ ticker: schema.positions.ticker })
    .from(schema.positions)
    .all();
  for (const { ticker } of held) {
    await getQuote(ticker).catch(() => null);
  }
  if (settings.currency !== "USD") {
    await getFxRate(settings.currency).catch(() => null);
  }
}

/** Full daily pass — safe to run repeatedly. */
export async function runDailyJobs(now = new Date()): Promise<void> {
  try {
    runInterestCatchUp(now);
  } catch (err) {
    console.error("interest job failed:", err);
  }
  try {
    runAllowances(now);
  } catch (err) {
    console.error("allowance job failed:", err);
  }
  try {
    await refreshMarketData();
  } catch (err) {
    console.error("market refresh failed:", err);
  }
  db.update(schema.familySettings)
    .set({ lastJobsRun: isoDate(now) })
    .where(eq(schema.familySettings.id, 1))
    .run();
}
