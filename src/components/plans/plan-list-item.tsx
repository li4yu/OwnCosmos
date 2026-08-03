"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completePlanAction, deletePlanAction } from "@/app/app/future/actions";
import {
  CycleTasksInline,
  type CycleTaskInlineItem,
} from "@/components/plans/cycle-tasks-inline";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { galleryDetailHref } from "@/lib/gallery-sections";

type PlanListItemProps = {
  id: string;
  title: string;
  body: string;
  dueLabel: string | null;
  duePrefix?: string;
  kindLabel?: string;
  locked?: boolean;
  /** 胶囊等：不提供完成归档 */
  allowArchive?: boolean;
  /** 轮期子任务（展示 + 打卡记次）；传入即视为轮期行 */
  tasks?: CycleTaskInlineItem[];
  /** 轮期：是否已到可完成本期日（与首页一致） */
  canCompletePeriod?: boolean;
  /** 轮期：本系列今日是否已滚期/完成（首页「今日已完成」） */
  periodDoneToday?: boolean;
};

/** 未完成计划行：可编辑 / 完成及归档 / 删除 */
export function PlanListItem({
  id,
  title,
  body,
  dueLabel,
  duePrefix = "截止",
  kindLabel,
  locked,
  allowArchive = true,
  tasks,
  canCompletePeriod = true,
  periodDoneToday = false,
}: PlanListItemProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCycle = tasks !== undefined;
  const cycleCompleteReady = !isCycle || canCompletePeriod;
  const cycleDoneToday = isCycle && periodDoneToday && !canCompletePeriod;

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
    <li>
      <div className="flex items-start gap-3">
        <Link href={`/app/future/plans/${id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="oc-scroll__title">{title}</h3>
            <div className="oc-scroll__meta">
              {kindLabel ? <span>{kindLabel}</span> : null}
              {dueLabel ? <time>{duePrefix} {dueLabel}</time> : <span>无截止</span>}
              {locked ? (
                <span className="text-[var(--amber)]">未解锁</span>
              ) : cycleDoneToday ? (
                <span className="text-[var(--teal)]">今日已完成</span>
              ) : isCycle && !canCompletePeriod ? (
                <span className="text-[var(--mist)]">未到期</span>
              ) : (
                <span className="text-[var(--amber)]">未完成</span>
              )}
            </div>
          </div>
          <p className="oc-scroll__body line-clamp-2">
            {locked
              ? "内容将在解锁日揭晓"
              : body.trim() || "（无描述）"}
          </p>
        </Link>
        <div className="oc-scroll__actions flex-col">
          <Link href={`/app/future/plans/${id}`} className="ui-btn-ghost ui-btn-sm">
            {locked ? "查看" : "编辑"}
          </Link>
          {!locked && allowArchive ? (
            <button
              type="button"
              disabled={pending || !cycleCompleteReady}
              className="ui-btn-ghost ui-btn-sm text-[var(--teal)]"
              onClick={() => {
                setError(null);
                setCompleteOpen(true);
              }}
            >
              {isCycle
                ? cycleDoneToday
                  ? "今日已完成"
                  : canCompletePeriod
                    ? "完成本期"
                    : "未到期"
                : "完成及归档"}
            </button>
          ) : null}
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
      {tasks ? <CycleTasksInline planId={id} tasks={tasks} compact /> : null}
      {error ? (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={completeOpen}
        title={isCycle ? "完成本期？" : "完成及归档？"}
        message={
          isCycle
            ? "将计次写入拾忆馆藏·轮期归档，并开启下一期。子任务打卡次数会带到下一期。确定吗？"
            : "将标记完成并沉淀入昔时往拾忆馆藏（规划归档）；来日途「已完成」仍可查看，今时际临期帖不再显示。确定吗？"
        }
        confirmLabel={isCycle ? "完成本期" : "完成及归档"}
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
  dueLabel: string | null;
  archivedLabel: string | null;
  archiveId: string | null;
  kindLabel?: string;
};

/** 已完成计划行：只读回顾，可跳转馆藏 */
export function PlanCompletedListItem({
  title,
  body,
  dueLabel,
  archivedLabel,
  archiveId,
  kindLabel,
}: PlanCompletedItemProps) {
  const href = archiveId
    ? galleryDetailHref(archiveId, "plan-archive")
    : "/app/past/gallery/plan-archive";

  return (
    <li>
      <div className="flex items-start gap-3">
        <Link href={href} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="oc-scroll__title opacity-80 line-through decoration-[var(--mist)]">
              {title}
            </h3>
            <div className="oc-scroll__meta">
              {kindLabel ? <span>{kindLabel}</span> : null}
              {dueLabel ? <time>截止 {dueLabel}</time> : <span>无截止</span>}
              {archivedLabel ? <time>归档 {archivedLabel}</time> : null}
              <span className="text-[var(--teal)]">已完成</span>
            </div>
          </div>
          <p className="oc-scroll__body line-clamp-2">
            {body.trim() || "（无描述）"}
          </p>
        </Link>
        <div className="oc-scroll__actions flex-col">
          <Link href={href} className="ui-btn-ghost ui-btn-sm text-[var(--teal)]">
            看馆藏
          </Link>
        </div>
      </div>
    </li>
  );
}
