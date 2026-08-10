"use client";

import { useEffect, useId } from "react";

type NoticeDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
};

/** 主题适配提示小窗（单按钮，用于校验说明） */
export function NoticeDialog({
  open,
  title = "提示",
  message,
  confirmLabel = "知道了",
  onClose,
}: NoticeDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-[360px] rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--dialog-shadow)]"
      >
        <p className="font-mono text-xs tracking-[0.2em] text-[var(--teal)]">
          NOTICE
        </p>
        <h2
          id={titleId}
          className="mt-1 text-lg tracking-[0.1em] text-[var(--paper)]"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mist)]">{message}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-primary !w-auto px-5"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
