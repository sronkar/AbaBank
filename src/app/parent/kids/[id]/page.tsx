import { notFound } from "next/navigation";
import { requireParent } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { checkingBalance, savingsBalance, recentTransactions } from "@/lib/ledger";
import { portfolioView } from "@/lib/invest";
import { formatCents } from "@/lib/money";
import { getSettings, kidInterestPct, kidLockDays } from "@/lib/settings";
import { adjust, stopAllowance, updateKidSettings, upsertAllowance } from "@/actions/parent";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, StatCard, inputClass, labelClass } from "@/components/ui";
import { TxList } from "@/components/tx-list";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function KidDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireParent();
  const { id } = await params;
  const kid = db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, Number(id)), eq(schema.users.role, "kid")))
    .get();
  if (!kid) notFound();
  const { currency, interestPctMonthly: famInterest, lockDays: famLock } = getSettings();
  const checking = checkingBalance(kid.id);
  const savings = savingsBalance(kid.id);
  const { totalValue } = await portfolioView(kid.id);
  const allowance = db
    .select()
    .from(schema.allowances)
    .where(eq(schema.allowances.userId, kid.id))
    .get();
  return (
    <div>
      <PageTitle emoji="🧒" title={kid.name} sub="Manage this customer's account." />
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <StatCard emoji="💵" label="Checking" value={formatCents(checking, currency)} accent="accent-sky" />
        <StatCard
          emoji="🏦"
          label="Savings"
          value={formatCents(savings, currency)}
          accent="accent-mint"
          sub={`${kidInterestPct(kid)}%/mo · ${kidLockDays(kid)}-day lock`}
        />
        <StatCard
          emoji="📈"
          label="Investments"
          value={formatCents(totalValue, currency)}
          accent="accent-tangerine"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <h2 className="text-lg font-semibold mb-3">🗓️ Allowance</h2>
          {allowance?.active && (
            <p className="text-sm font-bold text-muted mb-3">
              Currently: {formatCents(allowance.amount, currency)}{" "}
              {allowance.cadence === "weekly"
                ? `every ${WEEKDAYS[allowance.day]}`
                : `on day ${allowance.day} of each month`}
            </p>
          )}
          <ActionForm action={upsertAllowance} className="space-y-3">
            <input type="hidden" name="kidId" value={kid.id} />
            <div className="flex gap-2 flex-wrap">
              <div className="w-28">
                <label className={labelClass}>Amount</label>
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={allowance ? (allowance.amount / 100).toFixed(2) : ""}
                  className={inputClass}
                />
              </div>
              <div className="w-32">
                <label className={labelClass}>Repeats</label>
                <select name="cadence" defaultValue={allowance?.cadence ?? "weekly"} className={inputClass}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="w-36">
                <label className={labelClass}>Day (weekday 0-6 or 1-28)</label>
                <input name="day" inputMode="numeric" defaultValue={allowance?.day ?? 5} className={inputClass} />
              </div>
            </div>
            <div className="flex gap-2">
              <SubmitButton>Save allowance</SubmitButton>
            </div>
          </ActionForm>
          {allowance?.active && (
            <form action={stopAllowance} className="mt-2">
              <input type="hidden" name="kidId" value={kid.id} />
              <button className="text-sm font-bold text-[var(--neg)] hover:underline decoration-2">
                Stop allowance
              </button>
            </form>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-3">⚙️ Account settings</h2>
          <ActionForm action={updateKidSettings} className="space-y-3">
            <input type="hidden" name="kidId" value={kid.id} />
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-28">
                <label className={labelClass}>Interest %/month (blank = family default {famInterest}%)</label>
                <input
                  name="interestPctMonthly"
                  inputMode="decimal"
                  defaultValue={kid.interestPctMonthly ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="flex-1 min-w-28">
                <label className={labelClass}>Savings lock days (blank = family default {famLock})</label>
                <input
                  name="lockDays"
                  inputMode="numeric"
                  defaultValue={kid.lockDays ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Reset PIN (leave blank to keep)</label>
              <input name="pin" inputMode="numeric" className={inputClass} />
            </div>
            <SubmitButton>Save settings</SubmitButton>
          </ActionForm>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="text-lg font-semibold mb-1">🛠️ Correction</h2>
        <p className="text-sm font-bold text-muted mb-3">
          Fix mistakes with a signed adjustment. It shows in {kid.name}&apos;s history and the audit log.
        </p>
        <ActionForm action={adjust} className="space-y-3">
          <input type="hidden" name="kidId" value={kid.id} />
          <div className="flex gap-2 flex-wrap">
            <div className="w-32">
              <label className={labelClass}>Direction</label>
              <select name="direction" className={inputClass}>
                <option value="add">Add money</option>
                <option value="remove">Remove money</option>
              </select>
            </div>
            <div className="w-28">
              <label className={labelClass}>Amount</label>
              <input name="amount" inputMode="decimal" className={inputClass} />
            </div>
            <div className="flex-1 min-w-40">
              <label className={labelClass}>Reason (required)</label>
              <input name="reason" placeholder="Approved $50 instead of $5" className={inputClass} />
            </div>
          </div>
          <SubmitButton variant="danger">Apply correction</SubmitButton>
        </ActionForm>
      </Card>

      <h2 className="text-xl font-semibold mb-2.5">Recent activity</h2>
      <TxList txs={recentTransactions(kid.id, 25)} currency={currency} />
    </div>
  );
}
