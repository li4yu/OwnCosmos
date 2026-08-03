"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EssayListItem } from "@/components/essays/essay-list-item";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ListPager } from "@/components/ui/list-pager";
import {
  ESSAY_PAGE_SIZE,
  buildEssayQueryHref,
} from "@/lib/essay-query";
import { MOOD_OPTIONS, moodDisplay } from "@/lib/moods";

type TagOption = { value: string; label: string };

type Item = {
  id: string;
  title: string;
  body: string;
  updatedLabel: string;
  mood?: string | null;
  tagNames?: string[];
};

type EssayListPanelProps = {
  basePath?: string;
  items: Item[];
  total: number;
  page: number;
  pageSize?: number;
  totalPages: number;
  filters: {
    q: string;
    tag: string;
    mood: string;
    from: string;
    to: string;
  };
  tagOptions: TagOption[];
  emptyHint: string;
  /** 专题列表关闭单篇归档 */
  allowArchive?: boolean;
};

export function EssayListPanel({
  basePath = "/app/present/essays",
  items,
  total,
  page,
  pageSize = ESSAY_PAGE_SIZE,
  totalPages,
  filters,
  tagOptions,
  emptyHint,
  allowArchive = true,
}: EssayListPanelProps) {
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
    if (from > to) return "更新止日期不能早于起日期";
    return null;
  }, [from, to]);

  function applyFilters(nextPage = 1, nextSize = size) {
    if (rangeErr) {
      setError(rangeErr);
      return;
    }
    setError(null);
    setSize(nextSize);
    router.push(
      buildEssayQueryHref(basePath, {
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
          查询
        </p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
            标题 / 正文
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters(1);
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
            name="updatedFrom"
            label="更新起（含）"
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
            name="updatedTo"
            label="更新止（含）"
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
            onClick={() => applyFilters(1)}
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

      {items.length === 0 ? (
        <section className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
          {emptyHint}
        </section>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <EssayListItem
              key={item.id}
              id={item.id}
              title={item.title}
              body={item.body}
              updatedLabel={item.updatedLabel}
              moodLabel={item.mood ? moodDisplay(item.mood) : undefined}
              tagNames={item.tagNames}
              allowArchive={allowArchive}
            />
          ))}
        </ul>
      )}

      <ListPager
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        total={total}
        onNavigate={({ page: nextPage, pageSize: nextSize }) =>
          applyFilters(nextPage, nextSize)
        }
      />
    </div>
  );
}
