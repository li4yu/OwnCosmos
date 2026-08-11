"use client";

import type { ReactNode } from "react";
import { HoverTip } from "@/components/ui/hover-tip";

/** 欢迎页悬停说明：统一字体与雾面气泡 */
export function SplashTip({
  tip,
  children,
  className,
}: {
  tip: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <HoverTip
      tip={tip}
      tipClassName="ui-tooltip--splash"
      nestInControl
      delayMs={380}
      className={className ?? "inline-flex"}
    >
      {children}
    </HoverTip>
  );
}
