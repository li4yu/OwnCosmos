"use client";

import { useEffect, useState } from "react";

export type ThemeId = "night" | "khaki";

const STORAGE_KEY = "owncosmos-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("night");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const next = stored === "khaki" ? "khaki" : "night";
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
    setReady(true);
  }, []);

  function toggle() {
    const next: ThemeId = theme === "night" ? "khaki" : "night";
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }

  if (!ready) {
    return (
      <button
        type="button"
        className="rounded border border-[var(--line)] px-3 py-1.5 font-mono text-xs tracking-widest text-[var(--mist)]"
        disabled
      >
        …
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded border border-[var(--line)] bg-[var(--ink)]/40 px-3 py-1.5 font-mono text-xs tracking-widest text-[var(--paper)] transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
      aria-label={theme === "khaki" ? "切换到深空夜色" : "切换到时光卡其"}
    >
      {theme === "khaki" ? "深空夜色" : "时光卡其"}
    </button>
  );
}
