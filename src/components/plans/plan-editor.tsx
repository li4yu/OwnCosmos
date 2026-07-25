"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  completePlanAction,
  createPlanAction,
  deletePlanAction,
  setPlanStatusAction,
  updatePlanAction,
  type PlanActionState,
} from "@/app/app/future/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import { PLAN_STATUS_DONE, PLAN_STATUS_OPEN } from "@/db/schema";
import { formatDueDateInput, parseDueDateInput } from "@/lib/plan-dates";
import {
  DEFAULT_REMIND_DAYS,
  clampRemindDays,
  maxRemindDaysForDue,
  parseRemindDaysInput,
  remindPresetsForDue,
  validateRemindDays,
} from "@/lib/plan-remind";

type PlanEditorProps =
  | { mode: "create" }
  | {
      mode: "edit";
      planId: string;
      initialTitle: string;
      initialBody: string;
      initialDueAt: Date;
      initialRemindDays: number;
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
  const [remindDays, setRemindDays] = useState(() => {
    if (isEdit) {
      return clampRemindDays(props.initialRemindDays, props.initialDueAt);
    }
    return clampRemindDays(DEFAULT_REMIND_DAYS, new Date());
  });
  const [remindDraft, setRemindDraft] = useState(String(remindDays));
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(
    () => isEdit && Boolean(props.justCreated),
  );
  const [wasPending, setWasPending] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
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
    if (state.error) {
      setNotice({ title: "无法保存", message: state.error });
      return;
    }

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

  const dueDate = parseDueDateInput(dueAt);
  const remindMax = dueDate ? maxRemindDaysForDue(dueDate) : DEFAULT_REMIND_DAYS;
  const remindPresets = dueDate ? remindPresetsForDue(dueDate) : [1];

  useEffect(() => {
    if (!dueDate) return;
    const next = clampRemindDays(remindDays, dueDate);
    if (next !== remindDays) {
      setRemindDays(next);
      setRemindDraft(String(next));
      setNotice({
        title: "临期配已调整",
        message: `截止日期变更后，提前天数不能超过「今天 → 截止」的跨度，已改为提前 ${next} 天。`,
      });
    }
    // 仅随截止日期变化纠偏
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAt]);

  function showNotice(title: string, message: string) {
    setNotice({ title, message });
  }

  function applyRemindDays(n: number) {
    if (!dueDate) {
      showNotice("临期配", "请先选择截止日期");
      return;
    }
    const err = validateRemindDays(n, dueDate);
    if (err) {
      const clamped = clampRemindDays(n, dueDate);
      setRemindDays(clamped);
      setRemindDraft(String(clamped));
      markDirty();
      showNotice(
        "临期配无效",
        `${err} 已为你调整为提前 ${clamped} 天。`,
      );
      return;
    }
    setRemindDays(n);
    setRemindDraft(String(n));
    markDirty();
  }

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
      showNotice("操作失败", result.error);
      return;
    }
    emitDirty(false);
    router.push("/app/future/plans");
    router.refresh();
  }

  async function confirmComplete() {
    if (!isEdit) return;
    setActionPending(true);
    setActionError(null);
    const result = await completePlanAction(props.planId);
    if (result?.error) {
      setActionError(result.error);
      setActionPending(false);
      showNotice("操作失败", result.error);
      return;
    }
    emitDirty(false);
    setCompleteOpen(false);
    router.push("/app/future/plans");
    router.refresh();
  }

  async function reopen() {
    if (!isEdit) return;
    setActionPending(true);
    setActionError(null);
    const result = await setPlanStatusAction(props.planId, PLAN_STATUS_OPEN);
    if (result?.error) {
      setActionError(result.error);
      setActionPending(false);
      showNotice("操作失败", result.error);
      return;
    }
    setStatus(PLAN_STATUS_OPEN);
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

        <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--field-bg)]/40 p-3 sm:p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-[var(--paper)]">临期配</p>
            <p className="font-mono text-[10px] tracking-wide text-[var(--teal)]">
              最多提前 {remindMax} 天（相对今天与截止日）
            </p>
          </div>
          <p className="text-sm leading-6 text-[var(--mist)]">
            默认提前 1 天；可点快捷值或自定义天数。
          </p>
          <input type="hidden" name="remindDays" value={remindDays} />
          {remindPresets.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="临期配快捷">
              {remindPresets.map((d) => {
                const active = remindDays === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => applyRemindDays(d)}
                    className={`min-w-[4.5rem] rounded-md px-3 py-2 text-sm tracking-[0.04em] transition ${
                      active
                        ? "bg-[var(--amber)] text-[var(--on-amber)] shadow-sm"
                        : "border border-[var(--line)] bg-[var(--panel)] text-[var(--paper)] hover:border-[var(--amber)]"
                    }`}
                  >
                    {d} 天
                  </button>
                );
              })}
            </div>
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
            自定义提前天数
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={remindDraft}
                onChange={(e) => {
                  setRemindDraft(e.target.value);
                }}
                onBlur={() => {
                  const parsed = parseRemindDaysInput(remindDraft);
                  if (parsed == null) {
                    setRemindDraft(String(remindDays));
                    showNotice("临期配无效", "请输入正整数天数。");
                    return;
                  }
                  applyRemindDays(parsed);
                }}
                className="auth-field max-w-[8rem]"
              />
              <span className="text-sm text-[var(--mist)]">天</span>
            </div>
          </label>
        </div>

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
              （完成会归档入馆藏，临期帖同步消失）
            </span>
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
                  if (status === PLAN_STATUS_DONE) {
                    void reopen();
                    return;
                  }
                  setActionError(null);
                  setCompleteOpen(true);
                }}
                className="ui-btn-ghost px-4 py-2.5 text-[var(--teal)] hover:border-[var(--teal)]"
              >
                {status === PLAN_STATUS_DONE ? "标为未完成" : "完成及归档"}
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
        open={completeOpen}
        title="完成及归档？"
        message="将标记完成并沉淀入昔时往拾忆馆藏；来日途「已完成」仍可查看，今时际临期帖不再显示。确定吗？"
        confirmLabel="完成及归档"
        cancelLabel="取消"
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setCompleteOpen(false);
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
        pending={actionPending}
        onCancel={() => {
          if (!actionPending) setDeleteOpen(false);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      <NoticeDialog
        open={Boolean(notice)}
        title={notice?.title ?? "提示"}
        message={notice?.message ?? ""}
        onClose={() => setNotice(null)}
      />
    </>
  );
}
