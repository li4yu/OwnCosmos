"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  DEFAULT_ESSAY_IDLE_HOURS,
  ESSAY_IDLE_HOURS_MAX,
  ESSAY_IDLE_HOURS_MIN,
} from "@/lib/archive-constants";

type ArchivePreferenceFormProps = {
  initialIdleHours?: number | null;
};

export function ArchivePreferenceForm({
  initialIdleHours,
}: ArchivePreferenceFormProps) {
  const router = useRouter();
  const [hours, setHours] = useState(
    String(initialIdleHours ?? DEFAULT_ESSAY_IDLE_HOURS),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const n = Number.parseInt(hours, 10);
    if (
      !Number.isFinite(n) ||
      n < ESSAY_IDLE_HOURS_MIN ||
      n > ESSAY_IDLE_HOURS_MAX
    ) {
      setError(
        `请输入 ${ESSAY_IDLE_HOURS_MIN}–${ESSAY_IDLE_HOURS_MAX} 之间的整数小时`,
      );
      return;
    }
    setPending(true);
    try {
      const { error: updateError } = await authClient.updateUser({
        essayIdleHours: n,
      });
      if (updateError) {
        setError(updateError.message || "保存失败");
        return;
      }
      setMessage(`已保存：超过 ${n} 小时未编辑将自动归档`);
      router.refresh();
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm leading-6 text-[var(--mist)]">
        流思笺在设定小时数内若无任何编辑，进站时会自动沉淀入昔时往「随笔沉淀」。默认{" "}
        {DEFAULT_ESSAY_IDLE_HOURS} 小时。
      </p>
      <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
        自动归档（小时）
        <input
          type="number"
          min={ESSAY_IDLE_HOURS_MIN}
          max={ESSAY_IDLE_HOURS_MAX}
          step={1}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="auth-field max-w-[12rem]"
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-[var(--teal)]" role="status">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="ui-btn-primary !w-auto px-5">
        {pending ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
