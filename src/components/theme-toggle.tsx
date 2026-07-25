"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { applyTheme, isThemeId, readStoredTheme, type ThemeId } from "@/lib/theme";

type ThemeToggleProps = {
  /** When set, toggle also persists to the user record. */
  persistToUser?: boolean;
};

export function ThemeToggle({ persistToUser = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeId>("night");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = readStoredTheme();
    applyTheme(next);
    setTheme(next);
    setReady(true);
  }, []);

  async function toggle() {
    const next: ThemeId = theme === "night" ? "khaki" : "night";
    applyTheme(next);
    setTheme(next);

    if (!persistToUser) return;
    setSaving(true);
    try {
      await authClient.updateUser({ theme: next });
    } catch {
      // Keep local theme; user can retry from settings.
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return (
      <button
        type="button"
        className="ui-btn-ghost ui-btn-sm opacity-60"
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
      disabled={saving}
      className="ui-btn-ghost bg-[var(--field-bg)] text-[var(--paper)]"
      aria-label={theme === "khaki" ? "切换到深空夜色" : "切换到时光卡其"}
    >
      {saving ? "同步中…" : theme === "khaki" ? "深空夜色" : "时光卡其"}
    </button>
  );
}

/** Apply DB theme for logged-in users (overrides localStorage once). */
export function ThemeSyncFromSession() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || !session?.user) return;
    const raw = (session.user as { theme?: string }).theme;
    if (isThemeId(raw)) {
      applyTheme(raw);
    }
  }, [isPending, session]);

  return null;
}
