"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { applyTheme, isThemeId, type ThemeId } from "@/lib/theme";

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
    <div className="flex max-w-md flex-col gap-1.5">
      <p className="text-xs text-[var(--mist)]">
        登录后主题以账号设置为准。未登录访客仍可用页头临时切换（不入库）。
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            { id: "night", label: "深空夜色" },
            { id: "khaki", label: "时光卡其" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={pending}
            onClick={() => selectTheme(opt.id)}
            className={`rounded-md border px-3 py-2 text-sm tracking-[0.08em] transition disabled:opacity-50 ${
              theme === opt.id
                ? "border-[var(--amber)] bg-[var(--amber)] text-[var(--on-amber)]"
                : "border-[var(--line)] text-[var(--mist)] hover:border-[var(--amber)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-xs text-[#b54a4a]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-[var(--teal)]">{message}</p>
      ) : null}
    </div>
  );
}
