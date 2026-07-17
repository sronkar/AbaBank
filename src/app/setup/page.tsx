import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  const existing = db.select({ id: schema.users.id }).from(schema.users).limit(1).get();
  if (existing) redirect("/login");
  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="text-center mb-8">
        <div className="text-6xl mb-3 inline-block -rotate-6">🏛️</div>
        <h1 className="text-4xl font-semibold">
          Welcome to Aba<span className="text-[var(--tangerine-deep)]">Bank</span>
        </h1>
        <p className="text-muted font-semibold mt-2">
          Let&apos;s open the family bank. First, create the banker (that&apos;s you, the parent).
          You&apos;ll add the kids afterwards.
        </p>
      </div>
      <SetupForm />
    </div>
  );
}
