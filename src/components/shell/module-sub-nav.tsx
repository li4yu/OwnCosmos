"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PoeticName } from "@/components/ui/poetic-name";
import { matchSubfeature, type AppModuleDef } from "@/lib/modules";

type ModuleSubNavProps = {
  module: AppModuleDef;
};

/** 模块内二级子功能 Tab（占位 / 已开放） */
export function ModuleSubNav({ module }: ModuleSubNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const active = matchSubfeature(pathname, module.id);
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

  if (module.subfeatures.length === 0) return null;

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
        aria-label={`${module.name}子功能`}
        className="flex flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-[var(--field-bg)]/50 p-1"
      >
        {module.subfeatures.map((sub) => {
          const isActive = active?.id === sub.id;
          return (
            <button
              key={sub.id}
              type="button"
              onClick={() => go(sub.href)}
              className={`rounded-md px-3 py-1.5 text-sm tracking-[0.08em] transition ${
                isActive
                  ? "bg-[var(--panel)] text-[var(--paper)] shadow-sm ring-1 ring-[var(--amber)]/50"
                  : "text-[var(--mist)] hover:text-[var(--paper)]"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <PoeticName name={sub.name} tip={sub.tip} />
              {!sub.ready ? (
                <span className="ml-1.5 font-mono text-[9px] tracking-wide opacity-60">
                  稍后
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <ConfirmDialog
        open={Boolean(pendingHref)}
        title="离开编辑？"
        message="有未保存的更改，切换子功能后将丢失。确定离开吗？"
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
