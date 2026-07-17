import type { Tx } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { Card } from "./ui";

const KIND_META: Record<string, { emoji: string; label: string }> = {
  deposit: { emoji: "💰", label: "Deposit" },
  withdrawal: { emoji: "🛍️", label: "Withdrawal" },
  allowance: { emoji: "🗓️", label: "Allowance" },
  interest: { emoji: "✨", label: "Interest" },
  savings_in: { emoji: "🏦", label: "To savings" },
  savings_out: { emoji: "🔓", label: "From savings" },
  buy: { emoji: "📈", label: "Bought stock" },
  sell: { emoji: "📉", label: "Sold stock" },
  adjustment: { emoji: "🛠️", label: "Correction" },
};

function txSign(tx: Tx): string {
  if (tx.kind === "interest") return "+";
  return tx.checkingDelta >= 0 ? "+" : "−";
}

export function TxList({
  txs,
  currency,
  showName,
}: {
  txs: (Tx & { userName?: string })[];
  currency: string;
  showName?: boolean;
}) {
  if (txs.length === 0) {
    return <Card className="text-slate-400 text-sm">Nothing here yet.</Card>;
  }
  return (
    <div className="space-y-2">
      {txs.map((tx) => {
        const meta = KIND_META[tx.kind] ?? { emoji: "❓", label: tx.kind };
        const negative = txSign(tx) === "−";
        return (
          <Card key={tx.id} className="flex items-center gap-3 !p-3">
            <div className="text-xl">{meta.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {showName && tx.userName ? `${tx.userName}: ` : ""}
                {tx.description}
              </div>
              <div className="text-xs text-slate-400">
                {meta.label} · {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {tx.status === "pending" && " · ⏳ waiting for approval"}
                {tx.status === "rejected" && " · ❌ rejected"}
              </div>
            </div>
            <div
              className={`font-bold tabular-nums ${
                tx.status !== "approved"
                  ? "text-slate-400 line-through decoration-transparent"
                  : negative
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              } ${tx.status === "rejected" ? "!line-through !decoration-current" : ""}`}
            >
              {txSign(tx)}
              {formatCents(tx.amount, currency)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
