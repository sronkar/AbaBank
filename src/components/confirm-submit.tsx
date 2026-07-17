"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * A submit button that asks "Sure?" inline on first click, then submits on
 * confirm — no native dialog, keeps the playful look, and prevents accidental
 * one-tap irreversible actions (sell all, break early).
 */
export function ConfirmSubmit({
  children,
  confirmLabel = "Yes, do it",
  variant = "danger",
  className = "",
}: {
  children: React.ReactNode;
  confirmLabel?: string;
  variant?: "primary" | "danger" | "subtle";
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  const style = { primary: "btn-primary", danger: "btn-danger", subtle: "btn-subtle" }[variant];

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`btn ${style} ${className}`}
        disabled={pending}
      >
        {children}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <button type="submit" disabled={pending} className={`btn btn-danger ${className}`}>
        {pending ? "Working…" : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        disabled={pending}
        className={`btn btn-subtle ${className}`}
      >
        Cancel
      </button>
    </span>
  );
}
