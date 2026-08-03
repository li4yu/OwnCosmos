"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PlanCompletedListItem,
  PlanListItem,
} from "@/components/plans/plan-list-item";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ListPager } from "@/components/ui/list-pager";
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
  const [size, setSize] = useState(pageSize);
  const [error, setError] = useState<string | null>(null);

  const rangeErr = useMemo(() => {
    if (!from.trim() || !to.trim()) return null;
    if (from > to) return "截止止日期不能早于起日期";
    return null;
  }, [from, to]);

  function href(
    overrides: { page?: number; cpage?: number; pageSize?: number } = {},
  ) {
    return buildPlanQueryHref(basePath, {
      q,
      tag,
      mood,
      kind,
      from,
      to,
      page: overrides.page,
      cpage: overrides.cpage,
      pageSize: overrides.pageSize ?? size,
    });
  }

  function applyFilters() {
    if (rangeErr) {
      setError(rangeErr);
      return;
    }
    setError(null);
    router.push(href({ page: 1, cpage: 1, pageSize: size }));
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
        <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
          未完成
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
            {open.total}
          </span>
        </h2>
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
        <ListPager
          label="未完成分页"
          page={open.page}
          pageSize={pageSize}
          totalPages={open.totalPages}
          total={open.total}
          onNavigate={({ page: nextPage, pageSize: nextSize }) => {
            setSize(nextSize);
            router.push(
              href({
                page: nextPage,
                cpage: done.page,
                pageSize: nextSize,
              }),
            );
          }}
        />
      </section>

      <section className="flex flex-col gap-1.5">
        <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
          已完成
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
            {done.total}
          </span>
        </h2>
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
        <ListPager
          label="已完成分页"
          page={done.page}
          pageSize={pageSize}
          totalPages={done.totalPages}
          total={done.total}
          onNavigate={({ page: nextCpage, pageSize: nextSize }) => {
            setSize(nextSize);
            router.push(
              href({
                page: open.page,
                cpage: nextCpage,
                pageSize: nextSize,
              }),
            );
          }}
        />
      </section>
    </div>
  );
}
