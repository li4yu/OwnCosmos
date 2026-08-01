"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type NotifyPreferenceFormProps = {
  initialNotifyEnabled: boolean;
  initialNotifyDueReminder: boolean;
  initialAnniversaryRemind: boolean;
};

type PrefKey =
  | "notifyEnabled"
  | "notifyDueReminder"
  | "anniversaryRemind";

/** 通知与同年回望偏好（仅存储；桌面推送后置） */
export function NotifyPreferenceForm({
  initialNotifyEnabled,
  initialNotifyDueReminder,
  initialAnniversaryRemind,
}: NotifyPreferenceFormProps) {
  const router = useRouter();
  const [notifyEnabled, setNotifyEnabled] = useState(initialNotifyEnabled);
  const [notifyDue, setNotifyDue] = useState(initialNotifyDueReminder);
  const [anniversary, setAnniversary] = useState(initialAnniversaryRemind);
  const [pending, setPending] = useState<PrefKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(key: PrefKey, value: boolean) {
    setPending(key);
    setError(null);
    setMessage(null);
    const prev = {
      notifyEnabled,
      notifyDueReminder: notifyDue,
      anniversaryRemind: anniversary,
    };
    if (key === "notifyEnabled") setNotifyEnabled(value);
    if (key === "notifyDueReminder") setNotifyDue(value);
    if (key === "anniversaryRemind") setAnniversary(value);

    try {
      const { error: updateError } = await authClient.updateUser({
        [key]: value,
      });
      if (updateError) {
        if (key === "notifyEnabled") setNotifyEnabled(prev.notifyEnabled);
        if (key === "notifyDueReminder") setNotifyDue(prev.notifyDueReminder);
        if (key === "anniversaryRemind") setAnniversary(prev.anniversaryRemind);
        setError(updateError.message || "保存失败");
        return;
      }
      setMessage("已保存");
      router.refresh();
    } catch {
      if (key === "notifyEnabled") setNotifyEnabled(prev.notifyEnabled);
      if (key === "notifyDueReminder") setNotifyDue(prev.notifyDueReminder);
      if (key === "anniversaryRemind") setAnniversary(prev.anniversaryRemind);
      setError("保存失败，请稍后重试");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-5 text-[var(--mist)]">
        偏好仅存账号；系统桌面通知尚未接入。今时际「同年回望」轻提示受下方开关控制。
      </p>
      <PrefRow
        label="启用通知偏好"
        tip="总开关，供后续推送使用"
        checked={notifyEnabled}
        disabled={pending !== null}
        onChange={(v) => save("notifyEnabled", v)}
      />
      <PrefRow
        label="临期提醒"
        tip="计划进入提醒窗口时的提醒偏好"
        checked={notifyDue}
        disabled={pending !== null || !notifyEnabled}
        onChange={(v) => save("notifyDueReminder", v)}
      />
      <PrefRow
        label="同年回望"
        tip="往年同日有归档时，在今时际显示轻提示"
        checked={anniversary}
        disabled={pending !== null}
        onChange={(v) => save("anniversaryRemind", v)}
      />
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

function PrefRow({
  label,
  tip,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  tip: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-xs text-[var(--paper)]">{label}</p>
        <p className="text-[11px] text-[var(--mist)]">{tip}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-40 ${
          checked
            ? "border-[var(--teal)] bg-[var(--teal)]/30"
            : "border-[var(--line)] bg-[var(--ink)]/40"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-[var(--paper)] transition ${
            checked ? "left-6" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
