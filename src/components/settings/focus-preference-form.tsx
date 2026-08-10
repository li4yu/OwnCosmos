"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const PRESETS = [
  { label: "25 分", ms: 25 * 60_000 },
  { label: "45 分", ms: 45 * 60_000 },
  { label: "60 分", ms: 60 * 60_000 },
] as const;

type FocusPreferenceFormProps = {
  initialFocusDnd: boolean;
  initialCountdownDefaultMs: number;
};

export function FocusPreferenceForm({
  initialFocusDnd,
  initialCountdownDefaultMs,
}: FocusPreferenceFormProps) {
  const router = useRouter();
  const [dnd, setDnd] = useState(initialFocusDnd);
  const [defaultMs, setDefaultMs] = useState(initialCountdownDefaultMs);
  const [pending, setPending] = useState<"dnd" | "ms" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function saveDnd(next: boolean) {
    setPending("dnd");
    setError(null);
    setMessage(null);
    const prev = dnd;
    setDnd(next);
    try {
      const { error: updateError } = await authClient.updateUser({
        focusDnd: next,
      });
      if (updateError) {
        setDnd(prev);
        setError(updateError.message || "保存失败");
        return;
      }
      setMessage("已保存");
      router.refresh();
    } catch {
      setDnd(prev);
      setError("保存失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  async function saveDefaultMs(ms: number) {
    setPending("ms");
    setError(null);
    setMessage(null);
    const prev = defaultMs;
    setDefaultMs(ms);
    try {
      const { error: updateError } = await authClient.updateUser({
        focusCountdownDefaultMs: ms,
      });
      if (updateError) {
        setDefaultMs(prev);
        setError(updateError.message || "保存失败");
        return;
      }
      setMessage("已保存");
      router.refresh();
    } catch {
      setDefaultMs(prev);
      setError("保存失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-5 text-[var(--mist)]">
        倒计时默认时长用于新开倒计时；勿扰开启后，专注中不弹桌面通知，倒计时到点仅暂停不弹窗打断。
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs text-[var(--paper)]">勿扰</p>
          <p className="text-[11px] text-[var(--mist)]">
            专注页弱化打断类提示
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={dnd}
          disabled={pending !== null}
          onClick={() => saveDnd(!dnd)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-40 ${
            dnd
              ? "border-[var(--teal)] bg-[var(--teal)]/30"
              : "border-[var(--line)] bg-[var(--ink)]/40"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--paper)] transition ${
              dnd ? "left-6" : "left-0.5"
            }`}
          />
        </button>
      </div>
      <div>
        <p className="text-xs text-[var(--paper)]">倒计时默认时长</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.ms}
              type="button"
              disabled={pending !== null}
              onClick={() => saveDefaultMs(p.ms)}
              className={`rounded-full border px-2.5 py-1 text-[11px] tracking-wide transition disabled:opacity-40 ${
                defaultMs === p.ms
                  ? "border-[var(--amber)] bg-[var(--amber)] text-[var(--on-amber)]"
                  : "border-[var(--line)] text-[var(--mist)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-[var(--teal)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
