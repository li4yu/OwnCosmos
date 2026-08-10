"use client";

import { useState, useTransition } from "react";
import { searchArchivesForBorrowAction } from "@/app/app/present/actions";

type Hit = {
  id: string;
  title: string;
  body: string;
};

type BorrowMemoryPanelProps = {
  onInsert: (text: string) => void;
};

/** 引用过往：关键词搜馆藏并复制插入正文 */
export function BorrowMemoryPanel({ onInsert }: BorrowMemoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function runSearch() {
    setError(null);
    startTransition(async () => {
      const result = await searchArchivesForBorrowAction(q);
      if (result.error) {
        setError(result.error);
        setHits([]);
        return;
      }
      setHits(result.hits ?? []);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="ui-btn-ghost ui-btn-sm !w-auto shrink-0 self-start"
        onClick={() => setOpen(true)}
      >
        引用过往
      </button>
    );
  }

  return (
    <div className="basis-full max-w-md rounded-md border border-[var(--line)] bg-[var(--field-bg)]/40 p-2.5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--mist)]">检索昔时往并插入（原文不动）</p>
        <button
          type="button"
          className="ui-btn-ghost ui-btn-sm !w-auto"
          onClick={() => setOpen(false)}
        >
          收起
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="关键词"
          className="auth-field !w-auto !max-w-[12rem] !flex-1 !py-1.5 text-sm text-[var(--paper)]"
        />
        <button
          type="button"
          className="ui-btn-primary ui-btn-sm !w-auto"
          disabled={pending || !q.trim()}
          onClick={runSearch}
        >
          {pending ? "检索中…" : "检索"}
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--danger, #c45)]">{error}</p>
      ) : null}
      <ul className="mt-2 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
        {hits.map((h) => (
          <li
            key={h.id}
            className="rounded border border-[var(--line)] px-2 py-1.5"
          >
            <p className="text-sm text-[var(--paper)]">{h.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--mist)]">
              {h.body}
            </p>
            <button
              type="button"
              className="mt-1 text-xs text-[var(--amber)] hover:underline"
              onClick={() => {
                onInsert(h.body.trim());
                setOpen(false);
              }}
            >
              插入全文
            </button>
          </li>
        ))}
        {!pending && hits.length === 0 && q.trim() ? (
          <li className="text-xs text-[var(--mist)]">无匹配馆藏</li>
        ) : null}
      </ul>
    </div>
  );
}
