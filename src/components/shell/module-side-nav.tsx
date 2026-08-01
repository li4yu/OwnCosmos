"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PoeticName } from "@/components/ui/poetic-name";
import {
  GALLERY_SECTIONS,
  matchGallerySection,
} from "@/lib/gallery-sections";
import {
  matchSubfeature,
  type AppModuleDef,
  type SubfeatureDef,
} from "@/lib/modules";

type NavChild = {
  id: string;
  href: string;
  name: string;
  tip: string;
  ready: boolean;
};

type ModuleSideNavProps = {
  module: AppModuleDef;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

function childrenForSub(moduleId: string, sub: SubfeatureDef): NavChild[] {
  if (moduleId === "past" && sub.id === "gallery") {
    return GALLERY_SECTIONS.map((s) => ({
      id: s.id,
      href: s.href,
      name: s.name,
      tip: s.tip,
      ready: s.ready,
    }));
  }
  return [];
}

const COLLAPSED_KEY = "owncosmos:module-side-collapsed";
const OPEN_KEY_PREFIX = "owncosmos:module-side-open:";

function activateOnKey(
  e: KeyboardEvent<HTMLElement>,
  action: () => void,
) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    action();
  }
}

/** 左侧模块树：二级可展开，三级竖排；雅名统一 PoeticName 悬停提示 */
export function ModuleSideNav({
  module,
  collapsed,
  onToggleCollapsed,
}: ModuleSideNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeSub = matchSubfeature(pathname, module.id);
  const activeGallery = matchGallerySection(
    pathname,
    searchParams.get("section"),
  );

  const [dirty, setDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const onDirty = (e: Event) => {
      const detail = (e as CustomEvent<{ dirty: boolean }>).detail;
      if (typeof detail?.dirty === "boolean") setDirty(detail.dirty);
    };
    window.addEventListener("owncosmos:essay-dirty", onDirty);
    return () => window.removeEventListener("owncosmos:essay-dirty", onDirty);
  }, []);

  useEffect(() => {
    try {
      const next: Record<string, boolean> = {};
      for (const sub of module.subfeatures) {
        const raw = localStorage.getItem(
          `${OPEN_KEY_PREFIX}${module.id}:${sub.id}`,
        );
        if (raw === "1") next[sub.id] = true;
        if (raw === "0") next[sub.id] = false;
      }
      setOpenMap(next);
    } catch {
      // ignore
    }
  }, [module.id, module.subfeatures]);

  useEffect(() => {
    if (!activeSub) return;
    setOpenMap((prev) => {
      if (prev[activeSub.id] === true) return prev;
      const next = { ...prev, [activeSub.id]: true };
      try {
        localStorage.setItem(
          `${OPEN_KEY_PREFIX}${module.id}:${activeSub.id}`,
          "1",
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, [activeSub, module.id]);

  const tree = useMemo(
    () =>
      module.subfeatures.map((sub) => ({
        sub,
        children: childrenForSub(module.id, sub),
      })),
    [module],
  );

  function go(href: string) {
    if (pathname === href) return;
    if (dirty) {
      setPendingHref(href);
      return;
    }
    router.push(href);
  }

  function toggleOpen(subId: string) {
    setOpenMap((prev) => {
      const nextOpen = !(prev[subId] ?? false);
      try {
        localStorage.setItem(
          `${OPEN_KEY_PREFIX}${module.id}:${subId}`,
          nextOpen ? "1" : "0",
        );
      } catch {
        // ignore
      }
      return { ...prev, [subId]: nextOpen };
    });
  }

  if (module.subfeatures.length === 0) return null;

  return (
    <>
      <aside
        className={`sticky top-16 shrink-0 self-start transition-[width] ${
          collapsed ? "w-9" : "w-36 sm:w-40"
        }`}
        aria-label={`${module.name}模块导航`}
      >
        <div
          className={`flex items-center ${
            collapsed
              ? "justify-center py-1"
              : "justify-between gap-1 px-1 py-1"
          }`}
        >
          {!collapsed ? (
            <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--teal)]">
              模块
            </p>
          ) : null}
          <div
            role="button"
            tabIndex={0}
            className={`ui-btn-ghost ui-btn-sm cursor-pointer ${
              collapsed ? "px-1.5" : "px-2"
            }`}
            onClick={onToggleCollapsed}
            onKeyDown={(e) => activateOnKey(e, onToggleCollapsed)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
          >
            <PoeticName
              name={collapsed ? "»" : "«"}
              tip={collapsed ? "展开左侧模块导航" : "收起左侧模块导航"}
            />
          </div>
        </div>

        <nav
          className={`flex flex-col gap-px p-1 ${collapsed ? "items-center" : ""}`}
        >
          {tree.map(({ sub, children }) => {
            const isSubActive = activeSub?.id === sub.id;
            const isOpen = openMap[sub.id] ?? isSubActive;
            const hasChildren = children.length > 0;

            if (collapsed) {
              return (
                <div
                  key={sub.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => go(sub.href)}
                  onKeyDown={(e) => activateOnKey(e, () => go(sub.href))}
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-xs tracking-wide transition ${
                    isSubActive
                      ? "bg-[var(--field-bg)] text-[var(--amber)] ring-1 ring-[var(--amber)]/40"
                      : "text-[var(--mist)] hover:text-[var(--paper)]"
                  }`}
                  aria-current={isSubActive ? "page" : undefined}
                >
                  <PoeticName
                    name={sub.name.slice(0, 1)}
                    tip={`${sub.name}：${sub.tip}`}
                  />
                </div>
              );
            }

            return (
              <div key={sub.id} className="flex flex-col">
                <div className="flex items-stretch gap-0.5">
                  {hasChildren ? (
                    <div
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer rounded-md px-1.5 text-[var(--mist)] hover:text-[var(--paper)]"
                      aria-expanded={isOpen}
                      aria-label={
                        isOpen ? `收起${sub.name}` : `展开${sub.name}`
                      }
                      onClick={() => toggleOpen(sub.id)}
                      onKeyDown={(e) =>
                        activateOnKey(e, () => toggleOpen(sub.id))
                      }
                    >
                      <PoeticName
                        name={isOpen ? "▾" : "▸"}
                        tip={
                          isOpen
                            ? `收起「${sub.name}」下的分区`
                            : `展开「${sub.name}」下的分区`
                        }
                      />
                    </div>
                  ) : (
                    <span className="w-5" />
                  )}
                  <div
                    role="link"
                    tabIndex={0}
                    onClick={() => go(sub.href)}
                    onKeyDown={(e) => activateOnKey(e, () => go(sub.href))}
                    className={`min-w-0 flex-1 cursor-pointer rounded-md px-1.5 py-1 text-left text-[13px] tracking-[0.04em] transition ${
                      isSubActive && !hasChildren
                        ? "bg-[var(--field-bg)] text-[var(--paper)] ring-1 ring-[var(--amber)]/40"
                        : isSubActive
                          ? "text-[var(--paper)]"
                          : "text-[var(--mist)] hover:bg-[var(--field-bg)]/60 hover:text-[var(--paper)]"
                    }`}
                    aria-current={
                      isSubActive && !hasChildren ? "page" : undefined
                    }
                  >
                    <span className="inline-flex flex-wrap items-center gap-1">
                      <PoeticName name={sub.name} tip={sub.tip} />
                      {!sub.ready ? (
                        <span className="font-mono text-[9px] opacity-60">
                          稍后
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>

                {hasChildren && isOpen ? (
                  <ul className="mb-0.5 ml-4 mt-px flex flex-col gap-px border-l border-[var(--line)] pl-1.5">
                    {children.map((child) => {
                      const childActive =
                        sub.id === "gallery"
                          ? activeGallery?.id === child.id
                          : pathname === child.href ||
                            pathname.startsWith(`${child.href}/`);
                      return (
                        <li key={child.id}>
                          <div
                            role="link"
                            tabIndex={0}
                            onClick={() => go(child.href)}
                            onKeyDown={(e) =>
                              activateOnKey(e, () => go(child.href))
                            }
                            className={`w-full cursor-pointer rounded-md px-1.5 py-1 text-left text-xs tracking-[0.03em] transition ${
                              childActive
                                ? "bg-[var(--field-bg)] text-[var(--paper)] ring-1 ring-[var(--amber)]/40"
                                : "text-[var(--mist)] hover:bg-[var(--field-bg)]/50 hover:text-[var(--paper)]"
                            }`}
                            aria-current={childActive ? "page" : undefined}
                          >
                            <PoeticName name={child.name} tip={child.tip} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

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
            new CustomEvent("owncosmos:essay-dirty", {
              detail: { dirty: false },
            }),
          );
          if (href) router.push(href);
        }}
      />
    </>
  );
}

export function useModuleSideCollapsed() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored === "1" || stored === "0") {
        setCollapsed(stored === "1");
      } else {
        setCollapsed(window.matchMedia("(max-width: 640px)").matches);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return { collapsed: ready ? collapsed : false, toggleCollapsed };
}
