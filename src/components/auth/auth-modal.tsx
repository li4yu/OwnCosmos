"use client";

import { useEffect, useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { ThemeToggle } from "@/components/theme-toggle";

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
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px] transition"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-[380px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)] sm:p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--teal)]">
              {mode === "login" ? "SIGN IN" : "SIGN UP"}
            </p>
            <h2 id={titleId} className="mt-1 text-xl tracking-[0.14em] text-[var(--paper)]">
              {mode === "login" ? "登录" : "注册"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={onClose}
              className="ui-btn-ghost ui-btn-sm"
              aria-label="关闭窗口"
            >
              关闭
            </button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-[var(--line)] p-1">
          <button
            type="button"
            onClick={() => onModeChange("login")}
            className={`rounded-md py-1.5 text-sm tracking-[0.08em] transition ${
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
            className={`rounded-md py-1.5 text-sm tracking-[0.08em] transition ${
              mode === "register"
                ? "bg-[var(--amber)] text-[var(--on-amber)]"
                : "text-[var(--mist)] hover:text-[var(--paper)]"
            }`}
          >
            注册
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
