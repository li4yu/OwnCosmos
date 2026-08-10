"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PoeticName } from "@/components/ui/poetic-name";
import { APP_MODULES, matchModule } from "@/lib/modules";

export function ModuleNav() {
  const pathname = usePathname();
  const router = useRouter();
  const active = matchModule(pathname);
  const [dirty, setDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    const onDirty = (e: Event) => {
      const detail = (e as CustomEvent<{ dirty: boolean }>).detail;
      if (typeof detail?.dirty === "boolean") setDirty(detail.dirty);
    };
    window.addEventListener("owncosmos:essay-dirty", onDirty);
    return () => window.removeEventListener("owncosmos:essay-dirty", onDirty);
  }, []);

  function go(href: string) {
    if (pathname === href) return;
    if (dirty) {
      setPendingHref(href);
      return;
    }
    router.push(href);
  }

  return (
    <>
      <nav
        aria-label="模块导航"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 sm:justify-center sm:gap-2"
      >
        {APP_MODULES.map((mod) => {
          const isActive = active?.id === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => go(mod.href)}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm tracking-[0.1em] transition sm:px-3 ${
                isActive
                  ? "bg-[var(--amber)] text-[var(--on-amber)]"
                  : "text-[var(--mist)] hover:bg-[var(--field-bg)] hover:text-[var(--paper)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <PoeticName name={mod.name} tip={mod.tip} nestInControl />
            </button>
          );
        })}
      </nav>

      <ConfirmDialog
        open={Boolean(pendingHref)}
        title="离开编辑？"
        message="有未保存的更改，切换模块后将丢失。确定离开吗？"
        confirmLabel="离开"
        cancelLabel="继续编辑"
        onCancel={() => setPendingHref(null)}
        onConfirm={() => {
          const href = pendingHref;
          setPendingHref(null);
          window.dispatchEvent(
            new CustomEvent("owncosmos:essay-dirty", { detail: { dirty: false } }),
          );
          if (href) router.push(href);
        }}
      />
    </>
  );
}

/**
 * 品牌标识（非导航）。
 * 日后替换为专属 logo；回首页请点顶栏「首页」。
 */
export function BrandMark() {
  return (
    <div
      className="shrink-0 select-none"
      aria-label="自宇"
      title="自宇 · My Own Cosmos"
    >
      <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.2em] text-[var(--amber)]">
        自宇
      </p>
    </div>
  );
}
