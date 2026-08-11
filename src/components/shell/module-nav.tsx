"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { HoverTip } from "@/components/ui/hover-tip";
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
    const alreadyHere =
      pathname === href ||
      (href !== "/app" && pathname.startsWith(`${href}/`));
    if (alreadyHere) {
      // 已在该模块：软导航卡住时再点可恢复，不必整页硬刷
      router.refresh();
      return;
    }
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
              className={`shrink-0 rounded-md px-1.5 py-1 text-[clamp(0.78rem,2.6vw,0.9375rem)] tracking-[0.04em] transition sm:px-3 sm:py-1.5 sm:tracking-[0.08em] ${
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
    <HoverTip
      tip="自宇 · My Own Cosmos"
      variant="hint"
      nestInControl
      className="inline-flex shrink-0"
    >
      <div className="app-brand-mark select-none" aria-label="自宇">
        <span className="app-brand-mark__zh">自宇</span>
        <span className="app-brand-mark__en">My Own Cosmos</span>
      </div>
    </HoverTip>
  );
}
