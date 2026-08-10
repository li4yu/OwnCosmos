"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteFragmentAction } from "@/app/app/past/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PoeticName } from "@/components/ui/poetic-name";

type FragmentActionsProps = {
  itemId: string;
};

export function FragmentActions({ itemId }: FragmentActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteFragmentAction(itemId);
      if (result.error) {
        setError(result.error);
        setOpen(false);
        return;
      }
      router.push("/app/past/gallery");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/app/past/gallery/memory-fragment/${itemId}/edit`}
          className="ui-btn-ghost ui-btn-sm"
        >
          编辑
        </Link>
        <button
          type="button"
          className="ui-btn-danger ui-btn-sm"
          onClick={() => setOpen(true)}
        >
          <PoeticName name="删除碎片" tip="永久删除这条你上传的记忆碎片" />
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-[var(--danger, #c45)]">{error}</p>
      ) : null}
      <ConfirmDialog
        open={open}
        title="删除记忆碎片"
        message="删除后不可恢复。确定抹去这条碎片吗？"
        confirmLabel="删除"
        tone="danger"
        pending={pending}
        onConfirm={onDelete}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
