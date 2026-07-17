import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

export type FamilySettings = typeof schema.familySettings.$inferSelect;

export function getSettings(): FamilySettings {
  const row = db.select().from(schema.familySettings).where(eq(schema.familySettings.id, 1)).get();
  if (row) return row;
  db.insert(schema.familySettings).values({ id: 1 }).onConflictDoNothing().run();
  return db.select().from(schema.familySettings).where(eq(schema.familySettings.id, 1)).get()!;
}

export function kidInterestPct(user: { interestPctMonthly: number | null }): number {
  return user.interestPctMonthly ?? getSettings().interestPctMonthly;
}

export function kidLockDays(user: { lockDays: number | null }): number {
  return user.lockDays ?? getSettings().lockDays;
}
