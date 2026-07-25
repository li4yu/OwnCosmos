"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completePlanAction, deletePlanAction } from "@/app/app/future/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { galleryDetailHref } from "@/lib/gallery-sections";

type PlanListItemProps = {
  id: string;
  title: string;
  body: string;
  dueLabel: string;
};

/** 未完成计划行：可编辑 / 完成及归档 / 删除 */
export function PlanListItem({
  id,
  title,
  body,
  dueLabel,
}: PlanListItemProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setPending(true);
    setError(null);
    const result = await deletePlanAction(id);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setDeleteOpen(false);
    router.refresh();
  }

  async function confirmComplete() {
    setPending(true);
    setError(null);
    const result = await completePlanAction(id);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setCompleteOpen(false);
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--amber)]">
      <div className="flex items-start gap-3">
        <Link href={`/app/future/plans/${id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base text-[var(--paper)]">{title}</h3>
            <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px] tracking-wide text-[var(--mist)]">
              <time>截止 {dueLabel}</time>
              <span className="text-[var(--amber)]">未完成</span>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--mist)]">
            {body.trim() || "（无描述）"}
          </p>
        </Link>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Link href={`/app/future/plans/${id}`} className="ui-btn-ghost ui-btn-sm">
            编辑
          </Link>
          <button
            type="button"
            disabled={pending}
            className="ui-btn-ghost ui-btn-sm text-[var(--teal)]"
            onClick={() => {
              setError(null);
              setCompleteOpen(true);
            }}
          >
            完成及归档
          </button>
          <button
            type="button"
            className="ui-btn-danger ui-btn-sm"
            onClick={() => {
              setError(null);
              setDeleteOpen(true);
            }}
          >
            删除
          </button>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={completeOpen}
        title="完成及归档？"
        message="将标记完成并沉淀入昔时往拾忆馆藏（规划归档）；来日途「已完成」仍可查看，今时际临期帖不再显示。确定吗？"
        confirmLabel="完成及归档"
        cancelLabel="取消"
        pending={pending}
        onCancel={() => {
          if (!pending) setCompleteOpen(false);
        }}
        onConfirm={() => {
          void confirmComplete();
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="删除这条计划？"
        message="未归档的计划将永久删除，无法恢复。确定删除吗？"
        confirmLabel="删除"
        cancelLabel="取消"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </li>
  );
}

type PlanCompletedItemProps = {
  id: string;
  title: string;
  body: string;
  dueLabel: string;
  archivedLabel: string | null;
  archiveId: string | null;
};

/** 已完成计划行：只读回顾，可跳转馆藏 */
export function PlanCompletedListItem({
  title,
  body,
  dueLabel,
  archivedLabel,
  archiveId,
}: PlanCompletedItemProps) {
  const href = archiveId
    ? galleryDetailHref(archiveId, "plan-archive")
    : "/app/past/gallery/plan-archive";

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--panel)]/70 p-4">
      <div className="flex items-start gap-3">
        <Link href={href} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base text-[var(--paper)] opacity-80 line-through decoration-[var(--mist)]">
              {title}
            </h3>
            <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px] tracking-wide text-[var(--mist)]">
              <time>截止 {dueLabel}</time>
              {archivedLabel ? <time>归档 {archivedLabel}</time> : null}
              <span className="text-[var(--teal)]">已完成</span>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--mist)]">
            {body.trim() || "（无描述）"}
          </p>
        </Link>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Link href={href} className="ui-btn-ghost ui-btn-sm text-[var(--teal)]">
            看馆藏
          </Link>
        </div>
      </div>
    </li>
  );
}
