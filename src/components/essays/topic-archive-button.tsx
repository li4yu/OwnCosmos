"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { archiveEssayFolderAction } from "@/app/app/present/essay-folder-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type TopicArchiveButtonProps = {
  folderId: string;
  folderName: string;
  activeCount: number;
};

/** 专题详情顶栏：整专题归档 */
export function TopicArchiveButton({
  folderId,
  folderName,
  activeCount,
}: TopicArchiveButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    const result = await archiveEssayFolderAction(folderId);
    setPending(false);
    if (result.error) {
      setError(result.error);
      setOpen(false);
      return;
    }
    setOpen(false);
    router.push("/app/past/gallery/essay-topic");
    router.refresh();
  }

  return (
    <>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex gap-1.5">
          <Link
            href={`/app/present/essays/topics/${folderId}/new`}
            className="ui-btn-primary ui-btn-sm"
          >
            新建
          </Link>
          <button
            type="button"
            className="ui-btn-ghost ui-btn-sm text-[var(--teal)]"
            disabled={activeCount === 0}
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
          >
            归档专题
          </button>
        </div>
        {error ? (
          <p className="text-xs text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={open}
        title="归档整个专题？"
        message={`将把专题「${folderName}」中的 ${activeCount} 篇随笔归档为一条「专题归档」夹进馆藏，并移除该专题夹。确定吗？`}
        confirmLabel="归档专题"
        cancelLabel="取消"
        pending={pending}
        onCancel={() => {
          if (!pending) setOpen(false);
        }}
        onConfirm={() => {
          void confirm();
        }}
      />
    </>
  );
}
