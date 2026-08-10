"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { HoverTip } from "@/components/ui/hover-tip";
import { IconCalendar, IconClose } from "@/components/ui/icon-glyphs";
import {
  formatDueDateInput,
  parseDueDateInput,
} from "@/lib/plan-dates";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;

type DatePickerFieldProps = {
  name: string;
  value: string;
  onChange: (next: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  /** 允许选择今天之前的日期（馆藏筛选等）；默认 false，与计划截止日期一致 */
  allowPastDates?: boolean;
  /** 允许清空已选日期 */
  clearable?: boolean;
  /** 可选下限 YYYY-MM-DD（含当日） */
  minDate?: string;
  /** 可选上限 YYYY-MM-DD（含当日） */
  maxDate?: string;
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 12, 0, 0, 0);
}

function addYears(d: Date, n: number) {
  return new Date(d.getFullYear() + n, d.getMonth(), 1, 12, 0, 0, 0);
}

function isBeforeCurrentMonth(view: Date, today: Date) {
  return (
    view.getFullYear() < today.getFullYear() ||
    (view.getFullYear() === today.getFullYear() &&
      view.getMonth() <= today.getMonth())
  );
}

function isBeforeCurrentYear(view: Date, today: Date) {
  return view.getFullYear() <= today.getFullYear();
}

