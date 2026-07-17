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
  const styles = {
    primary: "btn btn-primary",
    danger: "btn btn-danger",
    subtle: "btn btn-subtle",
  }[variant];
  return (
    <button type="submit" disabled={pending} className={`${styles} ${className}`}>
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
      {state?.error && <p className="banner banner-bad mb-3">😬 {state.error}</p>}
      {state?.success && <p className="banner banner-good mb-3">🎉 {state.success}</p>}
      {children}
    </form>
  );
}
