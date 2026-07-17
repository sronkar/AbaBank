import type { Tx } from "@/lib/ledger";
import { formatCents } from "@/lib/money";
import { Card } from "./ui";

const KIND_META: Record<string, { emoji: string; label: string; accent: string }> = {
  deposit: { emoji: "💰", label: "Deposit", accent: "accent-mint" },
  withdrawal: { emoji: "🛍️", label: "Withdrawal", accent: "accent-bubblegum" },
  allowance: { emoji: "🗓️", label: "Allowance", accent: "accent-mint" },
  interest: { emoji: "✨", label: "Interest", accent: "accent-tangerine" },
  savings_in: { emoji: "🏦", label: "To savings", accent: "accent-sky" },
  savings_out: { emoji: "🔓", label: "From savings", accent: "accent-sky" },
  buy: { emoji: "📈", label: "Bought stock", accent: "accent-tangerine" },
  sell: { emoji: "📉", label: "Sold stock", accent: "accent-tangerine" },
  adjustment: { emoji: "🛠️", label: "Correction", accent: "accent-lavender" },
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
    return <Card className="text-muted text-sm font-semibold">Nothing here yet.</Card>;
  }
  return (
    <div className="space-y-2.5">
      {txs.map((tx) => {
        const meta = KIND_META[tx.kind] ?? { emoji: "❓", label: tx.kind, accent: "" };
        const negative = txSign(tx) === "−";
        return (
          <Card key={tx.id} className={`flex items-center gap-3 !p-3 ${meta.accent}`}>
            <div className="emoji-badge !w-10 !h-10 !text-lg">{meta.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">
                {showName && tx.userName ? `${tx.userName}: ` : ""}
                {tx.description}
              </div>
              <div className="text-xs text-muted font-semibold">
                {meta.label} ·{" "}
                {new Date(tx.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {tx.status === "pending" && " · ⏳ waiting for approval"}
                {tx.status === "rejected" && " · ❌ rejected"}
              </div>
            </div>
            <div
              className={`font-display font-semibold tabular-nums ${
                tx.status === "pending"
                  ? "text-muted"
                  : tx.status === "rejected"
                  ? "text-muted line-through"
                  : negative
                  ? "text-[var(--neg)]"
                  : "text-[var(--pos)]"
              }`}
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
