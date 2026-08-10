"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type TimePickerFieldProps = {
  value: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  label?: string;
  disabled?: boolean;
  clearable?: boolean;
  placeholder?: string;
};

type PopPos = { top: number; left: number; width: number };

function parseHm(value: string): { h: number; m: number } | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h > 23 || mm > 59) {
    return null;
  }
  return { h, m: mm };
}

function formatHm(h: number, m: number) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

/** 主题适配时间字段：替代原生 type=time 白底系统小窗 */
export function TimePickerField({
  value,
  onChange,
  onCommit,
  label,
  disabled = false,
  clearable = true,
  placeholder = "--:--",
}: TimePickerFieldProps) {
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const parsed = parseHm(value);
  const [draftH, setDraftH] = useState(parsed?.h ?? 22);
  const [draftM, setDraftM] = useState(parsed?.m ?? 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const p = parseHm(value);
    setDraftH(p?.h ?? 22);
    setDraftM(p?.m ?? 0);
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function update() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 200), 240);
      const popH = popRef.current?.offsetHeight ?? 220;
      const gap = 6;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const placeAbove = spaceBelow < popH && rect.top > spaceBelow;
      const top = placeAbove
        ? Math.max(8, rect.top - popH - gap)
        : Math.min(rect.bottom + gap, window.innerHeight - popH - 8);
      let left = rect.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      setPos({ top, left, width });
    }
    update();
    const raf = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const rowH = 32;
    const pad = 4;
    const id = window.requestAnimationFrame(() => {
      const p = parseHm(value);
      const h = p?.h ?? 22;
      const m = p?.m ?? 0;
      if (hourListRef.current) {
        hourListRef.current.scrollTop = h * rowH - pad;
      }
      if (minuteListRef.current) {
        minuteListRef.current.scrollTop = m * rowH - pad;
      }
    });
    return () => window.cancelAnimationFrame(id);
    // 仅打开时滚到当前值，点选时不强制回滚
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("mousedown", onPointer);
    }, 0);
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function commit(next: string) {
    onChange(next);
    onCommit?.(next);
    setOpen(false);
  }

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label={label || "选择时间"}
            className="fixed z-[80] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-2.5 shadow-[var(--dialog-shadow)]"
            style={
              pos
                ? {
                    top: pos.top,
                    left: pos.left,
                    width: pos.width,
                    visibility: "visible",
                  }
                : { top: 0, left: 0, visibility: "hidden" }
            }
          >
            <p className="mb-2 px-0.5 font-mono text-xs tracking-[0.16em] text-[var(--teal)]">
              TIME
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="mb-1 text-center text-xs text-[var(--mist)]">
                  时
                </p>
                <div
                  ref={hourListRef}
                  className="h-[168px] overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--field-bg)] p-1"
                >
                  {HOURS.map((h) => {
                    const active = h === draftH;
                    return (
                      <button
                        key={h}
                        type="button"
                        className={`flex h-8 w-full items-center justify-center rounded text-sm tabular-nums transition ${
                          active
                            ? "bg-[var(--amber)] text-[var(--on-amber)]"
                            : "text-[var(--paper)] hover:bg-[var(--ink)]"
                        }`}
                        onClick={() => setDraftH(h)}
                      >
                        {String(h).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1 text-center text-xs text-[var(--mist)]">
                  分
                </p>
                <div
                  ref={minuteListRef}
                  className="h-[168px] overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--field-bg)] p-1"
                >
                  {MINUTES.map((m) => {
                    const active = m === draftM;
                    return (
                      <button
                        key={m}
                        type="button"
                        className={`flex h-8 w-full items-center justify-center rounded text-sm tabular-nums transition ${
                          active
                            ? "bg-[var(--amber)] text-[var(--on-amber)]"
                            : "text-[var(--paper)] hover:bg-[var(--ink)]"
                        }`}
                        onClick={() => setDraftM(m)}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              {clearable ? (
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm"
                  onClick={() => commit("")}
                >
                  清空
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="ui-btn-primary !w-auto px-3 py-1.5 text-xs"
                onClick={() => commit(formatHm(draftH, draftM))}
              >
                确定
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="flex flex-col gap-1">
      {label ? (
        <span id={labelId} className="text-xs text-[var(--mist)]">
          {label}
        </span>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-labelledby={label ? labelId : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        className="rounded border border-[var(--line)] bg-[var(--field-bg)] px-2 py-1.5 text-left text-sm tabular-nums text-[var(--paper)] transition hover:border-[var(--amber)] disabled:opacity-50"
      >
        {parsed ? formatHm(parsed.h, parsed.m) : placeholder}
      </button>
      {popover}
    </div>
  );
}
