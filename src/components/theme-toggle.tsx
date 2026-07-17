"use client";

import { useSyncExternalStore } from "react";

const THEME_EVENT = "aba-theme-change";

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function getTheme() {
  return document.documentElement.dataset.theme ?? "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");

  function toggle() {
    const next = getTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("aba-theme", next);
    } catch {}
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light/dark mode"
      title="Light / dark"
      className="grid place-items-center w-9 h-9 rounded-full border-2 border-[var(--line)] bg-[var(--surface-2)] shadow-[2px_2px_0_var(--shadow)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition"
    >
      <span className="text-base leading-none">{theme === "dark" ? "🌙" : "🌞"}</span>
    </button>
  );
}
