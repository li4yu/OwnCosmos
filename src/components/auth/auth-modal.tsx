"use client";

import { useEffect, useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";

export type AuthMode = "login" | "register";

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
};

export function AuthModal({ open, mode, onModeChange, onClose }: AuthModalProps) {
  const titleId = useId();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/app";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[3px] transition"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="auth-dialog relative z-10 w-full max-w-[400px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)] sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[0.7rem] tracking-[0.22em] text-[var(--teal)]">
              {mode === "login" ? "RETURN TO ORBIT" : "BEGIN YOUR COSMOS"}
            </p>
            <h2
              id={titleId}
              className="mt-1.5 text-xl tracking-[0.12em] text-[var(--paper)]"
              style={{ fontFamily: "var(--font-noto-serif), Songti SC, serif" }}
            >
              {mode === "login" ? "回到你的时序" : "开启属于你的自宇"}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--mist)]">
              {mode === "login"
                ? "登录后继续你的过往、当下与未来。"
                : "注册后即可书写随笔、规划来日、开启专注。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="auth-dialog__close"
            aria-label="关闭窗口"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="auth-dialog__tabs mb-4 grid grid-cols-2 gap-1 border border-[var(--line)] p-1">
          <button
            type="button"
            onClick={() => onModeChange("login")}
            className={`py-1.5 text-sm tracking-[0.08em] transition ${
              mode === "login"
                ? "bg-[var(--amber)] text-[var(--on-amber)]"
                : "text-[var(--mist)] hover:text-[var(--paper)]"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => onModeChange("register")}
            className={`py-1.5 text-sm tracking-[0.08em] transition ${
              mode === "register"
                ? "bg-[var(--amber)] text-[var(--on-amber)]"
                : "text-[var(--mist)] hover:text-[var(--paper)]"
            }`}
          >
            开启
          </button>
        </div>

        {mode === "login" ? (
          <LoginForm
            nextPath={nextPath}
            onSwitchRegister={() => onModeChange("register")}
          />
        ) : (
          <RegisterForm
            nextPath={nextPath}
            onSwitchLogin={() => onModeChange("login")}
          />
        )}
      </div>
    </div>
  );
}

type AuthEntryProps = {
  initialMode?: AuthMode | null;
  /** 营销落地顶栏：胶囊样式 */
  variant?: "default" | "landing";
};

/** Syncs ?auth=login|register with modal; used on home. */
export function AuthEntry({
  initialMode = null,
  variant = "default",
}: AuthEntryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth");
  const paramMode: AuthMode | null =
    authParam === "register" ? "register" : authParam === "login" ? "login" : null;

  const [open, setOpen] = useState(Boolean(initialMode || paramMode));
  const [mode, setMode] = useState<AuthMode>(initialMode || paramMode || "login");

  useEffect(() => {
    if (paramMode) {
      setMode(paramMode);
      setOpen(true);
    }
  }, [paramMode]);

  function syncUrl(nextMode: AuthMode | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextMode) {
      params.set("auth", nextMode);
    } else {
      params.delete("auth");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openMode(next: AuthMode) {
    setMode(next);
    setOpen(true);
    syncUrl(next);
  }

  function close() {
    setOpen(false);
    syncUrl(null);
  }

  const loginClass =
    variant === "landing" ? "guest-landing__chip" : "ui-btn-ghost";
  const registerClass =
    variant === "landing"
      ? "guest-landing__chip guest-landing__chip--accent"
      : "ui-btn-primary !w-auto px-3 py-1.5 text-xs";

  return (
    <>
      <button type="button" onClick={() => openMode("login")} className={loginClass}>
        登录
      </button>
      <button
        type="button"
        onClick={() => openMode("register")}
        className={registerClass}
      >
        注册
      </button>
      <AuthModal
        open={open}
        mode={mode}
        onModeChange={(m) => {
          setMode(m);
          syncUrl(m);
        }}
        onClose={close}
      />
    </>
  );
}
