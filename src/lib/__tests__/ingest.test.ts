import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ababank-ingest-"));

const { db, schema } = await import("@/db");
const { hashPin } = await import("@/lib/auth");
const { ingestPayout } = await import("@/lib/ingest");
const { checkingBalance, decideTransaction } = await import("@/lib/ledger");
const { eq, sql } = await import("drizzle-orm");

const KID = "Zoe";
let parentId: number;
let kidId: number;

beforeAll(() => {
  const parent = db
    .insert(schema.users)
    .values({ name: "Aba", role: "parent", pinHash: hashPin("123456"), createdAt: Date.now() })
    .returning()
    .get();
  const kid = db
    .insert(schema.users)
    .values({ name: KID, role: "kid", pinHash: hashPin("111111"), createdAt: Date.now() })
    .returning()
    .get();
  parentId = parent.id;
  kidId = kid.id;
  db.insert(schema.familySettings).values({ id: 1, currency: "USD" }).onConflictDoNothing().run();
});

describe("chore-payout ingest", () => {
  it("creates a pending deposit that only credits on approval", async () => {
    const r = await ingestPayout({ externalId: "hc-1", userId: kidId, amountCents: 250, description: "Chores: this week", points: 50 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.idempotent).toBe(false);
    expect(checkingBalance(kidId)).toBe(0);
    const tx = db.select().from(schema.transactions).where(eq(schema.transactions.id, r.txId)).get()!;
    expect(tx.status).toBe("pending");
    expect(tx.kind).toBe("deposit");
    expect(JSON.parse(tx.meta!).externalId).toBe("hc-1");

    expect(decideTransaction(r.txId, parentId, "approved").ok).toBe(true);
    expect(checkingBalance(kidId)).toBe(250);
  });

  it("is idempotent on externalId (no double payout on retry)", async () => {
    const a = await ingestPayout({ externalId: "hc-dup", userName: KID, amountCents: 100 });
    const b = await ingestPayout({ externalId: "hc-dup", userName: KID, amountCents: 100 });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.idempotent).toBe(false);
      expect(b.idempotent).toBe(true);
      expect(b.txId).toBe(a.txId);
    }
    const rows = db
      .select()
      .from(schema.transactions)
      .where(sql`json_extract(${schema.transactions.meta}, '$.externalId') = ${"hc-dup"}`)
      .all();
    expect(rows.length).toBe(1);
  });

  it("resolves by exact name and rejects unknown / non-kid targets", async () => {
    expect((await ingestPayout({ externalId: "hc-ok", userName: KID, amountCents: 100 })).ok).toBe(true);

    const unknown = await ingestPayout({ externalId: "hc-x", userName: "Nobody", amountCents: 100 });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.status).toBe(404);

    const toParent = await ingestPayout({ externalId: "hc-p", userId: parentId, amountCents: 100 });
    expect(toParent.ok).toBe(false);
  });

  it("refuses bad amounts and missing target", async () => {
    expect((await ingestPayout({ externalId: "hc-neg", userId: kidId, amountCents: -5 })).ok).toBe(false);
    expect((await ingestPayout({ externalId: "hc-zero", userId: kidId, amountCents: 0 })).ok).toBe(false);
    expect((await ingestPayout({ externalId: "hc-frac", userId: kidId, amountCents: 1.5 })).ok).toBe(false);
    expect((await ingestPayout({ externalId: "", userId: kidId, amountCents: 100 })).ok).toBe(false);
    expect((await ingestPayout({ externalId: "hc-notarget", amountCents: 100 })).ok).toBe(false);
  });
});
