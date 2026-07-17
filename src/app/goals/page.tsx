import { requireUser } from "@/lib/auth";
import { checkingBalance, savingsBalance } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { createGoal, deleteGoal } from "@/actions/kid";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, Field, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireUser();
  const { currency } = getSettings();
  const saved = checkingBalance(user.id) + savingsBalance(user.id);
  const goals = db
    .select()
    .from(schema.goals)
    .where(eq(schema.goals.userId, user.id))
    .orderBy(desc(schema.goals.createdAt))
    .all();
  return (
    <div>
      <PageTitle
        emoji="🎯"
        title="Goals"
        sub={`You have ${formatCents(saved, currency)} saved up (checking + savings). What are you saving for?`}
      />
      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-3">New goal</h2>
        <ActionForm action={createGoal} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Field label="What do you want?" className="flex-1 min-w-40">
              <input name="name" placeholder="Nintendo Switch game" className={inputClass} />
            </Field>
            <Field label="It costs" className="w-32">
              <input name="target" inputMode="decimal" placeholder="60.00" className={inputClass} />
            </Field>
          </div>
          <SubmitButton>Set my goal</SubmitButton>
        </ActionForm>
      </Card>
      <div className="space-y-3">
        {goals.length === 0 && (
          <Card className="text-muted text-sm font-semibold">No goals yet — dream big!</Card>
        )}
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((saved / goal.target) * 100));
          const done = saved >= goal.target;
          return (
            <Card key={goal.id} className={done ? "accent-mint" : "accent-bubblegum"}>
              <div className="flex items-center gap-3 mb-2.5">
                <div className="emoji-badge">{done ? "🎉" : "🎯"}</div>
                <div className="flex-1">
                  <div className="font-display font-semibold">{goal.name}</div>
                  <div className="text-xs text-muted font-semibold">
                    {formatCents(Math.min(saved, goal.target), currency)} of{" "}
                    {formatCents(goal.target, currency)}
                    {done && " — you can afford it!"}
                  </div>
                </div>
                <form action={deleteGoal}>
                  <input type="hidden" name="goalId" value={goal.id} />
                  <button className="text-xs text-muted font-semibold hover:text-[var(--neg)]">
                    remove
                  </button>
                </form>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