function sameYmd(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDisplay(ymd: string) {
  const d = parseDueDateInput(ymd);
  if (!d) return "选择日期";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(d);
}

type PopPos = { top: number; left: number; width: number; placeAbove: boolean };

/** 主题适配的日期字段：点击打开月历小窗（fixed 浮层，避免被 overflow 裁切） */
export function DatePickerField({
  name,
  value,
  onChange,
  label = "截止日期",
  className = "",
  disabled = false,
  allowPastDates = false,
  clearable = false,
  minDate,
  maxDate,
}: DatePickerFieldProps) {
  const labelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const selected = parseDueDateInput(value);
  const minBound = useMemo(
    () => (minDate ? parseDueDateInput(minDate) : null),
    [minDate],
  );
  const maxBound = useMemo(
    () => (maxDate ? parseDueDateInput(maxDate) : null),
    [maxDate],
  );
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0, 0);
  }, []);
  const [view, setView] = useState(() =>
    startOfMonth(selected ?? today),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // 仅在打开小窗时同步到当前选中月；依赖 value 字符串，避免 Date 引用变化导致死循环
  useEffect(() => {
    if (!open) return;
    setView(startOfMonth(parseDueDateInput(value) ?? today));
  }, [open, value, today]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function update() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, 260), 300);
      const popH = popRef.current?.offsetHeight ?? 320;
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
      setPos({ top, left, width, placeAbove });
    }
    update();
    // 首帧量高后再校正一次（向上弹出时）
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
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // 等当前点击冒泡结束后再监听，避免刚打开就被同一次点击关掉
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

  const cells = useMemo(() => {
    const first = startOfMonth(view);
    const offset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(
      view.getFullYear(),
      view.getMonth() + 1,
      0,
    ).getDate();
    const list: Array<Date | null> = [];
    for (let i = 0; i < offset; i += 1) list.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      list.push(
        new Date(view.getFullYear(), view.getMonth(), day, 12, 0, 0, 0),
      );
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [view]);

  const monthLabel = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
  }).format(view);

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="选择日期"
            className="fixed z-[80] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--dialog-shadow)]"
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
            <div className="mb-2 flex items-center justify-between gap-1">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm px-1.5 disabled:opacity-30"
                  aria-label="上一年"
                  disabled={
                    !allowPastDates && isBeforeCurrentYear(view, today)
                  }
                  onClick={() => setView((v) => addYears(v, -1))}
                >
                  «
                </button>
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm px-1.5 disabled:opacity-30"
                  aria-label="上一月"
                  disabled={
                    !allowPastDates && isBeforeCurrentMonth(view, today)
                  }
                  onClick={() => setView((v) => addMonths(v, -1))}
                >
                  ‹
                </button>
              </div>
              <p className="min-w-0 flex-1 text-center font-mono text-[13px] tracking-wide text-[var(--paper)]">
                {monthLabel}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm px-1.5"
                  aria-label="下一月"
                  onClick={() => setView((v) => addMonths(v, 1))}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm px-1.5"
                  aria-label="下一年"
                  onClick={() => setView((v) => addYears(v, 1))}
                >
                  »
                </button>
              </div>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5 text-center font-mono text-xs tracking-wide text-[var(--mist)]">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1">
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell, i) => {
                if (!cell) {
                  return <span key={`e-${i}`} className="h-8" />;
                }
                const ymd = formatDueDateInput(cell);
                const isSelected = selected ? sameYmd(cell, selected) : false;
                const isToday = sameYmd(cell, today);
                const isPast =
                  !allowPastDates && cell.getTime() < today.getTime();
                const beforeMin =
                  minBound != null && cell.getTime() < minBound.getTime();
                const afterMax =
                  maxBound != null && cell.getTime() > maxBound.getTime();
                const blocked = isPast || beforeMin || afterMax;
                const blockTitle = isPast
                  ? "不能选择过去的日期"
                  : beforeMin
                    ? "不能早于起始日期"
                    : afterMax
                      ? "不能晚于截止日期"
                      : undefined;
                return (
                  <button
                    key={ymd}
                    type="button"
                    disabled={blocked}
                    aria-disabled={blocked}
                    title={blockTitle}
                    onClick={() => {
                      if (blocked) return;
                      onChange(ymd);
                      setOpen(false);
                    }}
                    className={`h-8 rounded-md text-sm transition ${
                      blocked
                        ? "cursor-not-allowed text-[var(--mist)]/35"
                        : isSelected
                          ? "bg-[var(--amber)] text-[var(--on-amber)]"
                          : isToday
                            ? "ring-1 ring-[var(--teal)]/60 text-[var(--paper)] hover:bg-[var(--field-bg)]"
                            : "text-[var(--paper)] hover:bg-[var(--field-bg)]"
                    }`}
                  >
                    {cell.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-between gap-2">
              <div className="flex gap-1">
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm disabled:opacity-30"
                  disabled={
                    (minBound != null && today.getTime() < minBound.getTime()) ||
                    (maxBound != null && today.getTime() > maxBound.getTime())
                  }
                  onClick={() => {
                    if (minBound && today.getTime() < minBound.getTime()) return;
                    if (maxBound && today.getTime() > maxBound.getTime()) return;
                    onChange(formatDueDateInput(today));
                    setOpen(false);
                  }}
                >
                  今天
                </button>
                {clearable ? (
                  <button
                    type="button"
                    className="ui-btn-ghost ui-btn-sm"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                  >
                    清除
                  </button>
                ) : null}
              </div>
              <HoverTip tip="关闭" variant="hint" nestInControl>
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm"
                  onClick={() => setOpen(false)}
                  aria-label="关闭"
                >
                  <IconClose size={13} />
                </button>
              </HoverTip>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className={`relative flex flex-col gap-1 text-xs text-[var(--mist)] ${className}`.trim()}
    >
      <span id={labelId}>{label}</span>
      <input type="hidden" name={name} value={value} />
      <HoverTip tip="选日期" variant="hint" nestInControl className="block w-full">
        <button
          ref={triggerRef}
          type="button"
          aria-labelledby={labelId}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${label}：${formatDisplay(value)}，选日期`}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
          className="auth-field flex w-full items-center justify-between gap-2 !py-1.5 text-left text-sm text-[var(--paper)] disabled:opacity-50"
        >
          <span className="min-w-0 truncate">{formatDisplay(value)}</span>
          <span className="shrink-0 text-[var(--teal)]">
            <IconCalendar size={14} />
          </span>
        </button>
      </HoverTip>
      {popover}
    </div>
  );
}
