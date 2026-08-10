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

/** 通知与往年今日偏好；开启总开关时申请浏览器通知权限 */
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
  const [permHint, setPermHint] = useState<string | null>(null);

  async function ensurePermission() {
    if (typeof Notification === "undefined") {
      setPermHint("当前环境不支持浏览器桌面通知");
      return false;
    }
    if (Notification.permission === "granted") {
      setPermHint(null);
      return true;
    }
    if (Notification.permission === "denied") {
      setPermHint("浏览器已拒绝通知，请在站点权限中重新允许");
      return false;
    }
    const result = await Notification.requestPermission();
    if (result !== "granted") {
      setPermHint("未授予通知权限，偏好已保存，但暂不会弹出系统通知");
      return false;
    }
    setPermHint(null);
    return true;
  }

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
      if (
        value &&
        (key === "notifyEnabled" ||
          key === "notifyDueReminder" ||
          key === "anniversaryRemind")
      ) {
        await ensurePermission();
      }
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
        开启后，在支持的浏览器中可弹出系统通知（临期 / 往年今日）。今时际页内轻提示仍受「往年今日」开关控制。
      </p>
      <PrefRow
        label="启用桌面通知"
        tip="总开关；首次开启会申请浏览器权限"
        checked={notifyEnabled}
        disabled={pending !== null}
        onChange={(v) => save("notifyEnabled", v)}
      />
      <PrefRow
        label="临期提醒"
        tip="有临期提醒时弹出桌面通知（同会话每日至多一次）"
        checked={notifyDue}
        disabled={pending !== null || !notifyEnabled}
        onChange={(v) => save("notifyDueReminder", v)}
      />
      <PrefRow
        label="往年今日"
        tip="往年同日有归档时：今时际轻提示 + 可选桌面通知"
        checked={anniversary}
        disabled={pending !== null}
        onChange={(v) => save("anniversaryRemind", v)}
      />
      {permHint ? (
        <p className="text-[13px] text-[var(--amber)]" role="status">
          {permHint}
        </p>
      ) : null}
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
        <p className="text-[13px] text-[var(--mist)]">{tip}</p>
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
