import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  emoji,
  accent = "text-indigo-600 dark:text-indigo-400",
  sub,
}: {
  label: string;
  value: string;
  emoji: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className="text-3xl">{emoji}</div>
      <div className="min-w-0">
        <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
        <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
        {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
      </div>
    </Card>
  );
}

export function PageTitle({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <span>{emoji}</span>
        {title}
      </h1>
      {sub && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500";

export const labelClass = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";
