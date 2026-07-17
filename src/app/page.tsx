import Link from "next/link";
import { requireUser, type SessionUser } from "@/lib/auth";
import { checkingBalance, savingsBalance, pendingRequests, recentTransactions } from "@/lib/ledger";
import { portfolioView } from "@/lib/invest";
import { formatCents } from "@/lib/money";
import { getSettings, kidInterestPct } from "@/lib/settings";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
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
      <Card className="mb-4 bg-gradient-to-r from-indigo-600 to-violet-600 !ring-0 text-white">
        <div className="text-sm/none opacity-80 mb-1">Everything you have</div>
        <div className="text-4xl font-black tabular-nums">{formatCents(total, currency)}</div>
      </Card>
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <StatCard emoji="💵" label="Checking" value={formatCents(checking, currency)} />
        <StatCard
          emoji="🏦"
          label="Savings"
          value={formatCents(savings, currency)}
          accent="text-emerald-600 dark:text-emerald-400"
          sub={`earns ${kidInterestPct(user)}% every month`}
        />
        <StatCard
          emoji="📈"
          label="Investments"
          value={formatCents(totalValue, currency)}
          accent="text-amber-600 dark:text-amber-400"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <QuickLink href="/money" emoji="💵" label="Deposit / Withdraw" />
        <QuickLink href="/savings" emoji="🏦" label="Save it" />
        <QuickLink href="/invest" emoji="📈" label="Invest it" />
        <QuickLink href="/goals" emoji="🎯" label="My goals" />
      </div>
      <h2 className="font-bold mb-2">Recent activity</h2>
      <TxList txs={recentTransactions(user.id, 10)} currency={currency} />
    </div>
  );
}

function QuickLink({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 text-center hover:ring-indigo-400 transition"
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-sm font-medium">{label}</div>
    </Link>
  );
}

async function ParentHome() {
  const { currency } = getSettings();
  const kids = db.select().from(schema.users).where(eq(schema.users.role, "kid")).all();
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
        <Link
          href="/parent/approvals"
          className="block mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-300 dark:ring-amber-800 p-4 font-medium text-amber-800 dark:text-amber-200"
        >
          ⏳ {pending.length} request{pending.length > 1 ? "s" : ""} waiting for your approval →
        </Link>
      )}
      <Card className="mb-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">Total owed to the kids</div>
        <div className="text-3xl font-black tabular-nums">{formatCents(totalOwed, currency)}</div>
      </Card>
      <div className="space-y-3">
        {rows.map(({ kid, checking, savings, invested }) => (
          <Link key={kid.id} href={`/parent/kids/${kid.id}`} className="block">
            <Card className="flex items-center gap-4 hover:ring-indigo-400 transition">
              <div className="text-3xl">🧒</div>
              <div className="flex-1">
                <div className="font-bold">{kid.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  💵 {formatCents(checking, currency)} · 🏦 {formatCents(savings, currency)} · 📈{" "}
                  {formatCents(invested, currency)}
                </div>
              </div>
              <div className="text-xl font-bold tabular-nums">
                {formatCents(checking + savings + invested, currency)}
              </div>
            </Card>
          </Link>
        ))}
        {kids.length === 0 && (
          <Card>
            No customers yet!{" "}
            <Link className="text-indigo-500 hover:underline" href="/parent/kids">
              Add your kids →
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
