"use client";

import { useState } from "react";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { SubmitButton } from "@/components/action-form";
import { inputClass } from "@/components/ui";

type UserOption = { id: number; name: string; role: string };

export function LoginForm({ users }: { users: UserOption[] }) {
  const [selected, setSelected] = useState<UserOption | null>(users.length === 1 ? users[0] : null);
  const [state, formAction] = useActionState(login, undefined);

  if (!selected) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {users.map((u) => (
          <button
            key={u.id}
            onClick={() => setSelected(u)}
            className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm p-4 text-center hover:ring-indigo-400 transition"
          >
            <div className="text-3xl mb-1">{u.role === "parent" ? "🧑‍💼" : "🧒"}</div>
            <div className="font-semibold">{u.name}</div>
            <div className="text-xs text-slate-400">{u.role === "parent" ? "Banker" : "Customer"}</div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="userId" value={selected.id} />
      <div className="text-center">
        <div className="text-3xl">{selected.role === "parent" ? "🧑‍💼" : "🧒"}</div>
        <div className="font-semibold text-lg">{selected.name}</div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-xs text-indigo-500 hover:underline"
        >
          not you?
        </button>
      </div>
      {state?.error && (
        <p className="rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 px-3 py-2 text-sm text-center">
          {state.error}
        </p>
      )}
      <input
        type="password"
        inputMode="numeric"
        name="pin"
        placeholder="PIN"
        autoFocus
        className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
      />
      <SubmitButton className="w-full">Open my bank</SubmitButton>
    </form>
  );
}
