import Link from "next/link";
import { ModuleShellFrame } from "@/components/shell/module-shell-frame";
import { PoeticName } from "@/components/ui/poetic-name";
import { getModule } from "@/lib/modules";

type ModuleShellProps = {
  moduleId: string;
  children: React.ReactNode;
};

/** 核心模块壳：标题 + 左侧模块树 + 右侧内容（顶栏仍由 AppChrome 负责） */
export function ModuleShell({ moduleId, children }: ModuleShellProps) {
  const mod = getModule(moduleId);
  if (!mod) return <>{children}</>;

  return <ModuleShellFrame module={mod}>{children}</ModuleShellFrame>;
}

/** 模块枢纽：紧凑入口列表（侧栏已有导航，此处作摘要） */
export function ModuleHubCards({ moduleId }: { moduleId: string }) {
  const mod = getModule(moduleId);
  if (!mod) return null;

  return (
    <ul className="flex flex-col gap-1">
      {mod.subfeatures.map((sub) =>
        sub.ready ? (
          <li key={sub.id}>
            <Link
              href={sub.href}
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 transition hover:border-[var(--amber)]"
            >
              <div className="min-w-0">
                <h2 className="text-sm tracking-[0.08em] text-[var(--paper)]">
                  <PoeticName name={sub.name} tip={sub.tip} />
                </h2>
                <p className="mt-0.5 line-clamp-1 text-xs text-[var(--mist)]">
                  {sub.tip}
                </p>
              </div>
              <span className="shrink-0 text-xs tracking-[0.08em] text-[var(--amber)]">
                进入 →
              </span>
            </Link>
          </li>
        ) : (
          <li key={sub.id}>
            <Link
              href={sub.href}
              className="flex items-center justify-between gap-2 rounded-md border border-dashed border-[var(--line)] bg-[var(--panel)]/40 px-2.5 py-2 transition hover:border-[var(--mist)]"
            >
              <div className="min-w-0">
                <h2 className="text-sm tracking-[0.08em] text-[var(--mist)]">
                  <PoeticName name={sub.name} tip={sub.tip} />
                  <span className="ml-1.5 font-mono text-[9px] tracking-wide">
                    稍后
                  </span>
                </h2>
                <p className="mt-0.5 line-clamp-1 text-xs text-[var(--mist)]">
                  {sub.tip}
                </p>
              </div>
              <span className="shrink-0 font-mono text-[9px] text-[var(--mist)]">
                占位
              </span>
            </Link>
          </li>
        ),
      )}
    </ul>
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
    <section className="rounded-md border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-5 text-center">
      <h2 className="text-sm tracking-[0.1em] text-[var(--paper)]">
        <PoeticName name={sub.name} tip={sub.tip} />
      </h2>
      <p className="mt-1.5 text-xs leading-5 text-[var(--mist)]">{sub.tip}</p>
      <p className="mt-2 font-mono text-[10px] tracking-wide text-[var(--mist)]">
        占位页 · 归属「{mod.name}」· 后续按阶段详细开发
      </p>
    </section>
  );
}
