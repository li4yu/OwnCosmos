"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  keepArchivesBatchAction,
  wipeArchivesByIdsAction,
} from "@/app/app/past/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ListPager } from "@/components/ui/list-pager";
import { PoeticName } from "@/components/ui/poetic-name";
import {
  ARCHIVE_PAGE_SIZE,
  GALLERY_KEPT_OPTIONS,
  archiveDateRangeError,
  buildArchiveQueryHref,
  isWipeArchiveType,
  type ArchiveTypeOption,
} from "@/lib/archive-query";
import {
  archiveReasonLabel,
  archiveTypeLabel,
} from "@/lib/archive-labels";
import {
  galleryDetailHref,
  type GallerySectionId,
} from "@/lib/gallery-sections";
import { ARCHIVE_TYPE_ESSAY_TOPIC } from "@/db/schema";

type Item = {
  id: string;
  title: string;
  body: string;
  type: string;
  archiveReason: string;
  archivedAt: Date | string;
  inKnowledge: boolean;
  imageUrl?: string | null;
  cycleCount?: number | null;
};

type BatchKind = "keep" | "unkeep" | "wipe";

type ArchiveBatchPanelProps = {
  basePath: string;
  sectionId: GallerySectionId;
  items: Item[];
  total: number;
  page: number;
  pageSize?: number;
  totalPages: number;
  filters: {
    q: string;
    type: string;
    kept: string;
    from: string;
    to: string;
    tag: string;
  };
  /** 仅「全部」分区显示类型下拉 */
  typeOptions?: ArchiveTypeOption[];
  tagOptions?: ArchiveTypeOption[];
  emptyHint: string;
  /** 当前分区是否允许抹忆 */
  allowWipe?: boolean;
  showTypeChip?: boolean;
};

