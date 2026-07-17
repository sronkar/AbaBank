import Link from "next/link";
import { requireParent } from "@/lib/auth";
import { db, schema } from "@/db";
import { asc, eq } from "drizzle-orm";
import { addFamilyMember } from "@/actions/parent";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, Field } from "@/components/ui";
import { PinInput } from "@/components/pin-input";

export const dynamic = "force-dynamic";

export default async function KidsPage() {
  await requireParent();
  const users = db
    .select()
    .from(schema.users)
    .where(eq(schema.users.active, true))
    .orderBy(asc(schema.users.createdAt))
    .all();
  return (
    <div>
      <PageTitle emoji="👧" title="Family members" sub="Your customers (and fellow bankers)." />
      <div className="space-y-2 mb-6">
        {users.map((u) => (
          <Card
            key={u.id}
            className={`flex items-center gap-3 !p-4 ${
              u.role === "parent" ? "accent-lavender" : "accent-sky"
            }`}
          >
            <div className="emoji-badge">{u.role === "parent" ? "🧑‍💼" : "🧒"}</div>
            <div className="flex-1">
              <div className="font-display font-semibold">{u.name}</div>
              <div className="text-xs text-muted font-semibold">
                {u.role === "parent" ? "Banker (parent)" : "Customer (kid)"}
              </div>
            </div>
            {u.role === "kid" && (
              <Link
                href={`/parent/kids/${u.id}`}
                className="text-sm text-[var(--sky-deep)] font-bold underline decoration-2"
              >
                Manage →
              </Link>
            )}
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="text-lg font-semibold mb-3">Add a family member</h2>
        <ActionForm action={addFamilyMember} className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <Field label="Name" className="flex-1 min-w-32">
              <input name="name" className="input" />
            </Field>
            <div className="w-36">
              <PinInput name="pin" label="PIN (6-10 digits)" />
            </div>
            <Field label="Role" className="w-32">
              <select name="role" className="input">
                <option value="kid">Kid</option>
                <option value="parent">Parent</option>
              </select>
            </Field>
          </div>
          <SubmitButton>Add</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
