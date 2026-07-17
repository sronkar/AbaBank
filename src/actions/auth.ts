"use server";

import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import {
  createSession,
  destroySession,
  hashPin,
  hashSecret,
  verifyPin,
  verifySecret,
  openGate,
  gatePassphraseHash,
  PIN_RE,
  PIN_RULE,
} from "@/lib/auth";
import { audit } from "@/lib/audit";
import { isSupportedCurrency, CURRENCY_LIST } from "@/lib/money";
import { checkLock, clientKey, lockMessage, recordFailure, recordSuccess } from "@/lib/ratelimit";

export type ActionResult = { error?: string; success?: string } | undefined;

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const key = await clientKey("login");
  const locked = checkLock(key);
  if (locked > 0) return { error: lockMessage(locked) };

  const userId = Number(formData.get("userId"));
  const pin = String(formData.get("pin") ?? "");
  const user = db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, userId), eq(schema.users.active, true)))
    .get();
  if (!user || !verifyPin(pin, user.pinHash)) {
    recordFailure(key);
    return { error: "Wrong PIN — try again" };
  }
  recordSuccess(key);
  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** Family gate: check the shared passphrase before the login screen is shown. */
export async function enterGate(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const key = await clientKey("gate");
  const locked = checkLock(key);
  if (locked > 0) return { error: lockMessage(locked) };

  const hash = gatePassphraseHash();
  if (!hash) redirect("/login"); // no passphrase configured — gate is off
  const passphrase = String(formData.get("passphrase") ?? "");
  if (!verifySecret(passphrase, hash!)) {
    recordFailure(key);
    return { error: "That's not the family password." };
  }
  recordSuccess(key);
  await openGate(hash!);
  redirect("/login");
}

/** First-run setup: create the first parent and the family passphrase. */
export async function setupFamily(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const existing = db.select({ id: schema.users.id }).from(schema.users).limit(1).get();
  if (existing) return { error: "Setup already completed" };
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const passphrase = String(formData.get("passphrase") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD")
    .trim()
    .toUpperCase();
  if (!name) return { error: "Name is required" };
  if (!PIN_RE.test(pin)) return { error: PIN_RULE };
  if (passphrase.length < 6) return { error: "Family password must be at least 6 characters" };
  if (!isSupportedCurrency(currency)) {
    return { error: `Currency must be one of: ${CURRENCY_LIST.join(", ")}` };
  }
  const user = db
    .insert(schema.users)
    .values({ name, role: "parent", pinHash: hashPin(pin), createdAt: Date.now() })
    .returning()
    .get();
  db.insert(schema.familySettings)
    .values({ id: 1, currency, gatePassphraseHash: hashSecret(passphrase) })
    .onConflictDoUpdate({
      target: schema.familySettings.id,
      set: { currency, gatePassphraseHash: hashSecret(passphrase) },
    })
    .run();
  audit(user.id, "setup", "user", user.id, { name, currency });
  await createSession(user.id);
  redirect("/");
}
