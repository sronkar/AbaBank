import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { audit } from "./audit";
import { notify } from "./notify";
import { formatCents } from "./money";
import { getSettings } from "./settings";

export type IngestInput = {
  externalId: string;
  userId?: number;
  userName?: string;
  amountCents: number;
  description?: string;
  points?: number;
  source?: string;
};

export type IngestResult =
  | { ok: true; txId: number; idempotent: boolean }
  | { ok: false; error: string; status: number };

export async function ingestPayout(input: IngestInput): Promise<IngestResult> {
  const externalId = typeof input.externalId === "string" ? input.externalId.trim() : "";
  if (!externalId) return { ok: false, error: "externalId is required", status: 400 };

  const amount = input.amountCents;
  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: "amountCents must be a positive integer", status: 400 };
  }

  const source = (input.source || "chore").toString().slice(0, 32);
  const description = (input.description || "Chore payout").toString().slice(0, 500);

  let user: typeof schema.users.$inferSelect | undefined;
  if (input.userId != null) {
    user = db.select().from(schema.users).where(eq(schema.users.id, input.userId)).get();
  } else if (input.userName) {
    user = db.select().from(schema.users).where(eq(schema.users.name, input.userName)).get();
  } else {
    return { ok: false, error: "userId or userName is required", status: 400 };
  }
  if (!user) return { ok: false, error: "Unknown AbaBank user", status: 404 };
  if (user.role !== "kid") return { ok: false, error: "Payouts can only credit a kid account", status: 400 };
  if (!user.active) return { ok: false, error: "Account is inactive", status: 400 };

  const outcome = db.transaction((tx): { txId: number; idempotent: boolean } => {
    const existing = tx
      .select({ id: schema.transactions.id })
      .from(schema.transactions)
      .where(sql`json_extract(${schema.transactions.meta}, '$.externalId') = ${externalId}`)
      .get();
    if (existing) return { txId: existing.id, idempotent: true };

    const created = tx
      .insert(schema.transactions)
      .values({
        userId: user!.id,
        kind: "deposit",
        status: "pending",
        amount,
        checkingDelta: amount,
        description,
        meta: JSON.stringify({ externalId, source, points: input.points ?? null, actorId: null }),
        createdAt: Date.now(),
      })
      .returning()
      .get();
    audit(null, "ingest", "transaction", created.id, { source, externalId, amount, userId: user!.id });
    return { txId: created.id, idempotent: false };
  });

  if (!outcome.idempotent) {
    const { currency } = getSettings();
    await notify(
      `AbaBank: chore payout for ${user.name}`,
      `${formatCents(amount, currency)} — "${description}" (pending your approval)`
    );
  }

  return { ok: true, txId: outcome.txId, idempotent: outcome.idempotent };
}
