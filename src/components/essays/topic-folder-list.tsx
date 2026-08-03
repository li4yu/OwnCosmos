"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  archiveEssayFolderAction,
  createEssayFolderAction,
  deleteEssayFolderAction,
} from "@/app/app/present/essay-folder-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Folder = {
  id: string;
  name: string;
  body: string;
  activeCount: number;
};

export function TopicFolderList({ folders }: { folders: Folder[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Folder | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await createEssayFolderAction(name);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setName("");
    if (result.id) {
      router.push(`/app/present/essays/topics/${result.id}`);
      router.refresh();
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPending(true);
    setError(null);
    const result = await deleteEssayFolderAction(deleteTarget.id);
    setPending(false);
    if (result.error) {
      setError(result.error);
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    router.refresh();
  }

  async function confirmArchive() {
    if (!archiveTarget) return;
    setPending(true);
    setError(null);
    const result = await archiveEssayFolderAction(archiveTarget.id);
    setPending(false);
    if (result.error) {
      setError(result.error);
      setArchiveTarget(null);
      return;
    }
    setArchiveTarget(null);
    router.push("/app/past/gallery/essay-topic");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(e) => void onCreate(e)}
        className="oc-filter flex flex-wrap items-end gap-2 pb-3"
      >
        <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-[var(--mist)]">
          新建专题
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-field"
            placeholder="例如：工作、读书笔记"
            maxLength={80}
            disabled={pending}
          />
        </label>
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="ui-btn-primary ui-btn-sm shrink-0"
        >
          {pending ? "创建中…" : "创建"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      {folders.length === 0 ? (
        <p className="oc-empty">还没有专题。建一个夹，再往里面写相关随笔。</p>
      ) : (
        <ul className="oc-scroll">
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-2">
              <Link
                href={`/app/present/essays/topics/${folder.id}`}
                className="min-w-0 flex-1"
              >
                <p className="oc-scroll__title truncate text-[1rem]">
                  {folder.name}
                </p>
                <p className="oc-scroll__body">
                  {folder.activeCount} 篇
                  {folder.body ? ` · ${folder.body}` : ""}
                </p>
              </Link>
              <div className="oc-scroll__actions">
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm shrink-0 text-[var(--teal)]"
                  disabled={pending || folder.activeCount === 0}
                  onClick={() => setArchiveTarget(folder)}
                >
                  归档
                </button>
                <button
                  type="button"
                  className="ui-btn-ghost ui-btn-sm shrink-0 text-[var(--danger)]"
                  disabled={pending}
                  onClick={() => setDeleteTarget(folder)}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="归档整个专题？"
        message={
          archiveTarget
            ? `将把专题「${archiveTarget.name}」中的 ${archiveTarget.activeCount} 篇随笔沉淀为一条「专题归档」夹进馆藏，并移除该专题夹。单篇不可单独归档。确定吗？`
            : ""
        }
        confirmLabel="归档专题"
        cancelLabel="取消"
        pending={pending}
        onCancel={() => {
          if (!pending) setArchiveTarget(null);
        }}
        onConfirm={() => {
          void confirmArchive();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这个专题？"
        message={
          deleteTarget
            ? `将删除专题「${deleteTarget.name}」，并同时删除其中 ${deleteTarget.activeCount} 篇随笔（不可恢复）。若要保留内容请先「归档专题」。`
            : ""
        }
        confirmLabel="删除专题"
        cancelLabel="取消"
        tone="danger"
        pending={pending}
        onCancel={() => {
          if (!pending) setDeleteTarget(null);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </div>
  );
}
