import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { and, asc, eq } from "drizzle-orm";
import { currentUser, isGateOpen } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/");
  const anyUser = db.select({ id: schema.users.id }).from(schema.users).limit(1).get();
  if (!anyUser) redirect("/setup");
  // Don't reveal who's in the family until the shared password is entered.
  if (!(await isGateOpen())) redirect("/gate");
  const users = db
    .select({ id: schema.users.id, name: schema.users.name, role: schema.users.role })
    .from(schema.users)
    .where(and(eq(schema.users.active, true)))
    .orderBy(asc(schema.users.role), asc(schema.users.name))
    .all();
  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3 inline-block -rotate-6">🏛️</div>
        <h1 className="text-4xl font-semibold">
          Aba<span className="text-[var(--tangerine-deep)]">Bank</span>
        </h1>
        <p className="text-muted font-bold mt-1">The family bank</p>
      </div>
      <LoginForm users={users} />
    </div>
  );
}
