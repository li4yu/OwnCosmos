"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { LogoutButton } from "@/components/auth/logout-button";

type VerifyEmailPanelProps = {
  email: string;
};

export function VerifyEmailPanel({ email }: VerifyEmailPanelProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  async function sendCode(auto = false) {
    setPending(true);
    setError(null);
    if (!auto) setMessage(null);
    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (sendError) {
        setError(sendError.message || "发送失败，请稍后重试");
        return;
      }
      setCooldown(60);
      setMessage(
        auto
          ? "验证码已发送到邮箱。未配置 SMTP 时请查看服务端控制台。"
          : "验证码已重新发送。未配置 SMTP 时请查看服务端控制台。",
      );
    } catch {
      setError("发送失败，请检查网络或稍后重试");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    void sendCode(true);
    // 进页自动发一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位数字验证码");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email,
        otp: code,
      });
      if (verifyError) {
        setError(verifyError.message || "验证码错误或已过期");
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("验证失败，请稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
      <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--teal)]">
        VERIFY EMAIL
      </p>
      <h1 className="text-xl tracking-[0.12em] text-[var(--paper)]">验证邮箱</h1>
      <p className="text-sm leading-6 text-[var(--mist)]">
        账号 <span className="text-[var(--paper)]">{email}</span>{" "}
        尚未验证。请填写邮件中的 6 位验证码（约 5 分钟有效）。
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          验证码
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="auth-field tracking-[0.3em]"
            placeholder="6 位数字"
            required
          />
        </label>
        {message ? (
          <p className="text-sm text-[var(--teal)]" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending || otp.length !== 6}
            className="ui-btn-primary ui-btn-sm !w-auto"
          >
            {pending ? "验证中…" : "验证并进入"}
          </button>
          <button
            type="button"
            disabled={pending || cooldown > 0}
            onClick={() => void sendCode(false)}
            className="ui-btn-ghost ui-btn-sm"
          >
            {cooldown > 0 ? `${cooldown}s 后可重发` : "重发验证码"}
          </button>
          <LogoutButton />
        </div>
      </form>
    </div>
  );
}
