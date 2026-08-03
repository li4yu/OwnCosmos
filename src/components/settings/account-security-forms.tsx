"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("两次输入的新密码不一致");
      return;
    }
    setPending(true);
    setError(null);
    setOk(false);
    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (changeError) {
        setError(changeError.message || "修改失败，请检查当前密码");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setOk(true);
    } catch {
      setError("修改失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2.5">
      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        当前密码
        <input
          type="password"
          required
          minLength={8}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="auth-field"
          autoComplete="current-password"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        新密码（至少 8 位）
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="auth-field"
          autoComplete="new-password"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        确认新密码
        <input
          type="password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="auth-field"
          autoComplete="new-password"
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {ok ? (
        <p className="text-sm text-[var(--teal)]" role="status">
          密码已更新；其他设备上的登录已失效。
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="ui-btn-primary ui-btn-sm w-fit"
      >
        {pending ? "保存中…" : "更新密码"}
      </button>
    </form>
  );
}

export function DeleteAccountForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setPending(true);
    setError(null);
    try {
      const { error: deleteError } = await authClient.deleteUser({
        password,
      });
      if (deleteError) {
        setError(deleteError.message || "注销失败，请确认密码");
        setPending(false);
        setOpen(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("注销失败，请稍后重试");
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs leading-5 text-[var(--mist)]">
        注销后将永久删除账号与全部业务数据（随笔、计划、馆藏等），不可恢复。
      </p>
      <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
        输入当前密码以确认
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-field"
          autoComplete="current-password"
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!password.trim() || pending}
        className="ui-btn-danger ui-btn-sm w-fit"
        onClick={() => setOpen(true)}
      >
        注销账号
      </button>
      <ConfirmDialog
        open={open}
        title="确认注销账号？"
        message="将硬删本账号及全部关联数据，此操作不可恢复。确定继续吗？"
        confirmLabel="永久注销"
        cancelLabel="取消"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </div>
  );
}
