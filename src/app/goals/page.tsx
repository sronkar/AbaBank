import { requireUser } from "@/lib/auth";
import { checkingBalance, savingsBalance } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { createGoal, deleteGoal } from "@/actions/kid";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, inputClass, labelClass } from "@/components/ui";

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
        <h2 className="font-bold mb-3">New goal</h2>
        <ActionForm action={createGoal} className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-40">
              <label className={labelClass}>What do you want?</label>
              <input name="name" placeholder="Nintendo Switch game" className={inputClass} />
            </div>
            <div className="w-32">
              <label className={labelClass}>It costs</label>
              <input name="target" inputMode="decimal" placeholder="60.00" className={inputClass} />
            </div>
          </div>
          <SubmitButton>Set my goal</SubmitButton>
        </ActionForm>
      </Card>
      <div className="space-y-3">
        {goals.length === 0 && (
          <Card className="text-slate-400 text-sm">No goals yet — dream big!</Card>
        )}
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((saved / goal.target) * 100));
          const done = saved >= goal.target;
          return (
            <Card key={goal.id}>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">{done ? "🎉" : "🎯"}</div>
                <div className="flex-1">
                  <div className="font-bold">{goal.name}</div>
                  <div className="text-xs text-slate-400">
                    {formatCents(Math.min(saved, goal.target), currency)} of{" "}
                    {formatCents(goal.target, currency)}
                    {done && " — you can afford it!"}
                  </div>
                </div>
                <form action={deleteGoal}>
                  <input type="hidden" name="goalId" value={goal.id} />
                  <button className="text-xs text-slate-400 hover:text-rose-500">remove</button>
                </form>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${done ? "bg-emerald-500" : "bg-indigo-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
