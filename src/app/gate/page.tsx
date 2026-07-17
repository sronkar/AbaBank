import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { currentUser, isGateOpen } from "@/lib/auth";
import { GateForm } from "./gate-form";

export const dynamic = "force-dynamic";

export default async function GatePage() {
  const user = await currentUser();
  if (user) redirect("/");
  const anyUser = db.select({ id: schema.users.id }).from(schema.users).limit(1).get();
  if (!anyUser) redirect("/setup");
  if (await isGateOpen()) redirect("/login");
  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3 inline-block -rotate-6">🔐</div>
        <h1 className="text-4xl font-semibold">
          Aba<span className="text-[var(--tangerine-deep)]">Bank</span>
        </h1>
        <p className="text-muted font-bold mt-1">Enter the family password to continue</p>
      </div>
      <GateForm />
    </div>
  );
}
