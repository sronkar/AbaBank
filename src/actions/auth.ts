"use server";

import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { createSession, destroySession, hashPin, verifyPin } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type ActionResult = { error?: string; success?: string } | undefined;

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const userId = Number(formData.get("userId"));
  const pin = String(formData.get("pin") ?? "");
  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  if (!user || !verifyPin(pin, user.pinHash)) {
    return { error: "Wrong PIN — try again" };
  }
  await createSession(user.id);
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}

/** First-run setup: create the first parent account. Only works while no users exist. */
export async function setupFamily(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const existing = db.select({ id: schema.users.id }).from(schema.users).limit(1).get();
  if (existing) return { error: "Setup already completed" };
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const currency = String(formData.get("currency") ?? "USD")
    .trim()
    .toUpperCase();
  if (!name) return { error: "Name is required" };
  if (!/^\d{4,8}$/.test(pin)) return { error: "PIN must be 4-8 digits" };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Currency must be a 3-letter code like USD or ILS" };
  const user = db
    .insert(schema.users)
    .values({ name, role: "parent", pinHash: hashPin(pin), createdAt: Date.now() })
    .returning()
    .get();
  db.insert(schema.familySettings)
    .values({ id: 1, currency })
    .onConflictDoUpdate({ target: schema.familySettings.id, set: { currency } })
    .run();
  audit(user.id, "setup", "user", user.id, { name, currency });
  await createSession(user.id);
  redirect("/");
}
