"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PlanCompletedListItem,
  PlanListItem,
} from "@/components/plans/plan-list-item";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { MOOD_OPTIONS, moodDisplay } from "@/lib/moods";
import {
  PLAN_LIST_KIND_OPTIONS,
  PLAN_PAGE_SIZE,
  buildPlanQueryHref,
} from "@/lib/plan-query";

type TagOption = { value: string; label: string };

type OpenItem = {
  id: string;
  title: string;
  body: string;
  dueLabel: string | null;
  kindLabel: string;
  mood?: string | null;
  tagNames?: string[];
};

type DoneItem = OpenItem & {
  archivedLabel: string | null;
  archiveId: string | null;
};

type Filters = {
  q: string;
  tag: string;
  mood: string;
  kind: string;
  from: string;
  to: string;
};

type PlanListPanelProps = {
  basePath?: string;
  open: {
    items: OpenItem[];
    total: number;
    page: number;
    totalPages: number;
  };
  done: {
    items: DoneItem[];
    total: number;
    page: number;
    totalPages: number;
  };
  pageSize?: number;
  filters: Filters;
  tagOptions: TagOption[];
};

export function PlanListPanel({
  basePath = "/app/future/plans",
  open,
  done,
  pageSize = PLAN_PAGE_SIZE,
  filters,
  tagOptions,
}: PlanListPanelProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [tag, setTag] = useState(filters.tag);
  const [mood, setMood] = useState(filters.mood);
  const [kind, setKind] = useState(filters.kind);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [error, setError] = useState<string | null>(null);

  const rangeErr = useMemo(() => {
    if (!from.trim() || !to.trim()) return null;
    if (from > to) return "截止止日期不能早于起日期";
    return null;
  }, [from, to]);

  function href(overrides: { page?: number; cpage?: number } = {}) {
    return buildPlanQueryHref(basePath, {
      q,
      tag,
      mood,
      kind,
      from,
      to,
      page: overrides.page,
      cpage: overrides.cpage,
    });
  }

  function applyFilters() {
    if (rangeErr) {
      setError(rangeErr);
      return;
    }
    setError(null);
    router.push(href({ page: 1, cpage: 1 }));
  }

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          查询
        </p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
            标题 / 描述
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="模糊匹配"
              className="auth-field !py-1.5 text-sm text-[var(--paper)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
            类型
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="auth-field !py-1.5 text-sm text-[var(--paper)]"
            >
              {PLAN_LIST_KIND_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {tagOptions.length > 0 ? (
            <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
              绪签
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="auth-field !py-1.5 text-sm text-[var(--paper)]"
              >
                <option value="">绪签不限</option>
                {tagOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
            心情
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="auth-field !py-1.5 text-sm text-[var(--paper)]"
            >
              <option value="">心情不限</option>
              {MOOD_OPTIONS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.emoji} {m.label}
                </option>
              ))}
            </select>
          </label>
          <DatePickerField
            name="dueFrom"
            label="截止起（含）"
            value={from}
            onChange={(next) => {
              setFrom(next);
              setError(null);
            }}
            allowPastDates
            clearable
            maxDate={to || undefined}
          />
          <DatePickerField
            name="dueTo"
            label="截止止（含）"
            value={to}
            onChange={(next) => {
              setTo(next);
              setError(null);
            }}
            allowPastDates
            clearable
            minDate={from || undefined}
          />
        </div>
        {rangeErr || error ? (
          <p className="mt-1.5 text-xs text-[var(--danger, #c45)]">
            {error || rangeErr}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            className="ui-btn-primary ui-btn-sm"
            onClick={applyFilters}
          >
            查询
          </button>
          <button
            type="button"
            className="ui-btn-ghost ui-btn-sm"
            onClick={() => {
              setQ("");
              setTag("");
              setMood("");
              setKind("");
              setFrom("");
              setTo("");
              setError(null);
              router.push(basePath);
            }}
          >
            清空条件
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
            未完成
            <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
              {open.total}
            </span>
          </h2>
          <p className="font-mono text-[9px] text-[var(--mist)]">
            第 {open.page}/{open.totalPages} 页 · 每页 {pageSize}
          </p>
        </div>
        {open.items.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
            暂无符合条件的未完成计划。
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {open.items.map((item) => (
              <PlanListItem
                key={item.id}
                id={item.id}
                title={item.title}
                body={item.body}
                dueLabel={item.dueLabel}
                kindLabel={
                  [
                    item.kindLabel,
                    item.mood ? moodDisplay(item.mood) : "",
                    ...(item.tagNames?.map((n) => `#${n}`) ?? []),
                  ]
                    .filter(Boolean)
                    .join(" · ") || item.kindLabel
                }
              />
            ))}
          </ul>
        )}
        {open.totalPages > 1 ? (
          <nav className="flex flex-wrap gap-2" aria-label="未完成分页">
            <Link
              href={buildPlanQueryHref(basePath, {
                ...filters,
                page: Math.max(1, open.page - 1),
                cpage: done.page,
              })}
              className={`ui-btn-ghost ui-btn-sm ${open.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              上一页
            </Link>
            <Link
              href={buildPlanQueryHref(basePath, {
                ...filters,
                page: Math.min(open.totalPages, open.page + 1),
                cpage: done.page,
              })}
              className={`ui-btn-ghost ui-btn-sm ${open.page >= open.totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              下一页
            </Link>
          </nav>
        ) : null}
      </section>

      <section className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
            已完成
            <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
              {done.total}
            </span>
          </h2>
          <p className="font-mono text-[9px] text-[var(--mist)]">
            第 {done.page}/{done.totalPages} 页 · 每页 {pageSize}
          </p>
        </div>
        {done.items.length === 0 ? (
          <div className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
            暂无符合条件的已完成计划。
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {done.items.map((item) => (
              <PlanCompletedListItem
                key={item.id}
                id={item.id}
                title={item.title}
                body={item.body}
                dueLabel={item.dueLabel}
                archivedLabel={item.archivedLabel}
                archiveId={item.archiveId}
                kindLabel={
                  [
                    item.kindLabel,
                    item.mood ? moodDisplay(item.mood) : "",
                    ...(item.tagNames?.map((n) => `#${n}`) ?? []),
                  ]
                    .filter(Boolean)
                    .join(" · ") || item.kindLabel
                }
              />
            ))}
          </ul>
        )}
        {done.totalPages > 1 ? (
          <nav className="flex flex-wrap gap-2" aria-label="已完成分页">
            <Link
              href={buildPlanQueryHref(basePath, {
                ...filters,
                page: open.page,
                cpage: Math.max(1, done.page - 1),
              })}
              className={`ui-btn-ghost ui-btn-sm ${done.page <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              上一页
            </Link>
            <Link
              href={buildPlanQueryHref(basePath, {
                ...filters,
                page: open.page,
                cpage: Math.min(done.totalPages, done.page + 1),
              })}
              className={`ui-btn-ghost ui-btn-sm ${done.page >= done.totalPages ? "pointer-events-none opacity-40" : ""}`}
            >
              下一页
            </Link>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
