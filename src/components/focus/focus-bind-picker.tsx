"use client";

import { useEffect, useId, useRef, useState } from "react";

export type FocusBindPickerOption = {
  value: string;
  label: string;
  group: "habit" | "plan" | "cycle";
};

type FocusBindPickerProps = {
  value: string;
  options: FocusBindPickerOption[];
  onChange: (value: string) => void;
};

const GROUP_LABEL: Record<FocusBindPickerOption["group"], string> = {
  habit: "未完成日课",
  plan: "未完成规划",
  cycle: "今日轮期",
};

/** 凝时绑定目标：主题下拉（避免系统原生 select 白底） */
export function FocusBindPicker({
  value,
  options,
  onChange,
}: FocusBindPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected ? selected.label : "不绑定";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    onChange(next);
    setOpen(false);
  }

  const groups: FocusBindPickerOption["group"][] = ["habit", "plan", "cycle"];

  return (
    <div ref={rootRef} className="focus-bind">
      <p className="focus-bind__label">绑定来日途目标（可选）</p>
      <button
        type="button"
        className={`focus-bind__trigger ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="focus-bind__value">{triggerLabel}</span>
        <span className="focus-bind__chevron" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="绑定来日途目标"
          className="focus-bind__menu"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={`focus-bind__option ${!value ? "is-selected" : ""}`}
            onClick={() => pick("")}
          >
            不绑定
          </button>
          {groups.map((group) => {
            const items = options.filter((o) => o.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group} className="focus-bind__group">
                <p className="focus-bind__group-label">{GROUP_LABEL[group]}</p>
                {items.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={value === o.value}
                    className={`focus-bind__option ${value === o.value ? "is-selected" : ""}`}
                    onClick={() => pick(o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            );
          })}
          {options.length === 0 ? (
            <p className="focus-bind__empty">暂无可绑目标</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
