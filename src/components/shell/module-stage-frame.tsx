"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PoeticName } from "@/components/ui/poetic-name";
import {
  matchSubfeature,
  type AppModuleDef,
  type SubfeatureDef,
} from "@/lib/modules";

type ModuleStageFrameProps = {
  module: AppModuleDef;
  children: React.ReactNode;
};

type ModeItem = {
  id: string;
  href: string;
  name: string;
  tip: string;
};

/**
 * 仿自省镜面壳：全幅舞台 + 左侧竖题/方式栏 + 右侧玻璃主区。
 * 首页不使用；昔时往 / 今时际 / 来日途 / 凝时（总览与记录）共用。
 * 全屏舱（正向/倒计时、时间胶囊等）在此旁路或路由外，避免套进玻璃框。
 */
const FULLSCREEN_BYPASS = ["/app/future/capsule"] as const;

export function ModuleStageFrame({ module, children }: ModuleStageFrameProps) {
  const pathname = usePathname();
  const activeSub = matchSubfeature(pathname, module.id);

  if (
    FULLSCREEN_BYPASS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    )
  ) {
    return <>{children}</>;
  }

  const modes: ModeItem[] = [
    {
      id: "_hub",
      href: module.href,
      name: "总览",
      tip: module.tip,
    },
    ...module.subfeatures.map((s: SubfeatureDef) => ({
      id: s.id,
      href: s.href,
      name: s.name,
      tip: s.tip,
    })),
  ];

  function isModeOn(mode: ModeItem) {
    if (mode.id === "_hub") {
      return pathname === module.href || pathname === `${module.href}/`;
    }
    if (activeSub?.id === mode.id) return true;
    return pathname === mode.href || pathname.startsWith(`${mode.href}/`);
  }

  return (
    <div className="oc-module-stage">
      <div className="oc-mirror">
        <div className="oc-mirror__veil" aria-hidden>
          <span className="oc-mirror__orb oc-mirror__orb--a" />
          <span className="oc-mirror__orb oc-mirror__orb--b" />
          <span className="oc-mirror__grain" />
        </div>

        <aside className="oc-mirror__side">
          <header className="oc-mirror__inscribe">
            <p className="oc-mirror__eyebrow">{module.eyebrow}</p>
            <h1 className="oc-mirror__motto" lang="zh-Hans">
              {module.motto ?? module.name}
            </h1>
            <p className="oc-mirror__sub">{module.tip}</p>
          </header>

          <nav className="oc-mirror__modes" aria-label={`${module.name}方式`}>
            {modes.map((mode, i) => {
              const on = isModeOn(mode);
              return (
                <Link
                  key={mode.id}
                  href={mode.href}
                  className={
                    on
                      ? "oc-mirror__mode oc-mirror__mode--on"
                      : "oc-mirror__mode"
                  }
                  aria-current={on ? "page" : undefined}
                >
                  <span className="oc-mirror__mode-idx">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="oc-mirror__mode-copy">
                    <span className="oc-mirror__mode-label">
                      <PoeticName
                        name={mode.name}
                        tip={mode.tip}
                        nestInControl
                      />
                    </span>
                    <span className="oc-mirror__mode-hint">{mode.tip}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="oc-mirror__looking" aria-label={module.name}>
          <div className="oc-mirror__rim" aria-hidden />
          <div className="oc-mirror__glass">
            <div className="oc-mirror__pane oc-mirror__pane--scroll">
              {children}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
