"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { HoverTip } from "@/components/ui/hover-tip";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
  hint?: string;
};

type SelectFieldProps<T extends string> = {
  value: T;
  options: SelectOption<T>[];
  onChange: (next: T) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** 选项行右侧操作（如删除）；点击不触发选中 */
  optionAction?: {
    label: string;
    onClick: (value: T) => void;
    icon?: ReactNode;
  };
};

type PopPos = { top: number; left: number; width: number };

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 7V5.8c0-.7.5-1.3 1.2-1.3h3.6c.7 0 1.2.6 1.2 1.3V7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M6.5 7l.8 12.2c.1.8.7 1.3 1.5 1.3h6.4c.8 0 1.4-.5 1.5-1.3L17.5 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** 主题适配下拉：替代原生 select 白底白字系统菜单 */
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled = false,
  className = "",
  optionAction,
}: SelectFieldProps<T>) {
  const labelId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopPos | null>(null);
  const [mounted, setMounted] = useState(false);

  const current = options.find((o) => o.value === value) ?? options[0];
  const hasAction = Boolean(optionAction);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    function update() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(Math.max(rect.width, hasAction ? 220 : 180), 320);
      const popH = popRef.current?.offsetHeight ?? 200;
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
  }, [open, options.length, hasAction]);

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

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popRef}
            id={listId}
            role="listbox"
            aria-label={label || "选择"}
            className="fixed z-[80] max-h-[240px] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[var(--dialog-shadow)]"
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
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <div
                  key={opt.value}
                  className={`flex items-center gap-0.5 rounded-md transition ${
                    active
                      ? "bg-[var(--amber-soft)] text-[var(--amber)]"
                      : "text-[var(--paper)] hover:bg-[var(--ink)]"
                  }`}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className="min-w-0 flex-1 flex flex-col px-2.5 py-2 text-left"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate text-sm tracking-[0.04em]">
                      {opt.label}
                    </span>
                    {opt.hint ? (
                      <span className="mt-0.5 text-xs text-[var(--mist)]">
                        {opt.hint}
                      </span>
                    ) : null}
                  </button>
                  {optionAction ? (
                    <HoverTip
                      tip={optionAction.label}
                      variant="hint"
                      nestInControl
                      className="mr-1 inline-flex"
                    >
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--mist)] transition hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] hover:text-[var(--danger)]"
                        aria-label={`${optionAction.label}：${opt.label}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpen(false);
                          optionAction.onClick(opt.value);
                        }}
                      >
                        {optionAction.icon ?? <TrashIcon />}
                      </button>
                    </HoverTip>
                  ) : null}
                </div>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={`flex flex-col gap-1 ${className}`}>
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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        className="flex items-center justify-between gap-2 rounded border border-[var(--line)] bg-[var(--field-bg)] px-2 py-1.5 text-left text-sm text-[var(--paper)] transition hover:border-[var(--amber)] disabled:opacity-50"
      >
        <span className="min-w-0 truncate">{current?.label ?? "请选择"}</span>
        <span className="shrink-0 font-mono text-xs text-[var(--mist)]">
          ▾
        </span>
      </button>
      {popover}
    </div>
  );
}
