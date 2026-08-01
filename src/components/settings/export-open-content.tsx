"use client";

import { useState, useTransition } from "react";
import { exportOpenContentAction } from "@/app/app/settings/actions";

/** 导出未归档随笔 / 进行中计划为 .txt */
export function ExportOpenContent() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onExport() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await exportOpenContentAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const blob = new Blob([result.text], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `owncosmos-export-${stamp}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(
        `已下载：随笔 ${result.essayCount} · 计划 ${result.planCount}`,
      );
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs leading-5 text-[var(--mist)]">
        导出当前未归档的流思笺，以及进行中的规划正文为纯文本文件。
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={onExport}
        className="ui-btn-primary ui-btn-sm w-fit"
      >
        {pending ? "导出中…" : "导出文本"}
      </button>
      {error ? (
        <p className="text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-xs text-[var(--teal)]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
