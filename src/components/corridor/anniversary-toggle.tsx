"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AnniversaryToggleProps = {
  initialEnabled: boolean;
};

/** 往年今日开关（写入 user.anniversary_remind） */
export function AnniversaryToggle({ initialEnabled }: AnniversaryToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onToggle() {
    const next = !enabled;
    setPending(true);
    setError(null);
    try {
      const { error: updateError } = await authClient.updateUser({
        anniversaryRemind: next,
      });
      if (updateError) {
        setError(updateError.message || "保存失败");
        return;
      }
      setEnabled(next);
      router.refresh();
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--paper)]">往年今日</p>
          <p className="mt-0.5 text-xs text-[var(--mist)]">
            开启后，今时际会在往年同日有归档时给出轻提示（非桌面推送）。
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={pending}
          onClick={onToggle}
          className={`relative h-7 w-12 rounded-full border transition ${
            enabled
              ? "border-[var(--teal)] bg-[var(--teal)]/30"
              : "border-[var(--line)] bg-[var(--ink)]/40"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--paper)] transition ${
              enabled ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
