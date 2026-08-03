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

/** 模块枢纽：笺页流入口，侧栏已有导航 */
export function ModuleHubCards({ moduleId }: { moduleId: string }) {
  const mod = getModule(moduleId);
  if (!mod) return null;

  return (
    <ul className="oc-hub">
      {mod.subfeatures.map((sub) =>
        sub.ready ? (
          <li key={sub.id}>
            <Link href={sub.href}>
              <div className="min-w-0">
                <h2 className="oc-scroll__title text-[1rem]">
                  <PoeticName name={sub.name} tip={sub.tip} />
                </h2>
                <p className="oc-scroll__body line-clamp-1">{sub.tip}</p>
              </div>
              <span className="shrink-0 text-sm tracking-[0.12em] text-[var(--amber)]">
                进入 →
              </span>
            </Link>
          </li>
        ) : (
          <li key={sub.id}>
            <Link href={sub.href} className="opacity-70">
              <div className="min-w-0">
                <h2 className="text-sm tracking-[0.08em] text-[var(--mist)]">
                  <PoeticName name={sub.name} tip={sub.tip} />
                  <span className="ml-1.5 font-mono text-[10px] tracking-wide">
                    稍后
                  </span>
                </h2>
                <p className="oc-scroll__body line-clamp-1">{sub.tip}</p>
              </div>
              <span className="shrink-0 font-mono text-[10px] text-[var(--mist)]">
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
    <div className="flex flex-col gap-3">
      <div className="oc-page-head">
        <div>
          <Link href={mod.href} className="oc-back">
            ← 返回{mod.name}
          </Link>
          <h2 className="oc-page-head__title text-[1.05rem]">
            <PoeticName name={sub.name} tip={sub.tip} />
          </h2>
          <p className="oc-page-head__desc">{sub.tip}</p>
        </div>
      </div>
      <div className="oc-empty">
        占位页 · 归属「{mod.name}」· 后续按阶段详细开发
      </div>
    </div>
  );
}
