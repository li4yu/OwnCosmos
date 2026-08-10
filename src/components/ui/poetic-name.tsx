"use client";

import { HoverTip } from "@/components/ui/hover-tip";

type PoeticNameProps = {
  name: string;
  tip: string;
  className?: string;
  /**
   * 嵌在按钮/链接里时开启：加长延迟、按下立刻收起、不抢焦点，
   * 避免悬停说明妨碍点击导航。
   */
  nestInControl?: boolean;
  /** 悬停多久后显示（毫秒）；nestInControl 默认更长 */
  delayMs?: number;
};

/** 雅名悬停提示：与 HoverTip / 大模块顶栏同一套气泡 */
export function PoeticName({
  name,
  tip,
  className,
  nestInControl = false,
  delayMs,
}: PoeticNameProps) {
  return (
    <HoverTip
      tip={tip}
      nestInControl={nestInControl}
      delayMs={delayMs}
      className={`ui-poetic-name ${
        nestInControl
          ? "cursor-inherit"
          : "cursor-help decoration-[var(--amber)]/50 underline-offset-4 hover:underline"
      } ${className ?? ""}`}
    >
      {name}
    </HoverTip>
  );
}
