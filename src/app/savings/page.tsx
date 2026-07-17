import { requireUser } from "@/lib/auth";
import { checkingBalance } from "@/lib/ledger";
import { openLots, isMature } from "@/lib/savings";
import { formatCents } from "@/lib/money";
import { getSettings, kidInterestPct, kidLockDays } from "@/lib/settings";
import { depositToSavings, withdrawSavings } from "@/actions/kid";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, inputClass, labelClass } from "@/components/ui";

export const dynamic = "force-dynamic";

function loadSavingsData(user: Awaited<ReturnType<typeof requireUser>>) {
  const lots = openLots(user.id);
  return {
    lots,
    total: lots.reduce((s, l) => s + l.remaining, 0),
    checking: checkingBalance(user.id),
    rate: kidInterestPct(user),
    lockDays: kidLockDays(user),
    now: Date.now(),
  };
}

export default async function SavingsPage() {
  const user = await requireUser();
  const { currency } = getSettings();
  const { lots, total, checking, rate, lockDays, now } = loadSavingsData(user);
  return (
    <div>
      <PageTitle
        emoji="🏦"
        title="Savings"
        sub={`Money here earns ${rate}% interest every month. New deposits are locked for ${lockDays} days — take money out early and it misses the next interest payday.`}
      />
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="text-sm text-slate-500 dark:text-slate-400">Total saved</div>
          <div className="text-3xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCents(total, currency)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Next payday earns about {formatCents(Math.round((total * rate) / 100), currency)} ✨
          </div>
        </Card>
        <Card>
          <h2 className="font-bold mb-3">Add to savings</h2>
          <ActionForm action={depositToSavings} className="space-y-3">
            <div>
              <label className={labelClass}>
                Amount (you have {formatCents(checking, currency)} in checking)
              </label>
              <input name="amount" inputMode="decimal" placeholder="5.00" className={inputClass} />
            </div>
            <SubmitButton className="w-full">Lock it in 🔒</SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <h2 className="font-bold mb-2">Your savings lots</h2>
      <div className="space-y-2">
        {lots.length === 0 && (
          <Card className="text-slate-400 text-sm">
            Nothing saved yet — move some money in and watch it grow!
          </Card>
        )}
        {lots.map((lot) => {
          const mature = isMature(lot, now);
          const daysLeft = Math.ceil((lot.maturesAt - now) / (24 * 60 * 60 * 1000));
          return (
            <Card key={lot.id} className="!p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xl">{lot.source === "interest" ? "✨" : mature ? "🔓" : "🔒"}</div>
                <div className="flex-1 min-w-40">
                  <div className="font-semibold tabular-nums">
                    {formatCents(lot.remaining, currency)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {lot.source === "interest" ? "Interest earned" : "Saved"} on{" "}
                    {new Date(lot.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {" · "}
                    {mature ? "unlocked" : `unlocks in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                  </div>
                </div>
                <ActionForm action={withdrawSavings} className="flex items-start gap-2">
                  <input type="hidden" name="lotId" value={lot.id} />
                  <input
                    name="amount"
                    inputMode="decimal"
                    placeholder="Amount"
                    className={`${inputClass} !w-28 !py-1.5 text-sm`}
                  />
                  <SubmitButton variant={mature ? "subtle" : "danger"} className="!py-1.5 text-sm">
                    {mature ? "Withdraw" : "Break early"}
                  </SubmitButton>
                </ActionForm>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
