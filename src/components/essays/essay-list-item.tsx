"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteEssayAction } from "@/app/app/present/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type EssayListItemProps = {
  id: string;
  title: string;
  body: string;
  updatedLabel: string;
};

export function EssayListItem({
  id,
  title,
  body,
  updatedLabel,
}: EssayListItemProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setPending(true);
    setError(null);
    const result = await deleteEssayAction(id);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <li className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 transition hover:border-[var(--amber)]">
      <div className="flex items-start gap-3">
        <Link href={`/app/present/essays/${id}`} className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base text-[var(--paper)]">{title}</h3>
            <time className="shrink-0 font-mono text-[10px] tracking-wide text-[var(--mist)]">
              {updatedLabel}
            </time>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--mist)]">
            {body.trim() || "（无正文）"}
          </p>
        </Link>
        <div className="flex shrink-0 flex-col gap-1.5">
          <Link
            href={`/app/present/essays/${id}`}
            className="ui-btn-ghost ui-btn-sm"
          >
            编辑
          </Link>
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
        title="删除这条随笔？"
        message="流动中的随笔将永久删除，无法恢复。确定删除吗？"
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
