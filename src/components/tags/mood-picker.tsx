"use client";

import { MOOD_OPTIONS, type MoodKey } from "@/lib/moods";

type MoodPickerProps = {
  name?: string;
  value: string;
  onChange: (next: string) => void;
  label?: string;
};

/** 固定心情 + emoji 表情库 */
export function MoodPicker({
  name = "mood",
  value,
  onChange,
  label = "心情",
}: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[var(--mist)]">{label}</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className={`rounded-md border px-2 py-1 text-xs transition ${
            !value
              ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--paper)]"
              : "border-[var(--line)] text-[var(--mist)] hover:border-[var(--mist)]"
          }`}
          onClick={() => onChange("")}
        >
          未选
        </button>
        {MOOD_OPTIONS.map((m) => {
          const active = value === m.key;
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={active}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
                active
                  ? "border-[var(--amber)] bg-[var(--amber)]/15 text-[var(--paper)]"
                  : "border-[var(--line)] text-[var(--mist)] hover:border-[var(--mist)]"
              }`}
              onClick={() => onChange(m.key as MoodKey)}
            >
              <span aria-hidden>{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
