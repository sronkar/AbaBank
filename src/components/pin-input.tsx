"use client";

import { useId, useState } from "react";

export function PinInput({
  name,
  placeholder = "PIN",
  numeric = true,
  autoFocus = false,
  big = false,
  defaultValue,
  label,
}: {
  name: string;
  placeholder?: string;
  numeric?: boolean;
  autoFocus?: boolean;
  big?: boolean;
  defaultValue?: string;
  label?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          inputMode={numeric ? "numeric" : "text"}
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`input !pr-11 ${big ? "text-center !text-2xl tracking-[0.4em]" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide" : "Show"}
          title={show ? "Hide" : "Show"}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-lg hover:bg-[var(--surface-2)] transition"
        >
          <span className="text-base leading-none">{show ? "🙈" : "👁️"}</span>
        </button>
      </div>
    </div>
  );
}
