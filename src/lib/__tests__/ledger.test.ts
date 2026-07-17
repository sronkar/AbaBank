import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ababank-test-"));

// Imported after DATA_DIR is set so the DB lands in the temp dir.
const { db, schema } = await import("@/db");
const { hashPin } = await import("@/lib/auth");
const { checkingBalance, decideTransaction, adjustBalance } = await import("@/lib/ledger");
const { moveToSavings, withdrawFromLot, openLots, creditMonthlyInterest, savingsPrincipal } =
  await import("@/lib/savings");
const { buyStock, sellStock, getPositions } = await import("@/lib/invest");
const { runInterestCatchUp } = await import("@/lib/jobs");
const { eq } = await import("drizzle-orm");

let parentId: number;
let kidId: number;

function seedApprovedDeposit(userId: number, cents: number) {
  db.insert(schema.transactions)
    .values({
      userId,
      kind: "deposit",
      status: "approved",
      amount: cents,
      checkingDelta: cents,
      description: "seed",
      createdAt: Date.now(),
      decidedAt: Date.now(),
    })
    .run();
}

function seedPrice(ticker: string, closeUsd: number) {
  db.insert(schema.prices)
    .values({ ticker, closeUsd, asOf: "2026-07-16", fetchedAt: Date.now() })
    .onConflictDoUpdate({
      target: schema.prices.ticker,
      set: { closeUsd, fetchedAt: Date.now() },
    })
    .run();
}

beforeAll(() => {
  const parent = db
    .insert(schema.users)
    .values({ name: "Aba", role: "parent", pinHash: hashPin("1234"), createdAt: Date.now() })
    .returning()
    .get();
  const kid = db
    .insert(schema.users)
    .values({ name: "Kid", role: "kid", pinHash: hashPin("1111"), createdAt: Date.now() })
    .returning()
    .get();
  parentId = parent.id;
  kidId = kid.id;
  db.insert(schema.familySettings).values({ id: 1, currency: "USD" }).onConflictDoNothing().run();
});

describe("approval flow", () => {
  it("pending transactions don't count; approved ones do", () => {
    const tx = db
      .insert(schema.transactions)
      .values({
        userId: kidId,
        kind: "deposit",
        status: "pending",
        amount: 2000,
        checkingDelta: 2000,
        description: "birthday",
        createdAt: Date.now(),
      })
      .returning()
      .get();
    expect(checkingBalance(kidId)).toBe(0);
    expect(decideTransaction(tx.id, parentId, "approved")).toEqual({ ok: true });
    expect(checkingBalance(kidId)).toBe(2000);
  });

  it("rejects withdrawal approval that would overdraw", () => {
    const tx = db
      .insert(schema.transactions)
      .values({
        userId: kidId,
        kind: "withdrawal",
        status: "pending",
        amount: 99999,
        checkingDelta: -99999,
        description: "too much",
        createdAt: Date.now(),
      })
      .returning()
      .get();
    const result = decideTransaction(tx.id, parentId, "approved");
    expect(result.ok).toBe(false);
    expect(checkingBalance(kidId)).toBe(2000);
  });

  it("cannot double-decide", () => {
    const tx = db
      .insert(schema.transactions)
      .values({
        userId: kidId,
        kind: "deposit",
        status: "pending",
        amount: 100,
        checkingDelta: 100,
        description: "x",
        createdAt: Date.now(),
      })
      .returning()
      .get();
    decideTransaction(tx.id, parentId, "rejected");
    expect(checkingBalance(kidId)).toBe(2000);
    const again = decideTransaction(tx.id, parentId, "approved");
    expect(again.ok).toBe(false);
  });
});

