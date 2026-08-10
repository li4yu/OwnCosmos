"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createManualMaterialAction,
  deleteMaterialAction,
} from "@/app/app/materials/actions";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ListPager } from "@/components/ui/list-pager";
import {
  MATERIAL_PAGE_SIZE,
  MATERIAL_SOURCE_OPTIONS,
  buildMaterialQueryHref,
} from "@/lib/material-query";

type Item = {
  id: string;
  title: string;
  body: string;
  sourceKind: string;
};

type MaterialsPanelProps = {
  items: Item[];
  total: number;
  page: number;
  pageSize?: number;
  totalPages: number;
  filters: { q: string; source: string; from: string; to: string };
  /** 调取时把正文交给外层（编辑器） */
  onPick?: (body: string) => void;
  emptyHint?: string;
};

const SOURCE_LABEL: Record<string, string> = {
  manual: "手动",
  essay: "随笔",
  archive_item: "馆藏",
  plan: "规划",
};

export function MaterialsPanel({
  items,
  total,
  page,
  pageSize = MATERIAL_PAGE_SIZE,
  totalPages,
  filters,
  onPick,
  emptyHint = "素材匣为空。可从检索结果、随笔或馆藏收藏文字副本。",
}: MaterialsPanelProps) {
  const router = useRouter();
  const basePath = "/app/materials";
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [q, setQ] = useState(filters.q);
  const [source, setSource] = useState(filters.source);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [size, setSize] = useState(pageSize);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rangeErr = useMemo(() => {
    if (!from.trim() || !to.trim()) return null;
    if (from > to) return "收藏止日期不能早于起日期";
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
      buildMaterialQueryHref(basePath, {
        q,
        source,
        from,
        to,
        page: nextPage,
        pageSize: nextSize,
      }),
    );
  }

  function saveManual() {
    setError(null);
    startTransition(async () => {
      const result = await createManualMaterialAction(body, title);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
      setTitle("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteMaterialAction(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--teal)]">
          查询
        </p>
        <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
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
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
            来源
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="auth-field !py-1.5 text-sm text-[var(--paper)]"
            >
              {MATERIAL_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <DatePickerField
            name="createdFrom"
            label="收藏起（含）"
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
            name="createdTo"
            label="收藏止（含）"
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
              setSource("");
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

      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-xs tracking-[0.16em] text-[var(--teal)]">
          新建素材
        </p>
        <div className="mt-1.5 flex flex-col gap-1.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题（可选）"
            className="auth-field !py-1.5 text-sm text-[var(--paper)]"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="粘贴或写下要收藏的文字副本"
            className="auth-field resize-y !py-1.5 text-sm text-[var(--paper)]"
          />
          <button
            type="button"
            className="ui-btn-primary ui-btn-sm w-fit"
            disabled={pending || !body.trim()}
            onClick={saveManual}
          >
            收入素材匣
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
            <li
              key={item.id}
              className="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm text-[var(--paper)]">
                    {item.title || "（无标题）"}
                  </h3>
                  <p className="mt-0.5 font-mono text-xs text-[var(--teal)]">
                    {SOURCE_LABEL[item.sourceKind] ?? item.sourceKind}
                  </p>
                  <p className="mt-0.5 line-clamp-3 text-xs text-[var(--mist)]">
                    {item.body}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {onPick ? (
                    <button
                      type="button"
                      className="ui-btn-ghost ui-btn-sm"
                      onClick={() => onPick(item.body)}
                    >
                      调取
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="ui-btn-ghost ui-btn-sm"
                    disabled={pending}
                    onClick={() => remove(item.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ListPager
        label="素材分页"
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
