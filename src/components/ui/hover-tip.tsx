"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type HoverTipProps = {
  tip: ReactNode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 额外 tip 样式（如胶囊舱） */
  tipClassName?: string;
  /**
   * default / hint：与大模块雅名同款说明气泡（hint 仅略紧凑，不再另起一套字体色）
   */
  variant?: "default" | "hint";
  /**
   * 嵌在按钮/链接里：加长延迟、按下立刻收起、不抢焦点（与顶栏模块一致）
   */
  nestInControl?: boolean;
  /** 悬停多久后显示；nestInControl 默认更长 */
  delayMs?: number;
};

const DEFAULT_DELAY_MS = 520;
const NESTED_DELAY_MS = 900;

/** 主题悬停提示（非浏览器原生 title）；视觉与大模块 PoeticName 对齐 */
export function HoverTip({
  tip,
  children,
  className,
  style,
  tipClassName,
  variant = "default",
  nestInControl = false,
  delayMs,
}: HoverTipProps) {
  const tipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placeAbove: false });
  const waitMs =
    delayMs ?? (nestInControl ? NESTED_DELAY_MS : DEFAULT_DELAY_MS);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (delayRef.current) clearTimeout(delayRef.current);
    };
  }, []);

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.min(
      Math.max(r.left + r.width / 2, 12),
      window.innerWidth - 12,
    );
    const placeAbove = r.bottom + 88 > window.innerHeight && r.top > 88;
    setCoords({
      top: placeAbove ? r.top - 8 : r.bottom + 8,
      left,
      placeAbove,
    });
  }, []);

  function clearDelay() {
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
  }

  function scheduleShow() {
    if (tip == null || tip === "") return;
    clearDelay();
    delayRef.current = setTimeout(() => {
      place();
      setOpen(true);
      delayRef.current = null;
    }, waitMs);
  }

  function hide() {
    clearDelay();
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, place]);

  const tipNode =
    mounted && open ? (
      createPortal(
        <div
          id={tipId}
          role="tooltip"
          className={[
            "ui-tooltip",
            variant === "hint" ? "ui-tooltip--hint" : "",
            tipClassName ?? "",
            "pointer-events-none fixed z-[80]",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            top: coords.top,
            left: coords.left,
            transform: coords.placeAbove
              ? "translate(-50%, -100%)"
              : "translateX(-50%)",
            maxWidth: "min(280px, calc(100vw - 24px))",
          }}
        >
          {tip}
        </div>,
        document.body,
      )
    ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        className={className ?? "inline-flex"}
        style={style}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onPointerDown={hide}
        {...(nestInControl
          ? {}
          : {
              onFocus: scheduleShow,
              onBlur: hide,
            })}
      >
        {children}
      </span>
      {tipNode}
    </>
  );
}
