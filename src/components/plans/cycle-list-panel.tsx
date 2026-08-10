"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ListPager } from "@/components/ui/list-pager";
import { PLAN_PAGE_SIZE, buildPlanQueryHref } from "@/lib/plan-query";

type CycleListPanelProps = {
  basePath?: string;
  total: number;
  page: number;
  totalPages: number;
  pageSize?: number;
  filters: {
    q: string;
    from: string;
    to: string;
  };
  children: ReactNode;
  emptyHint: string;
};

/** 周期计划「进行中」查询条 + 分页壳（列表行由服务端渲染以带打卡） */
export function CycleListPanel({
  basePath = "/app/future/cycles",
  total,
  page,
  totalPages,
  pageSize = PLAN_PAGE_SIZE,
  filters,
  children,
  emptyHint,
}: CycleListPanelProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [size, setSize] = useState(pageSize);
  const [error, setError] = useState<string | null>(null);

  const rangeErr = useMemo(() => {
    if (!from.trim() || !to.trim()) return null;
    if (from > to) return "本期止日期不能早于起日期";
    return null;
  }, [from, to]);

  function apply(nextPage = 1, nextSize = size) {
    if (rangeErr) {
      setError(rangeErr);
      return;
    }
    setError(null);
    setSize(nextSize);
    router.push(
      buildPlanQueryHref(basePath, {
        q,
        from,
        to,
        page: nextPage,
        pageSize: nextSize,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <section className="oc-filter" aria-label="筛选周期计划">
        <div className="oc-filter__head">
          <p className="oc-filter__eyebrow">筛选</p>
          <div className="oc-filter__actions">
            <button
              type="button"
              className="ui-btn-primary ui-btn-sm"
              onClick={() => apply(1)}
            >
              查询
            </button>
            <button
              type="button"
              className="ui-btn-ghost ui-btn-sm"
              onClick={() => {
                setQ("");
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
        <div className="oc-filter__grid sm:grid-cols-2 lg:grid-cols-3">
          <label className="oc-filter__field">
            标题 / 描述
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply(1);
              }}
              placeholder="模糊匹配"
              className="auth-field !py-1.5 text-sm text-[var(--paper)]"
            />
          </label>
          <DatePickerField
            name="dueFrom"
            label="本期起（含）"
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
            label="本期止（含）"
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

      <h2 className="oc-section-label">
        进行中
        <span className="ml-2 font-mono text-xs text-[var(--mist)] font-normal tracking-normal normal-case">
          {total}
        </span>
      </h2>

      {total === 0 ? (
        <div className="oc-empty">{emptyHint}</div>
      ) : (
        children
      )}

      <ListPager
        label="周期计划分页"
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        total={total}
        onNavigate={({ page: nextPage, pageSize: nextSize }) =>
          apply(nextPage, nextSize)
        }
      />
    </div>
  );
}
