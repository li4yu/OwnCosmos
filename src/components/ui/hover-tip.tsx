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
  delayMs?: number;
};

/** 主题悬停提示（非浏览器原生 title） */
export function HoverTip({
  tip,
  children,
  className,
  style,
  tipClassName,
  delayMs = 280,
}: HoverTipProps) {
  const tipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, placeAbove: false });

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
    const placeAbove = r.bottom + 96 > window.innerHeight && r.top > 96;
    setCoords({
      top: placeAbove ? r.top - 10 : r.bottom + 10,
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
    clearDelay();
    delayRef.current = setTimeout(() => {
      place();
      setOpen(true);
      delayRef.current = null;
    }, delayMs);
  }

  function hide() {
    clearDelay();
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, place]);

  const tipNode =
    mounted && open ? (
      createPortal(
        <div
          id={tipId}
          role="tooltip"
          className={`ui-tooltip pointer-events-none fixed z-[90] max-w-[min(260px,calc(100vw-24px))] rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-left text-sm leading-6 text-[var(--mist)] shadow-[var(--dialog-shadow)] ${tipClassName ?? ""}`}
          style={{
            top: coords.top,
            left: coords.left,
            transform: coords.placeAbove
              ? "translate(-50%, -100%)"
              : "translateX(-50%)",
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
        className={className}
        style={style}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocus={scheduleShow}
        onBlur={hide}
      >
        {children}
      </span>
      {tipNode}
    </>
  );
}
