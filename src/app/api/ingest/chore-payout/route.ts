import crypto from "node:crypto";
import { ingestPayout } from "@/lib/ingest";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const expected = process.env.CHORES_INGEST_TOKEN;
  if (!expected) {
    return Response.json({ ok: false, error: "Ingest is not configured" }, { status: 503 });
  }
  if (!bearerMatches(req, expected)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await ingestPayout({
    externalId: typeof body.externalId === "string" ? body.externalId : "",
    userId: typeof body.userId === "number" ? body.userId : undefined,
    userName: typeof body.userName === "string" ? body.userName : undefined,
    amountCents: typeof body.amountCents === "number" ? body.amountCents : NaN,
    description: typeof body.description === "string" ? body.description : undefined,
    points: typeof body.points === "number" ? body.points : undefined,
    source: "chore",
  });

  if (!result.ok) {
    return Response.json({ ok: false, error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true, txId: result.txId, idempotent: result.idempotent });
}

function bearerMatches(req: Request, expected: string): boolean {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const provided = Buffer.from(m[1]);
  const want = Buffer.from(expected);
  return provided.length === want.length && crypto.timingSafeEqual(provided, want);
}