describe("savings lots and interest", () => {
  it("moves money into a locked lot and withdraws from it", () => {
    const kid = { id: kidId, lockDays: 30, interestPctMonthly: null };
    expect(moveToSavings(kid, 1000)).toEqual({ ok: true });
    expect(checkingBalance(kidId)).toBe(1000);
    expect(savingsPrincipal(kidId)).toBe(1000);
    const lot = openLots(kidId)[0];
    expect(lot.maturesAt).toBeGreaterThan(Date.now());

    const early = withdrawFromLot(kidId, lot.id, 400);
    expect(early).toEqual({ ok: true, early: true });
    expect(checkingBalance(kidId)).toBe(1400);
    expect(savingsPrincipal(kidId)).toBe(600);
  });

  it("blocks overdrawing a lot and overdrawing checking into savings", () => {
    const lot = openLots(kidId)[0];
    expect(withdrawFromLot(kidId, lot.id, 999999).ok).toBe(false);
    const kid = { id: kidId, lockDays: 30, interestPctMonthly: null };
    expect(moveToSavings(kid, 999999).ok).toBe(false);
  });

  it("credits monthly interest as a new unlocked lot (compounds)", () => {
    // principal 600, 5% => 30
    const credited = creditMonthlyInterest({ id: kidId, interestPctMonthly: 5 }, 5, "2026-07");
    expect(credited).toBe(30);
    expect(savingsPrincipal(kidId)).toBe(630);
    const lots = openLots(kidId);
    const interestLot = lots.find((l) => l.source === "interest")!;
    expect(interestLot.remaining).toBe(30);
    expect(interestLot.maturesAt).toBeLessThanOrEqual(Date.now());
  });

  it("interest catch-up compounds across missed months", () => {
    db.update(schema.familySettings)
      .set({ lastInterestRun: "2026-05", interestPctMonthly: 10 })
      .where(eq(schema.familySettings.id, 1))
      .run();
    const before = savingsPrincipal(kidId); // 630
    runInterestCatchUp(new Date("2026-07-17T12:00:00"));
    // two missed months at 10%: 630 -> +63 = 693 -> +69 = 762
    expect(savingsPrincipal(kidId)).toBe(before + 63 + 69);
    const settings = db.select().from(schema.familySettings).where(eq(schema.familySettings.id, 1)).get()!;
    expect(settings.lastInterestRun).toBe("2026-07");
  });
});

describe("investing with average cost", () => {
  it("buys fractional shares and averages cost across buys", async () => {
    seedApprovedDeposit(kidId, 10000);
    seedPrice("TEST", 100); // $100/share => 10000 cents
    const buy1 = await buyStock(kidId, "TEST", 5000); // 0.5 shares @ 10000
    expect(buy1.ok).toBe(true);
    seedPrice("TEST", 200); // price doubles
    const buy2 = await buyStock(kidId, "TEST", 5000); // 0.25 shares @ 20000
    expect(buy2.ok).toBe(true);
    const pos = getPositions(kidId).find((p) => p.ticker === "TEST")!;
    expect(pos.shares).toBeCloseTo(0.75, 6);
    // avg cost = 10000 total cents / 0.75 shares = 13333.33 cents/share
    expect(pos.avgCostCents).toBeCloseTo(10000 / 0.75, 3);
  });

  it("sells at the current price and reports profit vs average cost", async () => {
    const result = await sellStock(kidId, "TEST", { sellAll: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 0.75 shares * 20000 = 15000 proceeds; cost basis 10000 => profit 5000
    expect(result.proceeds).toBe(15000);
    expect(result.profit).toBe(5000);
    expect(getPositions(kidId).find((p) => p.ticker === "TEST")).toBeUndefined();
  });

  it("blocks buying with more than checking balance", async () => {
    const balance = checkingBalance(kidId);
    seedPrice("TEST2", 10);
    const result = await buyStock(kidId, "TEST2", balance + 1);
    expect(result.ok).toBe(false);
  });
});

describe("corrections", () => {
  it("applies signed adjustments", () => {
    const before = checkingBalance(kidId);
    adjustBalance(parentId, kidId, -500, "approved too much");
    expect(checkingBalance(kidId)).toBe(before - 500);
  });
});
