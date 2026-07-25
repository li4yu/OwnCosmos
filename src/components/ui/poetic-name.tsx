"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type PoeticNameProps = {
  name: string;
  tip: string;
  className?: string;
};

/** 悬停多久后才显示（毫秒） */
const HOVER_DELAY_MS = 480;

/** 雅名悬停提示：主题字体与色板（非浏览器原生 title） */
export function PoeticName({ name, tip, className }: PoeticNameProps) {
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
    clearDelay();
    delayRef.current = setTimeout(() => {
      place();
      setOpen(true);
      delayRef.current = null;
    }, HOVER_DELAY_MS);
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
          className="ui-tooltip pointer-events-none fixed z-[80] max-w-[min(280px,calc(100vw-24px))] rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-left text-sm leading-6 text-[var(--mist)] shadow-[var(--dialog-shadow)]"
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
        tabIndex={0}
        className={`ui-poetic-name cursor-help decoration-[var(--amber)]/50 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none ${className ?? ""}`}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={scheduleShow}
        onMouseLeave={hide}
        onFocus={scheduleShow}
        onBlur={hide}
      >
        {name}
      </span>
      {tipNode}
    </>
  );
}
