"use client";

import { useState } from "react";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { SubmitButton } from "@/components/action-form";

type UserOption = { id: number; name: string; role: string };

export function LoginForm({ users }: { users: UserOption[] }) {
  const [selected, setSelected] = useState<UserOption | null>(users.length === 1 ? users[0] : null);
  const [state, formAction] = useActionState(login, undefined);

  if (!selected) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelected(u)}
            className={`card card-hover card-press text-center !p-4 ${
              u.role === "parent" ? "accent-lavender" : "accent-sky"
            }`}
          >
            <div className="emoji-badge mx-auto mb-2">{u.role === "parent" ? "🧑‍💼" : "🧒"}</div>
            <div className="font-display font-semibold">{u.name}</div>
            <div className="text-xs text-muted font-bold">
              {u.role === "parent" ? "Banker" : "Customer"}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="userId" value={selected.id} />
      <div className="text-center">
        <div
          className={`emoji-badge mx-auto mb-1 ${
            selected.role === "parent" ? "accent-lavender" : "accent-sky"
          }`}
        >
          {selected.role === "parent" ? "🧑‍💼" : "🧒"}
        </div>
        <div className="font-display font-semibold text-lg">{selected.name}</div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-xs font-bold text-[var(--sky-deep)] underline decoration-2"
        >
          not you?
        </button>
      </div>
      {state?.error && <p className="banner banner-bad text-center">😬 {state.error}</p>}
      <input
        type="password"
        inputMode="numeric"
        name="pin"
        placeholder="PIN"
        autoFocus
        className="input text-center !text-2xl tracking-[0.5em]"
      />
      <SubmitButton className="w-full">Open my bank 🔑</SubmitButton>
    </form>
  );
}
