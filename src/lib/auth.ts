import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "aba_session";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — it's a family device

export type SessionUser = typeof schema.users.$inferSelect;

function getSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const dir = process.env.DATA_DIR || path.join(process.cwd(), ".data");
  const file = path.join(dir, "session-secret");
  try {
    return fs.readFileSync(file, "utf8").trim();
  } catch {
    fs.mkdirSync(dir, { recursive: true });
    const secret = crypto.randomBytes(32).toString("hex");
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return secret;
  }
}

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(pin, salt, 32).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function currentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userIdStr, expiresStr, sig] = parts;
  const payload = `${userIdStr}.${expiresStr}`;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  if (Number(expiresStr) < Date.now()) return null;
  const user = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, Number(userIdStr)))
    .get();
  return user ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireParent(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "parent") redirect("/");
  return user;
}
