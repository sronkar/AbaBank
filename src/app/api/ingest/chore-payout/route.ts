import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";

// Server-to-server ingest of chore payouts from HouseChores.
// Creates a PENDING deposit the parent approves in the normal approval queue,
// so AbaBank's "approval = cash moves" invariant is preserved.
// Protected by a shared bearer token (env CHORES_INGEST_TOKEN); disabled if unset.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenOk(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const expected = process.env.CHORES_INGEST_TOKEN;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "ingest disabled" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  const provided = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.headers.get("x-ingest-token");
  if (!tokenOk(provided, expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const externalId = String(body.externalId ?? "").trim();
  const amountCents = Number(body.amountCents);
  const description = String(body.description ?? "Chore points payout").slice(0, 200);
  const points = typeof body.points === "number" ? body.points : null;

  if (!externalId) {
    return NextResponse.json({ ok: false, error: "externalId required" }, { status: 400 });
  }
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return NextResponse.json(
      { ok: false, error: "amountCents must be a positive integer" },
      { status: 400 }
    );
  }

  // Resolve the target kid: prefer explicit userId, else unique name.
  let user: typeof schema.users.$inferSelect | undefined;
  if (body.userId != null && Number.isFinite(Number(body.userId))) {
    user = db.select().from(schema.users).where(eq(schema.users.id, Number(body.userId))).get();
  } else if (body.userName != null) {
    user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.name, String(body.userName)))
      .get();
  }
  if (!user) {
    return NextResponse.json({ ok: false, error: "target user not found" }, { status: 404 });
  }
  if (!user.active) {
    return NextResponse.json({ ok: false, error: "target user inactive" }, { status: 409 });
  }

  // Idempotency: one payout per externalId, even across retries.
  const existing = db
    .select()
    .from(schema.transactions)
    .where(sql`json_extract(${schema.transactions.meta}, '$.externalId') = ${externalId}`)
    .get();
  if (existing) {
    return NextResponse.json({
      ok: true,
      txId: existing.id,
      status: existing.status,
      idempotent: true,
    });
  }

  const tx = db
    .insert(schema.transactions)
    .values({
      userId: user.id,
      kind: "deposit",
      status: "pending",
      amount: amountCents,
      checkingDelta: amountCents,
      description,
      meta: JSON.stringify({ source: "housechores", externalId, points }),
      createdAt: Date.now(),
    })
    .returning()
    .get();

  audit(null, "ingest", "transaction", tx.id, {
    source: "housechores",
    externalId,
    amountCents,
    userId: user.id,
  });

  try {
    const { currency } = getSettings();
    await notify(
      "AbaBank: chore payout pending",
      `${formatCents(amountCents, currency)} for ${user.name} — "${description}"`
    );
  } catch {
    // notifications are best-effort
  }

  return NextResponse.json({ ok: true, txId: tx.id, status: "pending" });
}
