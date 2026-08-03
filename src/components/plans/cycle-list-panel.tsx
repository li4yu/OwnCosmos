"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ListPager } from "@/components/ui/list-pager";
import { MOOD_OPTIONS } from "@/lib/moods";
import { PLAN_PAGE_SIZE, buildPlanQueryHref } from "@/lib/plan-query";

type TagOption = { value: string; label: string };

type CycleListPanelProps = {
  basePath?: string;
  total: number;
  page: number;
  totalPages: number;
  pageSize?: number;
  filters: {
    q: string;
    tag: string;
    mood: string;
    from: string;
    to: string;
  };
  tagOptions: TagOption[];
  children: ReactNode;
  emptyHint: string;
};

/** 轮期「进行中」查询条 + 分页壳（列表行由服务端渲染以带打卡） */
export function CycleListPanel({
  basePath = "/app/future/cycles",
  total,
  page,
  totalPages,
  pageSize = PLAN_PAGE_SIZE,
  filters,
  tagOptions,
  children,
  emptyHint,
}: CycleListPanelProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [tag, setTag] = useState(filters.tag);
  const [mood, setMood] = useState(filters.mood);
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
        tag,
        mood,
        from,
        to,
        page: nextPage,
        pageSize: nextSize,
      }),
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          查询进行中
        </p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
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
          <p className="mt-1.5 text-xs text-[var(--danger, #c45)]">
            {error || rangeErr}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
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
              setTag("");
              setMood("");
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

      <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
        进行中
        <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
          {total}
        </span>
      </h2>

      {total === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
          {emptyHint}
        </div>
      ) : (
        children
      )}

      <ListPager
        label="轮期分页"
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
