import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "aba_session";
const GATE_COOKIE = "aba_gate";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — it's a family device
const GATE_TTL_MS = 180 * 24 * 60 * 60 * 1000; // 180 days — a device clears the gate once
const PROD = process.env.NODE_ENV === "production";

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

/** scrypt hash with per-secret salt — used for both PINs and the family passphrase. */
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

// Alias for readability where a passphrase (not a PIN) is meant.
export const hashSecret = hashPin;
export const verifySecret = verifyPin;

export const PIN_RE = /^\d{6,10}$/;
export const PIN_RULE = "PIN must be 6-10 digits";

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${expires}`;
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: PROD,
    sameSite: "lax",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// ---------- Family "gate": a shared passphrase that guards the login screen ----------

function gateToken(passphraseHash: string): string {
  return sign(`gate:${passphraseHash}`);
}

/** The family passphrase hash, or null if this family never set one (gate off). */
export function gatePassphraseHash(): string | null {
  const s = db.select().from(schema.familySettings).where(eq(schema.familySettings.id, 1)).get();
  return s?.gatePassphraseHash ?? null;
}

/** True when the visitor may see the login screen (gate satisfied or not configured). */
export async function isGateOpen(): Promise<boolean> {
  const hash = gatePassphraseHash();
  if (!hash) return true; // legacy family with no passphrase — don't lock them out
  const store = await cookies();
  const token = store.get(GATE_COOKIE)?.value;
  if (!token) return false;
  const expected = gateToken(hash);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export async function openGate(passphraseHash: string): Promise<void> {
  const store = await cookies();
  store.set(GATE_COOKIE, gateToken(passphraseHash), {
    httpOnly: true,
    secure: PROD,
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + GATE_TTL_MS),
  });
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
