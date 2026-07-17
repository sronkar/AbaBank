"use client";

import { useActionState } from "react";
import { setupFamily } from "@/actions/auth";
import { SubmitButton } from "@/components/action-form";
import { inputClass, labelClass } from "@/components/ui";

export function SetupForm() {
  const [state, formAction] = useActionState(setupFamily, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-3 py-2 text-sm">
          {state.error}
        </p>
      )}
      <div>
        <label className={labelClass}>Your name</label>
        <input name="name" placeholder="Aba" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Choose a PIN (4-8 digits)</label>
        <input name="pin" type="password" inputMode="numeric" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Family currency (3-letter code)</label>
        <input name="currency" defaultValue="USD" className={inputClass} />
        <p className="text-xs text-slate-400 mt-1">
          e.g. USD or ILS. Stock prices are in USD and converted automatically.
        </p>
      </div>
      <SubmitButton className="w-full">Open the bank 🎉</SubmitButton>
    </form>
  );
}
