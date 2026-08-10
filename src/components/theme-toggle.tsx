"use client";

import { useEffect, useState } from "react";
import { HoverTip } from "@/components/ui/hover-tip";
import { authClient } from "@/lib/auth-client";
import {
  applyTheme,
  isThemeId,
  nextTheme,
  readStoredTheme,
  themeLabel,
  type ThemeId,
} from "@/lib/theme";

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
    const next = nextTheme(theme);
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

  const upcoming = nextTheme(theme);
  const tip = `当前 ${themeLabel(theme)}，点击切换`;

  return (
    <HoverTip tip={tip} variant="hint" nestInControl className="inline-flex">
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        className="ui-btn-ghost bg-[var(--field-bg)] text-[var(--paper)]"
        aria-label={`切换到${themeLabel(upcoming)}`}
      >
        {saving ? "同步中…" : themeLabel(upcoming)}
      </button>
    </HoverTip>
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
