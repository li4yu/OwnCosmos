"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function emailLocalPart(email: string) {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "自宇旅人";
}

type RegisterFormProps = {
  nextPath?: string;
  onSwitchLogin?: () => void;
};

export function RegisterForm({ nextPath = "/app", onSwitchLogin }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const displayName = name.trim() || emailLocalPart(email);
      const { error: signUpError } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: displayName,
        theme: "night",
        essayIdleHours: 48,
        anniversaryRemind: false,
        notifyEnabled: true,
        notifyDueReminder: true,
      });
      if (signUpError) {
        setError(signUpError.message || "注册失败，请稍后重试");
        return;
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/app");
      router.refresh();
    } catch {
      setError("注册失败，请检查网络或稍后重试");
    } finally {
      setPending(false);
    }
  }

  return (
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
        />
      </label>
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
        密码（至少 8 位）
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-field"
          autoComplete="new-password"
        />
      </label>
      {error ? (
        <p className="text-sm text-[#b54a4a]" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="auth-submit mt-1">
        {pending ? "注册中…" : "注册"}
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
  );
}
