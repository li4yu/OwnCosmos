"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type LoginFormProps = {
  nextPath?: string;
  onSwitchRegister?: () => void;
};

export function LoginForm({ nextPath = "/app", onSwitchRegister }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message || "登录失败，请检查邮箱或密码");
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/app");
      router.refresh();
    } catch {
      setError("登录失败，请检查网络或稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3.5">
      <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
        邮箱
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-field"
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
        密码
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
        <p className="text-sm text-[#b54a4a]" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="auth-submit mt-1">
        {pending ? "登录中…" : "登录"}
      </button>
      {onSwitchRegister ? (
        <p className="text-center text-sm text-[var(--mist)]">
          还没有账号？{" "}
          <button
            type="button"
            onClick={onSwitchRegister}
            className="text-[var(--amber)] underline-offset-4 hover:underline"
          >
            去注册
          </button>
        </p>
      ) : null}
    </form>
  );
}
