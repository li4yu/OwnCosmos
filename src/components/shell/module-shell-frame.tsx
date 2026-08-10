"use client";

import { Suspense } from "react";
import {
  ModuleSideNav,
  useModuleSideCollapsed,
} from "@/components/shell/module-side-nav";
import { PoeticName } from "@/components/ui/poetic-name";
import type { AppModuleDef } from "@/lib/modules";

type ModuleShellFrameProps = {
  module: AppModuleDef;
  children: React.ReactNode;
};

/** 顶栏之下：紧凑标题 + 左侧树 + 右侧主区 */
export function ModuleShellFrame({ module, children }: ModuleShellFrameProps) {
  const { collapsed, toggleCollapsed } = useModuleSideCollapsed();

  return (
    <div className="flex flex-col gap-2">
      <header className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <p className="font-mono text-xs tracking-[0.18em] text-[var(--teal)]">
          {module.eyebrow}
        </p>
        <h1 className="text-lg font-semibold tracking-[0.12em] text-[var(--paper)]">
          <PoeticName name={module.name} tip={module.tip} />
        </h1>
        <p className="hidden max-w-md truncate text-xs text-[var(--mist)] md:block">
          {module.tip}
        </p>
      </header>

      <div className="flex items-start gap-2 sm:gap-2.5">
        <Suspense
          fallback={
            <div className="h-28 w-40 shrink-0" />
          }
        >
          <ModuleSideNav
            module={module}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
        </Suspense>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
