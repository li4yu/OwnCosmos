"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  createPlanAction,
  deletePlanAction,
  setPlanStatusAction,
  updatePlanAction,
  type PlanActionState,
} from "@/app/app/future/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { PLAN_STATUS_DONE, PLAN_STATUS_OPEN } from "@/db/schema";
import { formatDueDateInput } from "@/lib/plan-dates";

type PlanEditorProps =
  | { mode: "create" }
  | {
      mode: "edit";
      planId: string;
      initialTitle: string;
      initialBody: string;
      initialDueAt: Date;
      initialStatus: string;
      justCreated?: boolean;
    };

const initialState: PlanActionState = {};

function emitDirty(dirty: boolean) {
  window.dispatchEvent(
    new CustomEvent("owncosmos:essay-dirty", { detail: { dirty } }),
  );
}

export function PlanEditor(props: PlanEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const action = isEdit
    ? updatePlanAction.bind(null, props.planId)
    : createPlanAction;

  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(isEdit ? props.initialTitle : "");
  const [body, setBody] = useState(isEdit ? props.initialBody : "");
  const [dueAt, setDueAt] = useState(
    isEdit
      ? formatDueDateInput(props.initialDueAt)
      : formatDueDateInput(new Date()),
  );
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(
    () => isEdit && Boolean(props.justCreated),
  );
  const [wasPending, setWasPending] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [status, setStatus] = useState(
    isEdit ? props.initialStatus : PLAN_STATUS_OPEN,
  );

  useEffect(() => {
    if (props.mode !== "edit") return;
    emitDirty(false);
    if (props.justCreated) {
      router.replace(`/app/future/plans/${props.planId}`, { scroll: false });
    }
  }, [props, router]);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
      return;
    }
    if (!wasPending) return;
    setWasPending(false);
    if (state.error) return;

    setDirty(false);
    emitDirty(false);

    if (!isEdit && state.createdId) {
      router.push(`/app/future/plans/${state.createdId}?saved=1`);
      router.refresh();
      return;
    }
    if (isEdit) setSavedFlash(true);
  }, [pending, wasPending, state.error, state.createdId, isEdit, router]);

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
    emitDirty(true);
  }

  function requestLeave() {
    if (dirty) {
      setLeaveOpen(true);
      return;
    }
    router.push("/app/future/plans");
  }

  async function confirmDelete() {
    if (!isEdit) return;
    setActionPending(true);
    setActionError(null);
    const result = await deletePlanAction(props.planId);
    if (result?.error) {
      setActionError(result.error);
      setActionPending(false);
      return;
    }
    emitDirty(false);
    router.push("/app/future/plans");
    router.refresh();
  }

  async function toggleStatus() {
    if (!isEdit) return;
    setActionPending(true);
    setActionError(null);
    const next =
      status === PLAN_STATUS_DONE ? PLAN_STATUS_OPEN : PLAN_STATUS_DONE;
    const result = await setPlanStatusAction(props.planId, next);
    if (result?.error) {
      setActionError(result.error);
      setActionPending(false);
      return;
    }
    setStatus(next);
    setActionPending(false);
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
            placeholder="这件事叫什么"
            maxLength={120}
          />
        </label>

        <DatePickerField
          name="dueAt"
          value={dueAt}
          onChange={(next) => {
            setDueAt(next);
            markDirty();
          }}
        />

        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          描述
          <textarea
            name="body"
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              markDirty();
            }}
            rows={10}
            className="auth-field min-h-[200px] resize-y leading-7"
            placeholder="补充一点细节……"
          />
        </label>

        {isEdit ? (
          <p className="font-mono text-[10px] tracking-wide text-[var(--teal)]">
            状态：{status === PLAN_STATUS_DONE ? "已完成" : "未完成"}
            <span className="ml-2 text-[var(--mist)]">
              （临期与归档将在后续阶段接入）
            </span>
          </p>
        ) : null}

        {state.error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {state.error}
          </p>
        ) : null}
        {actionError ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {actionError}
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
          <button
            type="submit"
            disabled={pending}
            className="ui-btn-primary !w-auto px-5"
          >
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
            <>
              <button
                type="button"
                disabled={actionPending}
                onClick={() => {
                  void toggleStatus();
                }}
                className="ui-btn-ghost px-4 py-2.5 text-[var(--teal)] hover:border-[var(--teal)]"
              >
                {status === PLAN_STATUS_DONE ? "标为未完成" : "标为已完成"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setDeleteOpen(true);
                }}
                className="ui-btn-danger ml-auto px-4 py-2.5"
              >
                删除
              </button>
            </>
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
          emitDirty(false);
          router.push("/app/future/plans");
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="删除这条计划？"
        message="未归档的计划将永久删除，无法恢复。确定删除吗？"
        confirmLabel="删除"
        cancelLabel="取消"
        tone="danger"
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </>
  );
}
