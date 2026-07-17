"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { hashPin, requireParent } from "@/lib/auth";
import { adjustBalance, decideTransaction } from "@/lib/ledger";
import { parseAmount } from "@/lib/money";
import { audit } from "@/lib/audit";
import { isoDate } from "@/lib/dates";
import type { FormResult } from "./kid";

export async function decide(formData: FormData): Promise<void> {
  const parent = await requireParent();
  const txId = Number(formData.get("txId"));
  const decision = formData.get("decision") === "approved" ? "approved" : "rejected";
  decideTransaction(txId, parent.id, decision);
  revalidatePath("/parent/approvals");
  revalidatePath("/");
}

export async function addFamilyMember(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const parent = await requireParent();
  const name = String(formData.get("name") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const role = formData.get("role") === "parent" ? "parent" : "kid";
  if (!name) return { error: "Name is required" };
  if (!/^\d{4,8}$/.test(pin)) return { error: "PIN must be 4-8 digits" };
  const exists = db.select().from(schema.users).where(eq(schema.users.name, name)).get();
  if (exists) return { error: "That name is already taken" };
  const user = db
    .insert(schema.users)
    .values({ name, role, pinHash: hashPin(pin), createdAt: Date.now() })
    .returning()
    .get();
  audit(parent.id, "user_create", "user", user.id, { name, role });
  revalidatePath("/parent/kids");
  return { success: `${name} added!` };
}

export async function updateKidSettings(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const parent = await requireParent();
  const kidId = Number(formData.get("kidId"));
  const interestRaw = String(formData.get("interestPctMonthly") ?? "").trim();
  const lockRaw = String(formData.get("lockDays") ?? "").trim();
  const pinRaw = String(formData.get("pin") ?? "").trim();

  const updates: Partial<typeof schema.users.$inferInsert> = {};
  if (interestRaw !== "") {
    const pct = parseFloat(interestRaw);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { error: "Interest must be 0-100%" };
    updates.interestPctMonthly = pct;
  } else {
    updates.interestPctMonthly = null;
  }
  if (lockRaw !== "") {
    const days = parseInt(lockRaw, 10);
    if (!Number.isFinite(days) || days < 0 || days > 365) return { error: "Lock must be 0-365 days" };
    updates.lockDays = days;
  } else {
    updates.lockDays = null;
  }
  if (pinRaw !== "") {
    if (!/^\d{4,8}$/.test(pinRaw)) return { error: "PIN must be 4-8 digits" };
    updates.pinHash = hashPin(pinRaw);
  }
  db.update(schema.users).set(updates).where(eq(schema.users.id, kidId)).run();
  audit(parent.id, "kid_settings", "user", kidId, {
    interestPctMonthly: updates.interestPctMonthly,
    lockDays: updates.lockDays,
    pinChanged: pinRaw !== "",
  });
  revalidatePath(`/parent/kids/${kidId}`);
  return { success: "Settings saved" };
}

export async function upsertAllowance(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const parent = await requireParent();
  const kidId = Number(formData.get("kidId"));
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  const cadence = formData.get("cadence") === "monthly" ? "monthly" : "weekly";
  const day = Number(formData.get("day"));
  if (!amount) return { error: "Enter a valid allowance amount" };
  if (cadence === "weekly" && (day < 0 || day > 6)) return { error: "Pick a weekday" };
  if (cadence === "monthly" && (day < 1 || day > 28)) return { error: "Day of month must be 1-28" };

  const existing = db
    .select()
    .from(schema.allowances)
    .where(eq(schema.allowances.userId, kidId))
    .get();
  // Start paying from the NEXT due date, not back-paying history.
  const today = isoDate(new Date());
  if (existing) {
    db.update(schema.allowances)
      .set({ amount, cadence, day, active: true })
      .where(eq(schema.allowances.id, existing.id))
      .run();
  } else {
    db.insert(schema.allowances)
      .values({ userId: kidId, amount, cadence, day, active: true, lastPaidDue: today })
      .run();
  }
  audit(parent.id, "allowance_set", "user", kidId, { amount, cadence, day });
  revalidatePath(`/parent/kids/${kidId}`);
  return { success: "Allowance saved" };
}

export async function stopAllowance(formData: FormData): Promise<void> {
  const parent = await requireParent();
  const kidId = Number(formData.get("kidId"));
  db.update(schema.allowances)
    .set({ active: false })
    .where(eq(schema.allowances.userId, kidId))
    .run();
  audit(parent.id, "allowance_stop", "user", kidId);
  revalidatePath(`/parent/kids/${kidId}`);
}

export async function adjust(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const parent = await requireParent();
  const kidId = Number(formData.get("kidId"));
  const amount = parseAmount(String(formData.get("amount") ?? ""));
  const direction = formData.get("direction") === "remove" ? -1 : 1;
  const reason = String(formData.get("reason") ?? "").trim();
  if (!amount) return { error: "Enter a valid amount" };
  if (reason.length < 3) return { error: "A reason is required — it goes in the audit log" };
  adjustBalance(parent.id, kidId, amount * direction, reason);
  revalidatePath(`/parent/kids/${kidId}`);
  return { success: "Adjustment recorded" };
}

export async function updateFamilySettings(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const parent = await requireParent();
  const interest = parseFloat(String(formData.get("interestPctMonthly") ?? ""));
  const lockDays = parseInt(String(formData.get("lockDays") ?? ""), 10);
  const ntfyTopic = String(formData.get("ntfyTopic") ?? "").trim() || null;
  if (!Number.isFinite(interest) || interest < 0 || interest > 100) {
    return { error: "Interest must be 0-100%" };
  }
  if (!Number.isFinite(lockDays) || lockDays < 0 || lockDays > 365) {
    return { error: "Lock must be 0-365 days" };
  }
  db.update(schema.familySettings)
    .set({ interestPctMonthly: interest, lockDays, ntfyTopic })
    .where(eq(schema.familySettings.id, 1))
    .run();
  audit(parent.id, "family_settings", "family_settings", 1, { interest, lockDays, ntfyTopic });
  revalidatePath("/parent/settings");
  return { success: "Settings saved" };
}
