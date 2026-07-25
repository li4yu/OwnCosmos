import Link from "next/link";
import { ModuleSubNav } from "@/components/shell/module-sub-nav";
import { PoeticName } from "@/components/ui/poetic-name";
import { getModule } from "@/lib/modules";

type ModuleShellProps = {
  moduleId: string;
  children: React.ReactNode;
};

/** 核心模块壳：标题 + 二级子功能导航 */
export function ModuleShell({ moduleId, children }: ModuleShellProps) {
  const mod = getModule(moduleId);
  if (!mod) return <>{children}</>;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--teal)]">
            {mod.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[0.14em] text-[var(--paper)]">
            <PoeticName name={mod.name} tip={mod.tip} />
          </h1>
          <p className="mt-2 text-sm text-[var(--mist)]">{mod.tip}</p>
        </div>
        <ModuleSubNav module={mod} />
      </header>
      {children}
    </div>
  );
}

/** 模块枢纽：子功能入口卡片 */
export function ModuleHubCards({ moduleId }: { moduleId: string }) {
  const mod = getModule(moduleId);
  if (!mod) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {mod.subfeatures.map((sub) =>
        sub.ready ? (
          <Link
            key={sub.id}
            href={sub.href}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[var(--amber)]"
          >
            <h2 className="text-lg tracking-[0.12em] text-[var(--paper)]">
              <PoeticName name={sub.name} tip={sub.tip} />
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--mist)]">{sub.tip}</p>
            <p className="mt-4 text-xs tracking-[0.08em] text-[var(--amber)]">
              进入 →
            </p>
          </Link>
        ) : (
          <Link
            key={sub.id}
            href={sub.href}
            className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)]/40 p-5 transition hover:border-[var(--mist)]"
          >
            <h2 className="text-lg tracking-[0.12em] text-[var(--mist)]">
              <PoeticName name={sub.name} tip={sub.tip} />
              <span className="ml-2 font-mono text-[10px] tracking-wide">稍后</span>
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--mist)]">{sub.tip}</p>
            <p className="mt-4 font-mono text-[10px] tracking-wide text-[var(--mist)]">
              占位 · 后续 Phase 详细开发
            </p>
          </Link>
        ),
      )}
    </div>
  );
}

/** 子功能占位页 */
export function SubfeaturePlaceholder({
  moduleId,
  subfeatureId,
}: {
  moduleId: string;
  subfeatureId: string;
}) {
  const mod = getModule(moduleId);
  const sub = mod?.subfeatures.find((s) => s.id === subfeatureId);
  if (!mod || !sub) return null;

  return (
    <section className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-8 text-center">
      <h2 className="text-lg tracking-[0.12em] text-[var(--paper)]">
        <PoeticName name={sub.name} tip={sub.tip} />
      </h2>
      <p className="mt-3 text-sm leading-7 text-[var(--mist)]">{sub.tip}</p>
      <p className="mt-5 font-mono text-[10px] tracking-wide text-[var(--mist)]">
        占位页 · 归属「{mod.name}」· 后续按阶段详细开发
      </p>
    </section>
  );
}