function formatWhen(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ArchiveBatchPanel({
  basePath,
  sectionId,
  items,
  total,
  page,
  pageSize = ARCHIVE_PAGE_SIZE,
  totalPages,
  filters,
  typeOptions,
  tagOptions,
  emptyHint,
  allowWipe = true,
  showTypeChip = true,
}: ArchiveBatchPanelProps) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);
  const [type, setType] = useState(filters.type);
  const [kept, setKept] = useState(filters.kept);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [tag, setTag] = useState(filters.tag);
  const [size, setSize] = useState(pageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [batchKind, setBatchKind] = useState<BatchKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));
  const selectedItems = useMemo(
    () => items.filter((i) => selected.has(i.id)),
    [items, selected],
  );
  const wipeableSelected = selectedItems.filter((i) =>
    isWipeArchiveType(i.type),
  );
  const rangeErr = useMemo(
    () => archiveDateRangeError(from, to),
    [from, to],
  );

  function applyFilters(nextPage = 1, nextSize = size) {
    if (rangeErr) {
      setError(rangeErr);
      setFlash(null);
      return;
    }
    setSelected(new Set());
    setError(null);
    setFlash(null);
    setSize(nextSize);
    router.push(
      buildArchiveQueryHref(basePath, {
        q,
        type: typeOptions ? type : undefined,
        kept,
        from,
        to,
        tag,
        page: nextPage,
        pageSize: nextSize,
      }),
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      if (allIds.every((id) => prev.has(id))) return new Set();
      return new Set(allIds);
    });
  }

  function openBatch(kind: BatchKind) {
    if (selected.size === 0) {
      setError("请先勾选条目");
      return;
    }
    if (kind === "wipe" && wipeableSelected.length === 0) {
      setError("所选条目不可抹忆或不存在");
      return;
    }
    setError(null);
    setBatchKind(kind);
  }

  function runBatch() {
    if (!batchKind) return;
    const ids =
      batchKind === "wipe"
        ? wipeableSelected.map((i) => i.id)
        : [...selected];
    if (ids.length === 0) {
      setError("请先勾选条目");
      setBatchKind(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result =
        batchKind === "wipe"
          ? await wipeArchivesByIdsAction(ids)
          : await keepArchivesBatchAction(ids, batchKind === "keep");
      if (result.error) {
        setError(result.error);
        setBatchKind(null);
        return;
      }
      setBatchKind(null);
      setSelected(new Set());
      const n = result.count ?? ids.length;
      setFlash(
        batchKind === "keep"
          ? `已藏忆 ${n} 条`
          : batchKind === "unkeep"
            ? `已取消藏忆 ${n} 条`
            : `已抹忆 ${n} 条`,
      );
      router.refresh();
    });
  }

  const confirmTitle =
    batchKind === "keep"
      ? "确认藏忆"
      : batchKind === "unkeep"
        ? "确认取消藏忆"
        : "确认抹忆";
  const confirmMessage =
    batchKind === "keep"
      ? `将所选 ${selected.size} 条纳入知识库（图片仍不进入向量侧）。是否继续？`
      : batchKind === "unkeep"
        ? `将把所选 ${selected.size} 条移出知识库（仍保留在馆藏）。是否继续？`
        : `将永久删除所选中可抹的 ${wipeableSelected.length} 条馆藏（含轮期/日课归档、碎片等）。不删除来日途计划与日课本体；打卡次数请用「取消打卡」回退。此操作不可恢复。`;

  return (
    <div className="flex flex-col gap-2">
      <section className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-2.5">
        <p className="font-mono text-[9px] tracking-[0.16em] text-[var(--teal)]">
          查询
        </p>
        <div
          className={`mt-1.5 grid gap-1.5 sm:grid-cols-2 ${
            typeOptions
              ? "lg:grid-cols-3 xl:grid-cols-6"
              : "lg:grid-cols-3 xl:grid-cols-5"
          }`}
        >
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
            标题模糊
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters(1);
              }}
              placeholder="匹配标题关键词"
              className="auth-field !py-1.5 text-sm text-[var(--paper)]"
            />
          </label>
          {typeOptions ? (
            <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
              类型
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="auth-field !py-1.5 text-sm text-[var(--paper)]"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value || "all"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs text-[var(--mist)]">
            是否藏忆
            <select
              value={kept}
              onChange={(e) => setKept(e.target.value)}
              className="auth-field !py-1.5 text-sm text-[var(--paper)]"
            >
              {GALLERY_KEPT_OPTIONS.map((opt) => (
                <option key={opt.value || "kept-all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {tagOptions && tagOptions.length > 0 ? (
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
          <DatePickerField
            name="archivedFrom"
            label="归档起（含）"
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
            name="archivedTo"
            label="归档止（含）"
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
        {rangeErr ? (
          <p className="mt-1.5 text-xs text-[var(--danger, #c45)]">{rangeErr}</p>
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
              setType("");
              setKept("");
              setFrom("");
              setTo("");
              setTag("");
              setSelected(new Set());
              router.push(basePath);
            }}
          >
            清空条件
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--mist)]">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              disabled={items.length === 0}
            />
            本页全选
          </label>
          <button
            type="button"
            className="ui-btn-primary ui-btn-sm"
            disabled={pending || selected.size === 0}
            onClick={() => openBatch("keep")}
          >
            <PoeticName
              name="藏忆所选"
              tip="将所选文本纳入知识库"
            />
            {selected.size > 0 ? `（${selected.size}）` : ""}
          </button>
          <button
            type="button"
            className="ui-btn-ghost ui-btn-sm"
            disabled={pending || selected.size === 0}
            onClick={() => openBatch("unkeep")}
          >
            <PoeticName
              name="取消藏忆"
              tip="从知识库移出；条目仍留在馆藏"
            />
          </button>
          {allowWipe ? (
            <button
              type="button"
              className="ui-btn-danger-solid ui-btn-sm"
              disabled={pending || selected.size === 0}
              onClick={() => openBatch("wipe")}
            >
              <PoeticName
                name="抹忆所选"
                tip="永久删除馆藏条目（含轮期/日课归档、碎片）；不删除来日途计划与日课本体"
              />
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger, #c45)]">{error}</p>
      ) : null}
      {flash ? (
        <p className="text-sm text-[var(--teal)]">{flash}</p>
      ) : null}

      {items.length === 0 ? (
        <section className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
          {emptyHint}
        </section>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1.5"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                aria-label={`选择 ${item.title}`}
              />
              <Link
                href={galleryDetailHref(item.id, sectionId)}
                className="min-w-0 flex-1"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm text-[var(--paper)]">{item.title}</h3>
                  <time className="shrink-0 font-mono text-[10px] text-[var(--mist)]">
                    {formatWhen(item.archivedAt)}
                  </time>
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-2.5 font-mono text-[10px] text-[var(--teal)]">
                  {showTypeChip ? (
                    <span>{archiveTypeLabel(item.type)}</span>
                  ) : null}
                  <span>{archiveReasonLabel(item.archiveReason)}</span>
                  {item.inKnowledge ? <span>已藏忆</span> : <span>未藏忆</span>}
                  {item.type === ARCHIVE_TYPE_ESSAY_TOPIC ? (
                    <span>共 {item.cycleCount ?? 0} 篇</span>
                  ) : null}
                </p>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="mt-1.5 max-h-20 rounded border border-[var(--line)] object-cover"
                  />
                ) : null}
                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--mist)]">
                  {item.type === ARCHIVE_TYPE_ESSAY_TOPIC
                    ? item.body.trim() ||
                      `专题夹 · ${item.cycleCount ?? 0} 篇随笔`
                    : item.body.trim() ||
                      (item.imageUrl ? "（图片碎片）" : "（无正文）")}
                </p>
              </Link>
            </li>
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

      <ConfirmDialog
        open={batchKind !== null}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={
          batchKind === "wipe"
            ? "确认抹忆"
            : batchKind === "unkeep"
              ? "取消藏忆"
              : "确认藏忆"
        }
        tone={batchKind === "wipe" ? "danger" : "default"}
        pending={pending}
        onConfirm={runBatch}
        onCancel={() => setBatchKind(null)}
      />
    </div>
  );
}
