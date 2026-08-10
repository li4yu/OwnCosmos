"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  THEME_OPTIONS,
  applyTheme,
  isThemeId,
  type ThemeId,
} from "@/lib/theme";

type AppearanceFormProps = {
  initialTheme: string | null | undefined;
};

export function AppearanceForm({ initialTheme }: AppearanceFormProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeId>(
    isThemeId(initialTheme) ? initialTheme : "night",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function selectTheme(next: ThemeId) {
    setTheme(next);
    applyTheme(next);
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const { error: updateError } = await authClient.updateUser({ theme: next });
      if (updateError) {
        setError(updateError.message || "主题保存失败");
        return;
      }
      setMessage("主题已保存");
      router.refresh();
    } catch {
      setError("主题保存失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--mist)]">
        登录后主题以账号设置为准。未登录访客仍可用页头临时切换（不入库）。
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_OPTIONS.map((opt) => {
          const active = theme === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={pending}
              onClick={() => selectTheme(opt.id)}
              className={`group flex flex-col gap-2 rounded-lg border p-2.5 text-left transition disabled:opacity-50 ${
                active
                  ? "border-[var(--amber)] bg-[var(--amber-soft)]"
                  : "border-[var(--line)] hover:border-[var(--amber)]"
              }`}
            >
              <span className="flex h-8 overflow-hidden rounded-md border border-[var(--line)]">
                {opt.swatches.map((c) => (
                  <span
                    key={c}
                    className="h-full flex-1"
                    style={{ background: c }}
                  />
                ))}
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <span
                  className={`text-sm tracking-[0.06em] ${
                    active ? "text-[var(--amber)]" : "text-[var(--paper)]"
                  }`}
                >
                  {opt.label}
                </span>
                {active ? (
                  <span className="font-mono text-xs tracking-[0.14em] text-[var(--teal)]">
                    ON
                  </span>
                ) : null}
              </span>
              <span className="text-xs text-[var(--mist)]">{opt.hint}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-[var(--teal)]">{message}</p>
      ) : null}
    </div>
  );
}
