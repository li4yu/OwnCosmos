"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteFocusRecordsBatchAction } from "@/app/app/focus/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconActionButton } from "@/components/ui/icon-action";
import { IconTrash } from "@/components/ui/icon-glyphs";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { galleryDetailHref } from "@/lib/gallery-sections";

export type FocusRecordListItem = {
  id: string;
  title: string;
  reflection: string;
  elapsedMs: number;
  endedAt: Date | string | null;
  archiveId: string | null;
};

function formatWhen(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** 专注记录列表：多选 + 批量删除（同步馆藏 / 知识库向量） */
export function FocusRecordsPanel({ items }: { items: FocusRecordListItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function onConfirmDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteFocusRecordsBatchAction(ids);
      if (result.error) {
        setError(result.error);
        setConfirmOpen(false);
        return;
      }
      setSelected(new Set());
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--mist)]">
        尚无专注记录。完成一次正向计时后会出现在这里，并同步进入馆藏。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 text-sm text-[var(--mist)]">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={pending}
          />
          全选
          {selected.size > 0 ? (
            <span className="font-mono text-xs text-[var(--teal)]">
              （{selected.size}）
            </span>
          ) : null}
        </label>
        <IconActionButton
          label={
            selected.size > 0
              ? `删除所选 ${selected.size} 条（含馆藏与知识库向量）`
              : "先勾选要删除的记录"
          }
          className="oc-icon-action--ghost text-[var(--danger)]"
          disabled={pending || selected.size === 0}
          onClick={() => setConfirmOpen(true)}
        >
          <IconTrash size={16} />
        </IconActionButton>
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger,#c45)]">{error}</p>
      ) : null}

      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const href = item.archiveId
            ? galleryDetailHref(item.archiveId)
            : "/app/past/gallery?type=focus_record";
          const checked = selected.has(item.id);
          return (
            <li
              key={item.id}
              className={`flex gap-2 rounded-md border bg-[var(--panel)] px-2 py-2 transition ${
                checked
                  ? "border-[var(--amber)]"
                  : "border-[var(--line)] hover:border-[var(--amber)]/70"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 shrink-0"
                checked={checked}
                disabled={pending}
                onChange={() => toggle(item.id)}
                aria-label={`选择 ${item.title || "专注记录"}`}
              />
              <Link href={href} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm text-[var(--paper)]">
                    {item.title || "专注记录"}
                  </h3>
                  <div className="flex shrink-0 flex-col items-end gap-0.5 font-mono text-xs tracking-wide text-[var(--mist)]">
                    <span>{formatFocusDurationMs(item.elapsedMs)}</span>
                    <time>{formatWhen(item.endedAt)}</time>
                  </div>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-[var(--mist)]">
                  {item.reflection.trim() || "（无心得）"}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        title="删除专注记录？"
        message={`将永久删除所选 ${selected.size} 条专注记录，并同步删除馆藏中的对应归档；若已进知识库（藏忆），也会从向量库移除。此操作不可恢复。`}
        confirmLabel={pending ? "删除中…" : "删除"}
        cancelLabel="取消"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setConfirmOpen(false);
        }}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
