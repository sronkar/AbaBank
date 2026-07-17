"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { parseAmount, formatCents, formatShares } from "@/lib/money";
import { requestTransaction } from "@/lib/ledger";
import { moveToSavings, withdrawFromLot } from "@/lib/savings";
import { buyStock, sellStock } from "@/lib/invest";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";

export type FormResult = { error?: string; success?: string } | undefined;

function getAmount(formData: FormData): number | null {
  return parseAmount(String(formData.get("amount") ?? ""));
}

export async function requestMoney(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const kind = formData.get("kind") === "withdrawal" ? "withdrawal" : "deposit";
  const amount = getAmount(formData);
  const description = String(formData.get("description") ?? "").trim();
  if (!amount) return { error: "Enter a valid amount" };
  if (description.length < 3) {
    return {
      error:
        kind === "deposit"
          ? "Tell us where the money came from"
          : "Tell us what the money is for",
    };
  }
  await requestTransaction(user.id, user.name, kind, amount, description);
  revalidatePath("/");
  return { success: "Request sent! A parent will approve it soon." };
}

export async function depositToSavings(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const amount = getAmount(formData);
  if (!amount) return { error: "Enter a valid amount" };
  const result = moveToSavings(user, amount);
  if (!result.ok) return { error: result.error };
  revalidatePath("/savings");
  return { success: "Moved to savings!" };
}

export async function withdrawSavings(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const lotId = Number(formData.get("lotId"));
  const amount = getAmount(formData);
  if (!amount || !lotId) return { error: "Enter a valid amount" };
  const result = withdrawFromLot(user.id, lotId, amount);
  if (!result.ok) return { error: result.error };
  revalidatePath("/savings");
  return {
    success: result.early
      ? "Withdrawn early — that money misses this month's interest payday."
      : "Withdrawn to checking!",
  };
}

export async function buy(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const ticker = String(formData.get("ticker") ?? "").trim();
  const amount = getAmount(formData);
  if (!ticker) return { error: "Enter a ticker symbol, like AAPL or DIS" };
  if (!amount) return { error: "Enter a valid amount" };
  const result = await buyStock(user.id, ticker, amount);
  if (!result.ok) return { error: result.error };
  revalidatePath("/invest");
  return {
    success: `Bought ${formatShares(result.shares)} shares of ${ticker.toUpperCase()}!`,
  };
}

export async function sell(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const ticker = String(formData.get("ticker") ?? "").trim();
  const sellAll = formData.get("sellAll") === "true";
  const amount = sellAll ? undefined : getAmount(formData) ?? undefined;
  if (!sellAll && !amount) return { error: "Enter a valid amount (or sell all)" };
  const result = await sellStock(user.id, ticker, { amount, sellAll });
  if (!result.ok) return { error: result.error };
  const { currency } = getSettings();
  const profitWord = result.profit >= 0 ? "profit" : "loss";
  revalidatePath("/invest");
  return {
    success: `Sold for ${formatCents(result.proceeds, currency)} — ${profitWord} of ${formatCents(
      Math.abs(result.profit),
      currency
    )}.`,
  };
}

export async function createGoal(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const targetCents = parseAmount(String(formData.get("target") ?? ""));
  if (!name) return { error: "Give your goal a name" };
  if (!targetCents) return { error: "Enter a valid target amount" };
  const goal = db
    .insert(schema.goals)
    .values({ userId: user.id, name, target: targetCents, createdAt: Date.now() })
    .returning()
    .get();
  audit(user.id, "goal_create", "goal", goal.id, { name, target: targetCents });
  revalidatePath("/goals");
  return { success: "Goal created — go get it!" };
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const goalId = Number(formData.get("goalId"));
  db.delete(schema.goals)
    .where(and(eq(schema.goals.id, goalId), eq(schema.goals.userId, user.id)))
    .run();
  audit(user.id, "goal_delete", "goal", goalId);
  revalidatePath("/goals");
}
