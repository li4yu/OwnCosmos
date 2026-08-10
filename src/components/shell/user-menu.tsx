"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HoverTip } from "@/components/ui/hover-tip";
import { authClient } from "@/lib/auth-client";
import { displayInitial } from "@/lib/user-display";

type UserMenuProps = {
  name: string;
  image?: string | null;
  email: string;
};

export function UserMenu({ name, image, email }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const displayName = (name || "").trim() || email.split("@")[0] || "旅人";
  const initial = displayInitial(displayName);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onLogout() {
    setPending(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <HoverTip tip={email} variant="hint" nestInControl className="inline-flex">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-[var(--line)] p-0.5 pr-2 transition hover:border-[var(--amber)]"
          aria-label={email}
        >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--field-bg)] font-mono text-xs text-[var(--paper)]">
            {initial}
          </span>
        )}
        <span className="max-w-[7rem] truncate text-sm tracking-wide text-[var(--paper)] sm:max-w-[9rem]">
          {displayName}
        </span>
        </button>
      </HoverTip>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] py-1 shadow-[var(--dialog-shadow)]"
        >
          <div className="border-b border-[var(--line)] px-3 py-2">
            <p className="truncate text-sm text-[var(--paper)]">{displayName}</p>
            <p className="truncate text-xs text-[var(--mist)]">{email}</p>
          </div>
          <MenuLink href="/app/profile" onNavigate={() => setOpen(false)}>
            编辑资料
          </MenuLink>
          <MenuLink href="/app/settings" onNavigate={() => setOpen(false)}>
            设置
          </MenuLink>
          <MenuLink href="/app/guide" onNavigate={() => setOpen(false)}>
            使用说明
          </MenuLink>
          <div className="my-1 border-t border-[var(--line)]" />
          <button
            type="button"
            role="menuitem"
            onClick={onLogout}
            disabled={pending}
            className="flex w-full px-3 py-2 text-left text-sm text-[var(--paper)] hover:bg-[var(--field-bg)] disabled:opacity-50"
          >
            {pending ? "退出中…" : "退出登录"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex w-full px-3 py-2 text-sm text-[var(--paper)] hover:bg-[var(--field-bg)]"
    >
      {children}
    </Link>
  );
}
