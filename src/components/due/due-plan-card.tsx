"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { completeDuePlanAction } from "@/app/app/present/due/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDueDateInput } from "@/lib/plan-dates";
import { remainingDaysLabel } from "@/lib/due-labels";

type DueCardProps = {
  id: string;
  title: string;
  dueAt: Date;
  daysLeft: number;
  remindDays: number;
};

export function DuePlanCard({
  id,
  title,
  dueAt,
  daysLeft,
  remindDays,
}: DueCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overdue = daysLeft < 0;

  async function confirmComplete() {
    setPending(true);
    setError(null);
    const result = await completeDuePlanAction(id);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <li
      className={`rounded-xl border bg-[var(--panel)] p-4 ${
        overdue
          ? "border-[var(--danger)]/50"
          : "border-[var(--line)] hover:border-[var(--amber)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[var(--teal)]">
            临期帖 · 只读副本
          </p>
          <h3 className="mt-1 text-lg tracking-[0.06em] text-[var(--paper)]">
            {title}
          </h3>
          <p
            className={`mt-2 font-mono text-sm tracking-wide ${
              overdue ? "text-[var(--danger)]" : "text-[var(--amber)]"
            }`}
          >
            {remainingDaysLabel(daysLeft)}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-wide text-[var(--mist)]">
            截止 {formatDueDateInput(dueAt)} · 提前 {remindDays} 天提醒
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            className="ui-btn-primary !w-auto px-4 py-2 text-xs"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            完成
          </button>
          <Link
            href={`/app/future/plans/${id}`}
            className="ui-btn-ghost ui-btn-sm text-center"
          >
            看来日途
          </Link>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <ConfirmDialog
        open={open}
        title="完成及归档？"
        message="将标记完成并沉淀入昔时往拾忆馆藏（规划归档）；来日途「已完成」仍可查看。确定吗？"
        confirmLabel="完成及归档"
        cancelLabel="取消"
        pending={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          void confirmComplete();
        }}
      />
    </li>
  );
}
