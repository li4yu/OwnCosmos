"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  deletePlanAction,
  setPlanStatusAction,
} from "@/app/app/future/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PLAN_STATUS_DONE, PLAN_STATUS_OPEN } from "@/db/schema";

type PlanListItemProps = {
  id: string;
  title: string;
  body: string;
  dueLabel: string;
  status: string;
};

export function PlanListItem({
  id,
  title,
  body,
  dueLabel,
  status,
}: PlanListItemProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = status === PLAN_STATUS_DONE;

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

  async function toggleStatus() {
    setPending(true);
    setError(null);
    const next = done ? PLAN_STATUS_OPEN : PLAN_STATUS_DONE;
    const result = await setPlanStatusAction(id, next);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--amber)]">
      <div className="flex items-start gap-3">
        <Link href={`/app/future/plans/${id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3
              className={`text-base text-[var(--paper)] ${done ? "opacity-70 line-through" : ""}`}
            >
              {title}
            </h3>
            <div className="flex shrink-0 flex-col items-end gap-1 font-mono text-[10px] tracking-wide text-[var(--mist)]">
              <time>截止 {dueLabel}</time>
              <span className={done ? "text-[var(--teal)]" : "text-[var(--amber)]"}>
                {done ? "已完成" : "未完成"}
              </span>
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
              void toggleStatus();
            }}
          >
            {done ? "标未完成" : "标完成"}
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
