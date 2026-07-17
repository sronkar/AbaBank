"use client";

import { useActionState } from "react";
import { setupFamily } from "@/actions/auth";
import { SubmitButton } from "@/components/action-form";
import { PinInput } from "@/components/pin-input";
import { CURRENCY_LIST } from "@/lib/money";
import { Field } from "@/components/ui";

export function SetupForm() {
  const [state, formAction] = useActionState(setupFamily, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="banner banner-bad">😬 {state.error}</p>}
      <Field label="Your name">
        <input name="name" placeholder="Aba" className="input" />
      </Field>
      <PinInput name="pin" label="Choose a PIN (6-10 digits)" />
      <PinInput
        name="passphrase"
        label="Family password (shared by everyone on their devices)"
        numeric={false}
        placeholder="e.g. cohen-family-2026"
      />
      <Field label="Family currency">
        <select name="currency" defaultValue="USD" className="input">
          {CURRENCY_LIST.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted font-semibold mt-1">
          Stock prices are in USD and converted automatically.
        </p>
      </Field>
      <SubmitButton className="w-full">Open the bank 🎉</SubmitButton>
    </form>
  );
}
