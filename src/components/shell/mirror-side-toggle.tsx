"use client";

import {
  IconChevronLeft,
  IconChevronRight,
} from "@/components/ui/icon-glyphs";
import { HoverTip } from "@/components/ui/hover-tip";

type MirrorSideToggleProps = {
  collapsed: boolean;
  onToggle: () => void;
  /** collapsed：窄轨展开钮；expanded：铭文栏内收起钮 */
  variant: "rail" | "panel";
};

/** 镜台左侧铭文收起 / 展开 */
export function MirrorSideToggle({
  collapsed,
  onToggle,
  variant,
}: MirrorSideToggleProps) {
  const label = collapsed ? "展开铭文栏" : "收起铭文栏";
  const className =
    variant === "rail"
      ? "oc-mirror__side-toggle oc-mirror__side-toggle--rail"
      : "oc-mirror__side-toggle oc-mirror__side-toggle--panel";

  return (
    <HoverTip tip={label} variant="hint" nestInControl className="inline-flex">
      <button
        type="button"
        className={className}
        onClick={onToggle}
        aria-label={label}
        aria-expanded={!collapsed}
      >
        {collapsed ? (
          <IconChevronRight size={14} />
        ) : (
          <IconChevronLeft size={14} />
        )}
      </button>
    </HoverTip>
  );
}
