import { notFound } from "next/navigation";
import { requireParent } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { checkingBalance, savingsBalance, recentTransactions } from "@/lib/ledger";
import { portfolioView } from "@/lib/invest";
import { formatCents } from "@/lib/money";
import { getSettings, kidInterestPct, kidLockDays } from "@/lib/settings";
import {
  adjust,
  deactivateKid,
  stopAllowance,
  updateKidSettings,
  upsertAllowance,
} from "@/actions/parent";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, StatCard, Field, inputClass } from "@/components/ui";
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
              <Field label="Amount" className="w-28">
                <input
                  name="amount"
                  inputMode="decimal"
                  defaultValue={allowance ? (allowance.amount / 100).toFixed(2) : ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Repeats" className="w-32">
                <select name="cadence" defaultValue={allowance?.cadence ?? "weekly"} className={inputClass}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>
              <Field label="Day (weekday 0-6 or 1-28)" className="w-36">
                <input name="day" inputMode="numeric" defaultValue={allowance?.day ?? 5} className={inputClass} />
              </Field>
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
              <Field label={<>Interest %/month (blank = family default {famInterest}%)</>} className="flex-1 min-w-28">
                <input
                  name="interestPctMonthly"
                  inputMode="decimal"
                  defaultValue={kid.interestPctMonthly ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label={<>Savings lock days (blank = family default {famLock})</>} className="flex-1 min-w-28">
                <input
                  name="lockDays"
                  inputMode="numeric"
                  defaultValue={kid.lockDays ?? ""}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Reset PIN (leave blank to keep)">
              <input name="pin" inputMode="numeric" className={inputClass} />
            </Field>
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
            <Field label="Direction" className="w-32">
                <select name="direction" className={inputClass}>
                <option value="add">Add money</option>
                <option value="remove">Remove money</option>
              </select>
              </Field>
            <Field label="Amount" className="w-28">
                <input name="amount" inputMode="decimal" className={inputClass} />
              </Field>
            <Field label="Reason (required)" className="flex-1 min-w-40">
                <input name="reason" placeholder="Approved $50 instead of $5" className={inputClass} />
              </Field>
          </div>
          <SubmitButton variant="danger">Apply correction</SubmitButton>
        </ActionForm>
      </Card>

      <h2 className="text-xl font-semibold mb-2.5">Recent activity</h2>
      <TxList txs={recentTransactions(kid.id, 25)} currency={currency} />

      <Card className="mt-6 accent-bubblegum">
        <h2 className="text-lg font-semibold mb-1">🗑️ Remove account</h2>
        <p className="text-sm font-bold text-muted mb-3">
          Hides {kid.name} from the login screen. Their history stays in the records; nothing is
          deleted.
        </p>
        <form action={deactivateKid}>
          <input type="hidden" name="kidId" value={kid.id} />
          <ConfirmSubmit confirmLabel={`Remove ${kid.name}`}>Remove {kid.name}</ConfirmSubmit>
        </form>
      </Card>
    </div>
  );
}
