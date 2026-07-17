import Link from "next/link";
import { requireUser, type SessionUser } from "@/lib/auth";
import { checkingBalance, savingsBalance, pendingRequests, recentTransactions } from "@/lib/ledger";
import { portfolioView } from "@/lib/invest";
import { formatCents } from "@/lib/money";
import { getSettings, kidInterestPct } from "@/lib/settings";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { Card, StatCard, PageTitle } from "@/components/ui";
import { TxList } from "@/components/tx-list";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  return user.role === "parent" ? <ParentHome /> : <KidHome user={user} />;
}

async function KidHome({ user }: { user: SessionUser }) {
  const { currency } = getSettings();
  const checking = checkingBalance(user.id);
  const savings = savingsBalance(user.id);
  const { totalValue } = await portfolioView(user.id);
  const total = checking + savings + totalValue;
  return (
    <div>
      <PageTitle emoji="👋" title={`Hi ${user.name}!`} sub="Here's your money today." />
      <Card className="mb-4 !bg-[var(--sun)] relative overflow-hidden">
        <div className="absolute -right-4 -top-6 text-8xl opacity-20 rotate-12 select-none">💰</div>
        <div className="text-sm font-bold text-[#2b2e4a]/70 mb-1">Everything you have</div>
        <div className="text-4xl sm:text-5xl font-display font-semibold tabular-nums text-[#2b2e4a] break-words">
          {formatCents(total, currency)}
        </div>
      </Card>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard emoji="💵" label="Checking" value={formatCents(checking, currency)} accent="accent-sky" />
        <StatCard
          emoji="🏦"
          label="Savings"
          value={formatCents(savings, currency)}
          accent="accent-mint"
          sub={`earns ${kidInterestPct(user)}% every month`}
        />
        <StatCard
          emoji="📈"
          label="Investments"
          value={formatCents(totalValue, currency)}
          accent="accent-tangerine"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <QuickLink href="/money" emoji="💵" label="Deposit / Withdraw" accent="accent-sky" />
        <QuickLink href="/savings" emoji="🏦" label="Save it" accent="accent-mint" />
        <QuickLink href="/invest" emoji="📈" label="Invest it" accent="accent-tangerine" />
        <QuickLink href="/goals" emoji="🎯" label="My goals" accent="accent-bubblegum" />
      </div>
      <h2 className="text-xl font-semibold mb-2.5">Recent activity</h2>
      <TxList txs={recentTransactions(user.id, 10)} currency={currency} />
    </div>
  );
}

function QuickLink({
  href,
  emoji,
  label,
  accent,
}: {
  href: string;
  emoji: string;
  label: string;
  accent: string;
}) {
  return (
    <Link href={href} className={`card card-hover card-press text-center !p-4 ${accent}`}>
      <div className="emoji-badge mx-auto mb-2">{emoji}</div>
      <div className="text-sm font-bold">{label}</div>
    </Link>
  );
}

async function ParentHome() {
  const { currency } = getSettings();
  const kids = db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.role, "kid"), eq(schema.users.active, true)))
    .all();
  const pending = pendingRequests();
  const rows = await Promise.all(
    kids.map(async (kid) => {
      const { totalValue } = await portfolioView(kid.id);
      return {
        kid,
        checking: checkingBalance(kid.id),
        savings: savingsBalance(kid.id),
        invested: totalValue,
      };
    })
  );
  const totalOwed = rows.reduce((s, r) => s + r.checking + r.savings + r.invested, 0);
  return (
    <div>
      <PageTitle emoji="🧑‍💼" title="The Bank" sub="What the bank owes its customers." />
      {pending.length > 0 && (
        <Link href="/parent/approvals" className="card card-hover card-press block mb-4 !bg-[var(--tangerine)] font-bold">
          ⏳ {pending.length} request{pending.length > 1 ? "s" : ""} waiting for your approval →
        </Link>
      )}
      <Card className="mb-4 accent-lavender">
        <div className="text-sm font-bold text-muted">Total owed to the kids</div>
        <div className="text-4xl font-display font-semibold tabular-nums text-[var(--accent-deep)]">
          {formatCents(totalOwed, currency)}
        </div>
      </Card>
      <div className="space-y-4">
        {rows.map(({ kid, checking, savings, invested }) => (
          <Link key={kid.id} href={`/parent/kids/${kid.id}`} className="block">
            <Card className="card-hover card-press flex items-center gap-4 accent-sky">
              <div className="emoji-badge">🧒</div>
              <div className="flex-1">
                <div className="font-display font-semibold text-lg">{kid.name}</div>
                <div className="text-sm text-muted font-semibold">
                  💵 {formatCents(checking, currency)} · 🏦 {formatCents(savings, currency)} · 📈{" "}
                  {formatCents(invested, currency)}
                </div>
              </div>
              <div className="text-xl font-display font-semibold tabular-nums">
                {formatCents(checking + savings + invested, currency)}
              </div>
            </Card>
          </Link>
        ))}
        {kids.length === 0 && (
          <Card className="font-semibold">
            No customers yet!{" "}
            <Link className="text-[var(--sky-deep)] underline decoration-2" href="/parent/kids">
              Add your kids →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
