"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import type { FormResult } from "@/actions/kid";

export function SubmitButton({
  children,
  className = "",
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "danger" | "subtle";
}) {
  const { pending } = useFormStatus();
  const base =
    "rounded-xl px-4 py-2 font-semibold transition disabled:opacity-50 disabled:cursor-wait";
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
    subtle:
      "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700",
  }[variant];
  return (
    <button type="submit" disabled={pending} className={`${base} ${styles} ${className}`}>
      {pending ? "Working…" : children}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  className = "",
}: {
  action: (prev: FormResult, formData: FormData) => Promise<FormResult>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {state?.error && (
        <p className="mb-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-3 py-2 text-sm">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-3 py-2 text-sm">
          {state.success}
        </p>
      )}
      {children}
    </form>
  );
}
