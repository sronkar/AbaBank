import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect("/");
  const users = db
    .select({ id: schema.users.id, name: schema.users.name, role: schema.users.role })
    .from(schema.users)
    .orderBy(asc(schema.users.role), asc(schema.users.name))
    .all();
  if (users.length === 0) redirect("/setup");
  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">🏛️</div>
        <h1 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">AbaBank</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">The family bank</p>
      </div>
      <LoginForm users={users} />
    </div>
  );
}
