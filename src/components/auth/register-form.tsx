"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PasswordField } from "@/components/auth/password-field";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import {
  authErrorMessage,
  isAlreadyRegisteredError,
} from "@/lib/auth-errors";

function emailLocalPart(email: string) {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "自宇旅人";
}

export type RegisterFormProps = {
  nextPath?: string;
  onSwitchLogin?: () => void;
};

export function RegisterForm({
  nextPath = "/app",
  onSwitchLogin,
}: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [accountReady, setAccountReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successName, setSuccessName] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  function validatePasswords() {
    if (password.length < 8) {
      return "请设置至少 8 位密码";
    }
    if (password !== confirmPassword) {
      return "两次输入的密码不一致";
    }
    return null;
  }

  function resolvedDisplayName(trimmedEmail: string) {
    return name.trim() || emailLocalPart(trimmedEmail);
  }

  async function ensureAccount() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { error: "请先填写邮箱" };
    }
    const passwordError = validatePasswords();
    if (passwordError) {
      return { error: passwordError };
    }
    if (accountReady) return { ok: true as const };

    const displayName = resolvedDisplayName(trimmedEmail);
    const { error: signUpError } = await authClient.signUp.email({
      email: trimmedEmail,
      password,
      name: displayName,
      theme: "night",
      essayIdleHours: 48,
      anniversaryRemind: false,
      notifyEnabled: true,
      notifyDueReminder: true,
      focusDnd: false,
      focusCountdownDefaultMs: 1_500_000,
    });

    if (signUpError) {
      if (!isAlreadyRegisteredError(signUpError)) {
        return {
          error: authErrorMessage(signUpError, "注册失败，请稍后重试"),
        };
      }

      // 422 邮箱已存在：用本次填写的密码尝试登录（未验证账号可继续发码）
      const { error: signInError } = await authClient.signIn.email({
        email: trimmedEmail,
        password,
      });
      if (signInError) {
        return {
          error:
            "该邮箱已注册。请改用登录，或通过「忘记密码 / 验证码登录」进入。",
        };
      }

      // 同步昵称（老账号可能为空或旧名）
      await authClient.updateUser({ name: displayName });
      setAccountReady(true);
      setHint("该邮箱已有账号，已为你登录；若尚未验证邮箱，请继续收验证码。");
      return { ok: true as const, already: true as const };
    }

    setAccountReady(true);
    return { ok: true as const, justCreated: true as const };
  }

  async function sendCode() {
    setPending(true);
    setError(null);
    setHint(null);
    try {
      const ensured = await ensureAccount();
      if ("error" in ensured && ensured.error) {
        setError(ensured.error);
        return;
      }
      const { error: sendError } =
        await authClient.emailOtp.sendVerificationOtp({
          email: email.trim(),
          type: "email-verification",
        });
      if (sendError) {
        setError(authErrorMessage(sendError, "发送失败，请稍后重试"));
        return;
      }
      setCooldown(60);
      setHint("验证码已发送到邮箱（6 位数字，约 5 分钟有效）。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请检查网络或稍后重试");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("请输入邮件中的 6 位数字验证码");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const ensured = await ensureAccount();
      if ("error" in ensured && ensured.error) {
        setError(ensured.error);
        return;
      }
      const displayName = resolvedDisplayName(email.trim());
      await authClient.updateUser({ name: displayName });

      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: email.trim(),
        otp: code,
      });
      if (verifyError) {
        setError(authErrorMessage(verifyError, "验证码错误或已过期"));
        return;
      }
      setSuccessName(displayName);
      setSuccessOpen(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "注册失败，请检查网络或稍后重试",
      );
    } finally {
      setPending(false);
    }
  }

  function enterApp() {
    setSuccessOpen(false);
    const dest = nextPath.startsWith("/") ? nextPath : "/app";
    router.push(dest);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-3.5">
        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          昵称（可选）
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="留空则用邮箱前缀"
            className="auth-field"
            autoComplete="nickname"
            disabled={accountReady || pending}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          邮箱
          <div className="flex gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-field min-w-0 flex-1"
              autoComplete="email"
              disabled={accountReady || pending}
            />
            <button
              type="button"
              disabled={pending || cooldown > 0}
              onClick={() => void sendCode()}
              className="ui-btn-ghost ui-btn-sm shrink-0 whitespace-nowrap"
            >
              {cooldown > 0 ? `${cooldown}s` : "发送验证码"}
            </button>
          </div>
        </label>
        <PasswordField
          label="密码（至少 8 位）"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          minLength={8}
          disabled={accountReady || pending}
        />
        <PasswordField
          label="确认密码"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          required
          minLength={8}
          disabled={accountReady || pending}
        />
        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          邮箱验证码（6 位）
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
        {hint ? (
          <p className="text-sm text-[var(--teal)]" role="status">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
            {error.includes("已注册") && onSwitchLogin ? (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onSwitchLogin}
                  className="underline underline-offset-4"
                >
                  去登录
                </button>
              </>
            ) : null}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className="auth-submit mt-1">
          {pending ? "处理中…" : "验证并注册"}
        </button>
        {onSwitchLogin ? (
          <p className="text-center text-sm text-[var(--mist)]">
            已有账号？{" "}
            <button
              type="button"
              onClick={onSwitchLogin}
              className="text-[var(--amber)] underline-offset-4 hover:underline"
            >
              去登录
            </button>
          </p>
        ) : null}
      </form>

      <NoticeDialog
        open={successOpen}
        title="注册成功"
        message={`欢迎，${successName}。邮箱已验证，可以进入你的自宇了。`}
        confirmLabel="进入自宇"
        onClose={enterApp}
      />
    </>
  );
}
