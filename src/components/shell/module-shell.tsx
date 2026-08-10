import Link from "next/link";
import { ModuleShellFrame } from "@/components/shell/module-shell-frame";
import { ModuleStageFrame } from "@/components/shell/module-stage-frame";
import { HoverTip } from "@/components/ui/hover-tip";
import { IconActionLink } from "@/components/ui/icon-action";
import { IconArrowLeft, IconChevronRight } from "@/components/ui/icon-glyphs";
import { PoeticName } from "@/components/ui/poetic-name";
import { getModule } from "@/lib/modules";

type ModuleShellProps = {
  moduleId: string;
  children: React.ReactNode;
  /**
   * stage = 仿自省镜面（默认）
   * classic = 原先标题 + 左侧树（全屏舱 / 凝时等沿用）
   */
  variant?: "stage" | "classic";
};

/** 核心模块壳 */
export function ModuleShell({
  moduleId,
  children,
  variant = "stage",
}: ModuleShellProps) {
  const mod = getModule(moduleId);
  if (!mod) return <>{children}</>;

  if (variant === "classic") {
    return <ModuleShellFrame module={mod}>{children}</ModuleShellFrame>;
  }

  return <ModuleStageFrame module={mod}>{children}</ModuleStageFrame>;
}

/** 模块枢纽：笺页流入口 */
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
                  <PoeticName name={sub.name} tip={sub.tip} nestInControl />
                </h2>
                <p className="oc-scroll__body line-clamp-1">{sub.tip}</p>
              </div>
              <HoverTip tip="进入" variant="hint" nestInControl>
                <span className="shrink-0 text-[var(--amber)]" aria-hidden>
                  <IconChevronRight size={16} />
                </span>
              </HoverTip>
            </Link>
          </li>
        ) : (
          <li key={sub.id}>
            <Link href={sub.href} className="opacity-70">
              <div className="min-w-0">
                <h2 className="text-sm tracking-[0.08em] text-[var(--mist)]">
                  <PoeticName name={sub.name} tip={sub.tip} nestInControl />
                  <span className="ml-1.5 font-mono text-xs tracking-wide">
                    稍后
                  </span>
                </h2>
                <p className="oc-scroll__body line-clamp-1">{sub.tip}</p>
              </div>
              <span className="shrink-0 font-mono text-xs text-[var(--mist)]">
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
          <IconActionLink
            href={mod.href}
            label={`返回${mod.name}`}
            className="oc-back"
          >
            <IconArrowLeft size={15} />
          </IconActionLink>
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
