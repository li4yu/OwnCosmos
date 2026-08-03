"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  archiveEssayAction,
  deleteEssayAction,
} from "@/app/app/present/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type EssayListItemProps = {
  id: string;
  title: string;
  body: string;
  updatedLabel: string;
  moodLabel?: string;
  tagNames?: string[];
  /** 专题篇不提供单篇归档 */
  allowArchive?: boolean;
};

export function EssayListItem({
  id,
  title,
  body,
  updatedLabel,
  moodLabel,
  tagNames,
  allowArchive = true,
}: EssayListItemProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
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

  async function confirmArchive() {
    setPending(true);
    setError(null);
    const result = await archiveEssayAction(id);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    setArchiveOpen(false);
    router.refresh();
  }

  return (
    <li>
      <div className="flex items-start gap-3">
        <Link href={`/app/present/essays/${id}`} className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="oc-scroll__title">{title}</h3>
            <time className="oc-scroll__meta">{updatedLabel}</time>
          </div>
          {moodLabel || (tagNames && tagNames.length > 0) ? (
            <p className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[11px] text-[var(--teal)]">
              {moodLabel ? <span>{moodLabel}</span> : null}
              {tagNames?.map((name) => (
                <span key={name}>#{name}</span>
              ))}
            </p>
          ) : null}
          <p className="oc-scroll__body line-clamp-2">
            {body.trim() || "（无正文）"}
          </p>
        </Link>
        <div className="oc-scroll__actions flex-col">
          <Link
            href={`/app/present/essays/${id}`}
            className="ui-btn-ghost ui-btn-sm"
          >
            编辑
          </Link>
          {allowArchive ? (
            <button
              type="button"
              className="ui-btn-ghost ui-btn-sm text-[var(--teal)]"
              onClick={() => {
                setError(null);
                setArchiveOpen(true);
              }}
            >
              归档
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
      {error ? (
        <p className="mt-2 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {allowArchive ? (
        <ConfirmDialog
          open={archiveOpen}
          title="归档这条随笔？"
          message="将沉淀入昔时往拾忆馆藏，今时际列表将不再显示。确定归档吗？"
          confirmLabel="归档"
          cancelLabel="取消"
          pending={pending}
          onCancel={() => {
            if (!pending) setArchiveOpen(false);
          }}
          onConfirm={() => {
            void confirmArchive();
          }}
        />
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
