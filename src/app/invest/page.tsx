import { requireUser } from "@/lib/auth";
import { checkingBalance } from "@/lib/ledger";
import { portfolioView } from "@/lib/invest";
import { formatCents, formatShares } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { buy, sell } from "@/actions/kid";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Card, PageTitle, Field, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function InvestPage() {
  const user = await requireUser();
  const { currency } = getSettings();
  const checking = checkingBalance(user.id);
  const { positions, totalValue } = await portfolioView(user.id);
  return (
    <div>
      <PageTitle
        emoji="📈"
        title="Invest"
        sub="Buy pieces of real companies with your checking money. Prices update once a day after the market closes."
      />
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="text-sm font-bold text-muted">Portfolio value</div>
          <div className="text-3xl font-display font-semibold tabular-nums text-[var(--tangerine-deep)]">
            {formatCents(totalValue, currency)}
          </div>
          <div className="text-xs text-muted font-semibold mt-1">
            {formatCents(checking, currency)} in checking, ready to invest
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold mb-3">Buy a stock</h2>
          <ActionForm action={buy} className="space-y-3">
            <div className="flex gap-2">
              <Field label="Ticker" className="flex-1">
                <input name="ticker" placeholder="AAPL" className={`${inputClass} uppercase`} />
              </Field>
              <Field label="Amount" className="flex-1">
                <input name="amount" inputMode="decimal" placeholder="10.00" className={inputClass} />
              </Field>
            </div>
            <SubmitButton className="w-full">Buy 🛒</SubmitButton>
            <p className="text-xs text-muted font-semibold">
              Try AAPL (Apple), DIS (Disney), RBLX (Roblox), NKE (Nike)…
            </p>
          </ActionForm>
        </Card>
      </div>
      <h2 className="text-xl font-semibold mb-2.5">Your companies</h2>
      <div className="space-y-2">
        {positions.length === 0 && (
          <Card className="text-muted text-sm font-semibold">
            You don&apos;t own any stocks yet. Buy your first piece of a company above!
          </Card>
        )}
        {positions.map((p) => (
          <Card key={p.id} className="!p-4 accent-tangerine">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-44">
                <div className="font-display font-semibold">{p.ticker}</div>
                <div className="text-xs text-muted font-semibold">
                  {formatShares(p.shares)} shares · avg cost{" "}
                  {formatCents(Math.round(p.avgCostCents), currency)}/share
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums">
                  {p.value !== null ? formatCents(p.value, currency) : "price unavailable"}
                </div>
                {p.unrealized !== null && (
                  <div
                    className={`text-xs font-semibold tabular-nums ${
                      p.unrealized >= 0
                        ? "text-[var(--pos)]"
                        : "text-[var(--neg)]"
                    }`}
                  >
                    {p.unrealized >= 0 ? "▲ +" : "▼ −"}
                    {formatCents(Math.abs(p.unrealized), currency)}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 w-full sm:w-auto">
                <ActionForm action={sell} className="flex items-start gap-2">
                  <input type="hidden" name="ticker" value={p.ticker} />
                  <input
                    name="amount"
                    inputMode="decimal"
                    placeholder="Amount"
                    aria-label={`Amount of ${p.ticker} to sell`}
                    className={`${inputClass} !w-28 !py-1.5 text-sm`}
                  />
                  <SubmitButton variant="subtle" className="!py-1.5 text-sm">
                    Sell
                  </SubmitButton>
                </ActionForm>
                <ActionForm action={sell}>
                  <input type="hidden" name="ticker" value={p.ticker} />
                  <input type="hidden" name="sellAll" value="true" />
                  <ConfirmSubmit confirmLabel="Sell it all" className="!py-1.5 text-sm">
                    Sell all
                  </ConfirmSubmit>
                </ActionForm>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
