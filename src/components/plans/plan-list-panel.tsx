"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  PlanCompletedListItem,
  PlanListItem,
} from "@/components/plans/plan-list-item";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ListPager } from "@/components/ui/list-pager";
import {
  PLAN_LIST_KIND_OPTIONS,
  PLAN_PAGE_SIZE,
  buildPlanQueryHref,
} from "@/lib/plan-query";

type OpenItem = {
  id: string;
  title: string;
  body: string;
  dueLabel: string | null;
  kindLabel: string;
};

type DoneItem = OpenItem & {
  archivedLabel: string | null;
  archiveId: string | null;
};

type Filters = {
  q: string;
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
};

export function PlanListPanel({
  basePath = "/app/future/plans",
  open,
  done,
  pageSize = PLAN_PAGE_SIZE,
  filters,
}: PlanListPanelProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
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
      <section className="oc-filter" aria-label="筛选规划">
        <div className="oc-filter__head">
          <p className="oc-filter__eyebrow">筛选</p>
          <div className="oc-filter__actions">
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
                setKind("");
                setFrom("");
                setTo("");
                setError(null);
                router.push(basePath);
              }}
            >
              清空
            </button>
          </div>
        </div>
        <div className="oc-filter__grid sm:grid-cols-2 lg:grid-cols-4">
          <label className="oc-filter__field">
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
          <label className="oc-filter__field">
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
          <p className="oc-filter__hint">{error || rangeErr}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="oc-section-label">
          未完成
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)] font-normal tracking-normal normal-case">
            {open.total}
          </span>
        </h2>
        {open.items.length === 0 ? (
          <div className="oc-empty">暂无符合条件的未完成计划。</div>
        ) : (
          <ul className="oc-scroll">
            {open.items.map((item) => (
              <PlanListItem
                key={item.id}
                id={item.id}
                title={item.title}
                body={item.body}
                dueLabel={item.dueLabel}
                kindLabel={item.kindLabel}
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

      <section className="flex flex-col gap-3">
        <h2 className="oc-section-label">
          已完成
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)] font-normal tracking-normal normal-case">
            {done.total}
          </span>
        </h2>
        {done.items.length === 0 ? (
          <div className="oc-empty">暂无符合条件的已完成计划。</div>
        ) : (
          <ul className="oc-scroll">
            {done.items.map((item) => (
              <PlanCompletedListItem
                key={item.id}
                id={item.id}
                title={item.title}
                body={item.body}
                dueLabel={item.dueLabel}
                archivedLabel={item.archivedLabel}
                archiveId={item.archiveId}
                kindLabel={item.kindLabel}
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
