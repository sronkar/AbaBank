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
        <div className="text-5xl mb-2">🏛️</div>
        <h1 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
          Welcome to AbaBank
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Let&apos;s open the family bank. First, create the banker (that&apos;s you, the parent).
          You&apos;ll add the kids afterwards.
        </p>
      </div>
      <SetupForm />
    </div>
  );
}
