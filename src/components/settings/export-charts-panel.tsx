"use client";

import { useState, useTransition } from "react";
import { exportChartsAction } from "@/app/app/settings/actions";

type Format = "svg" | "json" | "csv";

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 设置 · 图表导出（动态 + 沉淀一览） */
export function ExportChartsPanel() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function onExport(format: Format) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await exportChartsAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "svg") {
        downloadText(
          `owncosmos-charts-${stamp}.svg`,
          result.svg,
          "image/svg+xml;charset=utf-8",
        );
        setMessage(`已下载 SVG · 馆藏 ${result.archiveTotal} 条`);
        return;
      }
      if (format === "json") {
        downloadText(
          `owncosmos-charts-${stamp}.json`,
          result.json,
          "application/json;charset=utf-8",
        );
        setMessage(`已下载 JSON · 馆藏 ${result.archiveTotal} 条`);
        return;
      }
      downloadText(
        `owncosmos-charts-${stamp}.csv`,
        result.csv,
        "text/csv;charset=utf-8",
      );
      setMessage(`已下载 CSV · 馆藏 ${result.archiveTotal} 条`);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs leading-5 text-[var(--mist)]">
        导出首页近七日动态与昔时往沉淀一览（密度 / 类型 / 情绪标记）。SVG
        可直接打开或转 PNG；JSON / CSV 便于备份与制表。
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => onExport("svg")}
          className="ui-btn-primary ui-btn-sm"
        >
          {pending ? "导出中…" : "导出 SVG"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onExport("json")}
          className="ui-btn-ghost ui-btn-sm"
        >
          JSON
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onExport("csv")}
          className="ui-btn-ghost ui-btn-sm"
        >
          CSV
        </button>
      </div>
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
