import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  emoji,
  accent = "accent-sky",
  sub,
}: {
  label: string;
  value: string;
  emoji: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <Card className={`flex items-center gap-4 ${accent}`}>
      <div className="emoji-badge">{emoji}</div>
      <div className="min-w-0">
        <div className="text-sm font-bold text-muted">{label}</div>
        <div className="text-2xl font-display font-semibold tabular-nums text-[var(--accent-deep)]">
          {value}
        </div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
    </Card>
  );
}

export function PageTitle({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-3xl font-semibold flex items-center gap-2.5">
        <span className="inline-block -rotate-6">{emoji}</span>
        {title}
      </h1>
      {sub && <p className="text-sm text-muted font-semibold mt-1.5">{sub}</p>}
    </div>
  );
}

export const inputClass = "input";

export const labelClass = "label";
