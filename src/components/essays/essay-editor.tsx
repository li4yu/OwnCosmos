"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  createEssayAction,
  deleteEssayAction,
  updateEssayAction,
  type EssayActionState,
} from "@/app/app/present/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type EssayEditorProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      essayId: string;
      initialTitle: string;
      initialBody: string;
    };

const initialState: EssayActionState = {};

function emitEssayDirty(dirty: boolean) {
  window.dispatchEvent(
    new CustomEvent("owncosmos:essay-dirty", { detail: { dirty } }),
  );
}

export function EssayEditor(props: EssayEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updateEssayAction.bind(null, props.essayId)
    : createEssayAction;

  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(isEdit ? props.initialTitle : "");
  const [body, setBody] = useState(isEdit ? props.initialBody : "");
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [wasPending, setWasPending] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
      return;
    }
    if (wasPending) {
      if (!state.error) {
        setDirty(false);
        emitEssayDirty(false);
        if (isEdit) setSavedFlash(true);
      }
      setWasPending(false);
    }
  }, [pending, wasPending, state.error, isEdit]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
    setSavedFlash(false);
    emitEssayDirty(true);
  }

  function requestLeave() {
    if (dirty) {
      setLeaveOpen(true);
      return;
    }
    router.push("/app/present/essays");
  }

  async function confirmDelete() {
    if (!isEdit) return;
    setDeletePending(true);
    setDeleteError(null);
    const result = await deleteEssayAction(props.essayId);
    if (result?.error) {
      setDeleteError(result.error);
      setDeletePending(false);
      return;
    }
    emitEssayDirty(false);
    router.push("/app/present/essays");
    router.refresh();
  }

  return (
    <>
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          标题
          <input
            name="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            className="auth-field"
            placeholder="给这条思绪起个名字"
            maxLength={120}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          正文
          <textarea
            name="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              markDirty();
            }}
            rows={14}
            className="auth-field min-h-[280px] resize-y leading-7"
            placeholder="写下此刻……"
          />
        </label>

        {state.error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {state.error}
          </p>
        ) : null}

        {deleteError ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {deleteError}
          </p>
        ) : null}

        {savedFlash && !dirty && !state.error ? (
          <p className="text-sm text-[var(--teal)]" role="status">
            已保存
          </p>
        ) : null}

        {dirty ? (
          <p className="font-mono text-[10px] tracking-wide text-[var(--mist)]">
            有未保存更改；离开页面前请先保存
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className="ui-btn-primary !w-auto px-5">
            {pending ? "保存中…" : isEdit ? "保存" : "创建并保存"}
          </button>
          <button
            type="button"
            onClick={requestLeave}
            className="ui-btn-ghost px-4 py-2.5"
          >
            返回列表
          </button>
          {isEdit ? (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteOpen(true);
              }}
              className="ui-btn-danger ml-auto px-4 py-2.5"
            >
              删除
            </button>
          ) : null}
        </div>
      </form>

      <ConfirmDialog
        open={leaveOpen}
        title="离开编辑？"
        message="有未保存的更改，离开后将丢失。确定返回列表吗？"
        confirmLabel="离开"
        cancelLabel="继续编辑"
        onCancel={() => setLeaveOpen(false)}
        onConfirm={() => {
          setLeaveOpen(false);
          setDirty(false);
          emitEssayDirty(false);
          router.push("/app/present/essays");
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="删除这条随笔？"
        message="流动中的随笔将永久删除，无法恢复。确定删除吗？"
        confirmLabel="删除"
        cancelLabel="取消"
        tone="danger"
        pending={deletePending}
        onCancel={() => {
          if (!deletePending) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </>
  );
}
