import { requireParent } from "@/lib/auth";
import { pendingRequests } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { decide } from "@/actions/parent";
import { Card, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  await requireParent();
  const { currency } = getSettings();
  const pending = pendingRequests();
  return (
    <div>
      <PageTitle
        emoji="✅"
        title="Approvals"
        sub="Approving is the moment real cash changes hands — hand it over (or take it) as you tap."
      />
      <div className="space-y-3">
        {pending.length === 0 && (
          <Card className="text-slate-400 text-sm">All caught up — no pending requests. 🎉</Card>
        )}
        {pending.map((tx) => (
          <Card key={tx.id}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-2xl">{tx.kind === "deposit" ? "💰" : "🛍️"}</div>
              <div className="flex-1 min-w-48">
                <div className="font-bold">
                  {tx.userName} wants to {tx.kind === "deposit" ? "deposit" : "withdraw"}{" "}
                  <span className="tabular-nums">{formatCents(tx.amount, currency)}</span>
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  “{tx.description}” ·{" "}
                  {new Date(tx.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                <form action={decide}>
                  <input type="hidden" name="txId" value={tx.id} />
                  <input type="hidden" name="decision" value="approved" />
                  <button className="rounded-xl px-4 py-2 font-semibold bg-emerald-600 text-white hover:bg-emerald-500">
                    Approve
                  </button>
                </form>
                <form action={decide}>
                  <input type="hidden" name="txId" value={tx.id} />
                  <input type="hidden" name="decision" value="rejected" />
                  <button className="rounded-xl px-4 py-2 font-semibold bg-rose-600 text-white hover:bg-rose-500">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
