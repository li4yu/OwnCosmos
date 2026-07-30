"use client";

import { useEffect, useId, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  hint?: string;
  confirmLabel?: string;
  initialNote?: string;
  pending?: boolean;
  onConfirm: (note: string) => void;
  onCancel: () => void;
};

/** 首页快捷打卡：写心得小窗 */
export function CheckinNoteDialog({
  open,
  title,
  hint = "一句心得，可留空直接打卡",
  confirmLabel = "打卡",
  initialNote = "",
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    if (open) setNote(initialNote);
  }, [open, initialNote]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
        disabled={pending}
        onClick={() => {
          if (!pending) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-[400px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)]"
      >
        <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--teal)]">
          CHECK-IN
        </p>
        <h2
          id={titleId}
          className="mt-1 text-lg tracking-[0.1em] text-[var(--paper)]"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--mist)]">{hint}</p>
        <label className="mt-4 flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          心得
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={200}
            disabled={pending}
            autoFocus
            className="auth-field min-h-[5rem] resize-y leading-6"
            placeholder="今天练得怎样…"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="ui-btn-ghost px-4 py-2"
          >
            取消
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(note)}
            className="ui-btn-primary !w-auto px-5"
          >
            {pending ? "提交中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
