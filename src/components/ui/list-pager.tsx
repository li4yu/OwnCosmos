"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LIST_PAGE_SIZE,
  MAX_LIST_PAGE_SIZE,
  MIN_LIST_PAGE_SIZE,
  clampListPageSize,
  parseListPage,
} from "@/lib/list-paging";

type ListPagerProps = {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
  /** 跳转：页码与页大小（会先做夹紧） */
  onNavigate: (next: { page: number; pageSize: number }) => void;
  /** 无障碍标签前缀 */
  label?: string;
};

/** 列表分页：上一页 / 下一页 + 页码与每页条数可输入 */
export function ListPager({
  page,
  pageSize,
  totalPages,
  total,
  onNavigate,
  label = "分页",
}: ListPagerProps) {
  const [pageInput, setPageInput] = useState(String(page));
  const [sizeInput, setSizeInput] = useState(String(pageSize));

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  useEffect(() => {
    setSizeInput(String(pageSize));
  }, [pageSize]);

  function go(nextPage: number, nextSize = pageSize) {
    const size = clampListPageSize(nextSize);
    const safeTotalPages = Math.max(
      1,
      Math.ceil(total / size) || totalPages,
    );
    const p = Math.min(safeTotalPages, Math.max(1, Math.floor(nextPage)));
    onNavigate({ page: p, pageSize: size });
  }

  function applyInputs() {
    const p = parseListPage(pageInput, page);
    const sizeRaw = Number.parseInt(sizeInput.trim(), 10);
    const size = Number.isFinite(sizeRaw)
      ? clampListPageSize(sizeRaw)
      : clampListPageSize(pageSize || DEFAULT_LIST_PAGE_SIZE);
    go(p, size);
  }

  return (
    <nav
      className="flex flex-wrap items-end gap-2"
      aria-label={label}
    >
      <button
        type="button"
        className="ui-btn-ghost ui-btn-sm"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        上一页
      </button>
      <button
        type="button"
        className="ui-btn-ghost ui-btn-sm"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        下一页
      </button>
      <label className="flex flex-col gap-0.5 text-xs text-[var(--mist)]">
        页码
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyInputs();
          }}
          className="auth-field !w-16 !py-1 text-center text-xs text-[var(--paper)]"
          aria-label="跳转页码"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-xs text-[var(--mist)]">
        每页
        <input
          type="number"
          min={MIN_LIST_PAGE_SIZE}
          max={MAX_LIST_PAGE_SIZE}
          inputMode="numeric"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyInputs();
          }}
          className="auth-field !w-16 !py-1 text-center text-xs text-[var(--paper)]"
          aria-label={`每页条数，${MIN_LIST_PAGE_SIZE}–${MAX_LIST_PAGE_SIZE}`}
        />
      </label>
      <button
        type="button"
        className="ui-btn-primary ui-btn-sm"
        onClick={applyInputs}
      >
        跳转
      </button>
      <p className="pb-1 font-mono text-xs tracking-wide text-[var(--mist)]">
        共 {total} 条 · {page}/{totalPages} 页 · 每页 {pageSize}
        <span className="ml-1 opacity-70">
          （{MIN_LIST_PAGE_SIZE}–{MAX_LIST_PAGE_SIZE}）
        </span>
      </p>
    </nav>
  );
}
