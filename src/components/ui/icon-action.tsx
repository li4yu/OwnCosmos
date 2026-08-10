"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { HoverTip } from "@/components/ui/hover-tip";

type CommonProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

/** 图标按钮：短文案动作改为图标，悬停与大模块说明对齐 */
export function IconActionButton({
  label,
  children,
  className = "",
  type = "button",
  ...rest
}: CommonProps &
  Omit<
    ComponentPropsWithoutRef<"button">,
    "children" | "aria-label" | "title"
  >) {
  return (
    <HoverTip tip={label} variant="hint" nestInControl className="inline-flex">
      <button
        type={type}
        aria-label={label}
        className={`oc-icon-action ${className}`.trim()}
        {...rest}
      >
        {children}
      </button>
    </HoverTip>
  );
}

/** 图标链接：返回 / 全部 等导航用箭头图标 + 与大模块同款悬停说明 */
export function IconActionLink({
  label,
  children,
  className = "",
  href,
  ...rest
}: CommonProps &
  Omit<
    ComponentPropsWithoutRef<typeof Link>,
    "children" | "aria-label" | "title"
  >) {
  return (
    <HoverTip tip={label} variant="hint" nestInControl className="inline-flex">
      <Link
        href={href}
        aria-label={label}
        className={`oc-icon-action ${className}`.trim()}
        {...rest}
      >
        {children}
      </Link>
    </HoverTip>
  );
}
