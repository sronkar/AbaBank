"use client";

import { useActionState } from "react";
import { enterGate } from "@/actions/auth";
import { SubmitButton } from "@/components/action-form";
import { PinInput } from "@/components/pin-input";

export function GateForm() {
  const [state, formAction] = useActionState(enterGate, undefined);
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="banner banner-bad text-center">😬 {state.error}</p>}
      <PinInput name="passphrase" placeholder="Family password" numeric={false} autoFocus />
      <SubmitButton className="w-full">Unlock 🔓</SubmitButton>
    </form>
  );
}
