import { requireUser } from "@/lib/auth";
import { checkingBalance, recentTransactions } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { requestMoney } from "@/actions/kid";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, PageTitle, Field, inputClass } from "@/components/ui";
import { TxList } from "@/components/tx-list";

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const user = await requireUser();
  const { currency } = getSettings();
  const balance = checkingBalance(user.id);
  return (
    <div>
      <PageTitle
        emoji="💵"
        title="Deposit & Withdraw"
        sub={`Checking balance: ${formatCents(balance, currency)}. Requests go to a parent for approval — that's when the real cash changes hands.`}
      />
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card className="accent-mint">
          <h2 className="text-lg font-semibold mb-3">💰 Put money in</h2>
          <ActionForm action={requestMoney} className="space-y-3">
            <input type="hidden" name="kind" value="deposit" />
            <Field label="How much?">
              <input name="amount" inputMode="decimal" placeholder="10.00" className={inputClass} />
            </Field>
            <Field label="Where did it come from?">
              <input
                name="description"
                placeholder="Birthday money from Grandma"
                className={inputClass}
              />
            </Field>
            <SubmitButton className="w-full">Request deposit</SubmitButton>
          </ActionForm>
        </Card>
        <Card className="accent-bubblegum">
          <h2 className="text-lg font-semibold mb-3">🛍️ Take money out</h2>
          <ActionForm action={requestMoney} className="space-y-3">
            <input type="hidden" name="kind" value="withdrawal" />
            <Field label="How much?">
              <input name="amount" inputMode="decimal" placeholder="10.00" className={inputClass} />
            </Field>
            <Field label="What&apos;s it for?">
              <input name="description" placeholder="LEGO set at the mall" className={inputClass} />
            </Field>
            <SubmitButton className="w-full" variant="danger">
              Request withdrawal
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>
      <h2 className="text-xl font-semibold mb-2.5">History</h2>
      <TxList txs={recentTransactions(user.id, 50)} currency={currency} />
    </div>
  );
}
