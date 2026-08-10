"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { PasswordField } from "@/components/auth/password-field";
import { authErrorMessage } from "@/lib/auth-errors";

type Mode = "otp-login" | "reset";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("otp-login");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  function switchMode(next: Mode) {
    setMode(next);
    setOtp("");
    setPassword("");
    setConfirm("");
    setCodeSent(false);
    setError(null);
    setHint(null);
    setCooldown(0);
  }

  async function sendOtp() {
    const trimmed = email.trim();
    if (!trimmed) {
      setError("请填写注册邮箱");
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (mode === "otp-login") {
        const { error: sendError } =
          await authClient.emailOtp.sendVerificationOtp({
            email: trimmed,
            type: "sign-in",
          });
        if (sendError) {
          setError(authErrorMessage(sendError, "发送失败，请稍后重试"));
          return;
        }
      } else {
        const { error: sendError } =
          await authClient.emailOtp.requestPasswordReset({
            email: trimmed,
          });
        if (sendError) {
          setError(authErrorMessage(sendError, "发送失败，请稍后重试"));
          return;
        }
      }
      setCodeSent(true);
      setCooldown(60);
      setHint("验证码已发送（6 位数字，约 5 分钟有效）。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请检查网络或稍后重试");
    } finally {
      setPending(false);
    }
  }

  async function onLoginWithOtp(e: FormEvent) {
    e.preventDefault();
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位数字验证码");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: signInError } = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp: code,
      });
      if (signInError) {
        setError(authErrorMessage(signInError, "验证码错误或已过期"));
        return;
      }
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "登录失败，请稍后重试",
      );
    } finally {
      setPending(false);
    }
  }

  async function onReset(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位数字验证码");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: resetError } = await authClient.emailOtp.resetPassword({
        email: email.trim(),
        otp: code,
        password,
      });
      if (resetError) {
        setError(authErrorMessage(resetError, "重置失败，请检查验证码"));
        return;
      }
      router.push("/?auth=login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "重置失败，请稍后重试",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-[var(--teal)]">
            ACCOUNT
          </p>
          <h1 className="mt-1 text-xl tracking-[0.14em] text-[var(--paper)]">
            {mode === "otp-login" ? "验证码登录" : "重置密码"}
          </h1>
        </div>
        <ThemeToggle />
      </div>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => switchMode("otp-login")}
          className={
            mode === "otp-login"
              ? "text-[var(--amber)] underline-offset-4 underline"
              : "text-[var(--mist)] hover:text-[var(--paper)]"
          }
        >
          验证码登录
        </button>
        <span className="text-[var(--line)]">|</span>
        <button
          type="button"
          onClick={() => switchMode("reset")}
          className={
            mode === "reset"
              ? "text-[var(--amber)] underline-offset-4 underline"
              : "text-[var(--mist)] hover:text-[var(--paper)]"
          }
        >
          重置密码
        </button>
      </div>

      <form
        onSubmit={mode === "otp-login" ? onLoginWithOtp : onReset}
        className="flex flex-col gap-3.5"
      >
        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          注册邮箱
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-field min-w-0 flex-1"
              autoComplete="email"
              disabled={pending}
            />
            <button
              type="button"
              disabled={pending || cooldown > 0}
              onClick={() => void sendOtp()}
              className="ui-btn-ghost ui-btn-sm shrink-0 whitespace-nowrap"
            >
              {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
            </button>
          </div>
        </label>

        {codeSent || otp ? (
          <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
            验证码（6 位）
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="auth-field tracking-[0.3em]"
              placeholder="123456"
              required
            />
          </label>
        ) : null}

        {mode === "reset" && (codeSent || otp) ? (
          <>
            <PasswordField
              label="新密码（至少 8 位）"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={pending}
            />
            <PasswordField
              label="确认新密码"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={pending}
            />
          </>
        ) : null}

        {hint ? (
          <p className="text-sm text-[var(--teal)]" role="status">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending || !codeSent}
          className="auth-submit mt-1"
        >
          {pending
            ? "处理中…"
            : mode === "otp-login"
              ? "验证并登录"
              : "验证并保存新密码"}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--mist)]">
        <Link href="/?auth=login" className="text-[var(--amber)] hover:underline">
          返回密码登录
        </Link>
      </p>
    </div>
  );
}
