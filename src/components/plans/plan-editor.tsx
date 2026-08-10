"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  completePlanAction,
  createPlanAction,
  deletePlanAction,
  setPlanStatusAction,
  updatePlanAction,
  type PlanActionState,
} from "@/app/app/future/actions";
import { PlanTaskPanel, type PlanTaskItem } from "@/components/plans/plan-task-panel";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { NoticeDialog } from "@/components/ui/notice-dialog";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import {
  CYCLE_UNIT_CUSTOM,
  CYCLE_UNIT_DAY,
  CYCLE_UNIT_MONTH,
  CYCLE_UNIT_WEEK,
  CYCLE_UNIT_YEAR,
  PLAN_KIND_CAPSULE,
  PLAN_KIND_CYCLE,
  PLAN_KIND_ONCE,
  PLAN_KIND_VISION,
  PLAN_STATUS_DONE,
  PLAN_STATUS_OPEN,
} from "@/db/schema";
import {
  calendarDaysUntilDue,
  formatDueDateInput,
  parseDueDateInput,
} from "@/lib/plan-dates";
import {
  cycleUnitLabel,
  MAX_CYCLE_EVERY_DAYS,
  MIN_CYCLE_EVERY_DAYS,
  planKindLabel,
  type PlanKind,
} from "@/lib/plan-kinds";
import {
  DEFAULT_REMIND_DAYS,
  clampRemindDays,
  maxRemindDaysForDue,
  parseRemindDaysInput,
  remindPresetsForDue,
  validateRemindDays,
} from "@/lib/plan-remind";

type SourceLink = {
  title: string;
  href: string;
  archived: boolean;
};

type PlanEditorProps =
  | {
      mode: "create";
      defaultKind?: PlanKind;
      initialTitle?: string;
      initialBody?: string;
      sourceEssayId?: string | null;
      listHref?: string;
    }
  | {
      mode: "edit";
      planId: string;
      initialTitle: string;
      initialBody: string;
      initialDueAt: Date | null;
      initialRemindDays: number;
      initialStatus: string;
      initialKind: PlanKind;
      initialCycleUnit?: string | null;
      initialCycleEveryDays?: number | null;
      capsuleLocked?: boolean;
      sourceLink?: SourceLink | null;
      tasks?: PlanTaskItem[];
      /** 本系列今日是否已完成本期（与首页一致） */
      periodDoneToday?: boolean;
      justCreated?: boolean;
      listHref?: string;
      /** Phase 14: 绑定凝时累计 */
      focusTotalMs?: number;
      focusSessionCount?: number;
    };

const initialState: PlanActionState = {};

const KIND_OPTIONS: { value: PlanKind; tip: string }[] = [
  { value: PLAN_KIND_ONCE, tip: "有明确截止日的单次事项" },
  { value: PLAN_KIND_VISION, tip: "长期愿景，截止日可选；无截止则不进临期提醒" },
  { value: PLAN_KIND_CYCLE, tip: "按周期滚动" },
];

function emitDirty(dirty: boolean) {
  window.dispatchEvent(
    new CustomEvent("owncosmos:essay-dirty", { detail: { dirty } }),
  );
}

export function PlanEditor(props: PlanEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const listHref =
    props.listHref ??
    (isEdit
      ? props.initialKind === PLAN_KIND_CYCLE
        ? "/app/future/cycles"
        : props.initialKind === PLAN_KIND_CAPSULE
          ? "/app/future/capsule"
          : "/app/future/plans"
      : props.defaultKind === PLAN_KIND_CYCLE
        ? "/app/future/cycles"
        : props.defaultKind === PLAN_KIND_CAPSULE
          ? "/app/future/capsule"
          : "/app/future/plans");

  const action = isEdit
    ? updatePlanAction.bind(null, props.planId)
    : createPlanAction;

  const [state, formAction, pending] = useActionState(action, initialState);
  const [kind, setKind] = useState<PlanKind>(
    isEdit ? props.initialKind : (props.defaultKind ?? PLAN_KIND_ONCE),
  );
  const [title, setTitle] = useState(
    isEdit ? props.initialTitle : (props.initialTitle ?? ""),
  );
  const [body, setBody] = useState(
    isEdit ? props.initialBody : (props.initialBody ?? ""),
  );
  /** 新建周期计划时的本地子任务草稿（创建后写入） */
  const [draftTasks, setDraftTasks] = useState<string[]>([]);
  const [draftTaskInput, setDraftTaskInput] = useState("");
  const [dueAt, setDueAt] = useState(() => {
    if (isEdit) {
      return props.initialDueAt ? formatDueDateInput(props.initialDueAt) : "";
    }
    return formatDueDateInput(new Date());
  });
  const [cycleUnit, setCycleUnit] = useState(
    isEdit
      ? (props.initialCycleUnit ?? CYCLE_UNIT_WEEK)
      : props.defaultKind === PLAN_KIND_CYCLE
        ? CYCLE_UNIT_DAY
        : CYCLE_UNIT_WEEK,
  );
  const [cycleEveryDays, setCycleEveryDays] = useState(() => {
    if (isEdit && props.initialCycleEveryDays != null) {
      return String(props.initialCycleEveryDays);
    }
    return "3";
  });
  const [remindDays, setRemindDays] = useState(() => {
    if (isEdit && props.initialDueAt) {
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
  const sawPendingRef = useRef(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [status, setStatus] = useState(
    isEdit ? props.initialStatus : PLAN_STATUS_OPEN,
  );

  const capsuleLocked = isEdit && Boolean(props.capsuleLocked);
  const needsDue = kind !== PLAN_KIND_VISION;
  /** 周期计划 / 胶囊无提前提醒；周期计划到期当天起出现在首页 */
  const showRemind =
    kind !== PLAN_KIND_CAPSULE &&
    kind !== PLAN_KIND_CYCLE &&
    Boolean(dueAt);
  const dueLabel =
    kind === PLAN_KIND_CAPSULE
      ? "解锁日期"
      : kind === PLAN_KIND_CYCLE
        ? "本期结束"
        : "截止日期";
  const periodDoneToday = isEdit ? Boolean(props.periodDoneToday) : false;

  useEffect(() => {
    if (props.mode !== "edit") return;
    emitDirty(false);
    if (props.justCreated) {
      setSavedFlash(true);
      setNotice({
        title: "已创建",
        message: "计划已保存，可继续编辑或返回列表。",
      });
      router.replace(`/app/future/plans/${props.planId}`, { scroll: false });
    }
  }, [props, router]);

  useEffect(() => {
    if (pending) {
      sawPendingRef.current = true;
      return;
    }
    if (!sawPendingRef.current) return;
    sawPendingRef.current = false;
    if (state.error) {
      setNotice({ title: "无法保存", message: state.error });
      return;
    }

    setDirty(false);
    emitDirty(false);

    if (!isEdit && state.createdId) {
      router.push(`/app/future/plans/${state.createdId}?saved=1`);
      return;
    }
    if (isEdit) {
      setSavedFlash(true);
      setNotice({ title: "已保存", message: "修改已写入。" });
    }
  }, [pending, state.error, state.createdId, isEdit, router]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const dueDate = dueAt ? parseDueDateInput(dueAt) : null;
  const cycleCanComplete =
    kind !== PLAN_KIND_CYCLE ||
    (dueDate != null && calendarDaysUntilDue(dueDate) <= 0);
  const cycleDoneToday =
    kind === PLAN_KIND_CYCLE && periodDoneToday && !cycleCanComplete;
  const remindMax = dueDate ? maxRemindDaysForDue(dueDate) : DEFAULT_REMIND_DAYS;
  const remindPresets = dueDate ? remindPresetsForDue(dueDate) : [1];

  useEffect(() => {
    if (!dueDate || kind === PLAN_KIND_CAPSULE) return;
    const next = clampRemindDays(remindDays, dueDate);
    if (next !== remindDays) {
      setRemindDays(next);
      setRemindDraft(String(next));
      setNotice({
        title: "提前提醒已调整",
        message: `截止日期变更后，提前天数不能超过「今天 → 截止」的跨度，已改为提前 ${next} 天。`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dueAt, kind]);

  function showNotice(title: string, message: string) {
    setNotice({ title, message });
  }

  function applyRemindDays(n: number) {
    if (!dueDate) {
      showNotice("提前提醒", "请先选择截止日期");
      return;
    }
    const err = validateRemindDays(n, dueDate);
    if (err) {
      const clamped = clampRemindDays(n, dueDate);
      setRemindDays(clamped);
      setRemindDraft(String(clamped));
      markDirty();
      showNotice("提前提醒无效", `${err} 已为你调整为提前 ${clamped} 天。`);
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
    router.push(listHref);
  }

  async function confirmDelete() {
    if (!isEdit) return;
    setActionPending(true);
    const result = await deletePlanAction(props.planId);
    if (result?.error) {
      setActionPending(false);
      showNotice("操作失败", result.error);
      return;
    }
    emitDirty(false);
    router.push(listHref);
    router.refresh();
  }

  async function confirmComplete() {
    if (!isEdit) return;
    setActionPending(true);
    const result = await completePlanAction(props.planId);
    if (result?.error) {
      setActionPending(false);
      showNotice("操作失败", result.error);
      return;
    }
    emitDirty(false);
    setCompleteOpen(false);
    router.push(listHref);
    router.refresh();
  }

  async function reopen() {
    if (!isEdit) return;
    setActionPending(true);
    const result = await setPlanStatusAction(props.planId, PLAN_STATUS_OPEN);
    if (result?.error) {
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
      <form
        id="plan-editor-form"
        action={formAction}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="kind" value={kind} />
        {!isEdit && props.sourceEssayId ? (
          <input type="hidden" name="sourceEssayId" value={props.sourceEssayId} />
        ) : null}

        {isEdit && props.sourceLink ? (
          <p className="text-sm text-[var(--mist)]">
            提炼自
            <Link
              href={props.sourceLink.href}
              className="mx-1 text-[var(--teal)] underline-offset-2 hover:underline"
            >
              {props.sourceLink.title}
            </Link>
            {props.sourceLink.archived ? "（馆藏）" : "（随笔）"}
          </p>
        ) : null}

        {isEdit && (props.focusSessionCount ?? 0) > 0 ? (
          <p className="text-xs text-[var(--mist)]">
            凝时累计{" "}
            <span className="text-[var(--paper)]">
              {formatFocusDurationMs(props.focusTotalMs ?? 0)}
            </span>
            <span className="ml-1 font-mono text-xs">
              · {props.focusSessionCount} 次完整专注
            </span>
          </p>
        ) : isEdit ? (
          <p className="text-xs text-[var(--mist)]">
            尚无绑定本计划的凝时记录 ·{" "}
            <Link
              href="/app/focus/forward"
              className="text-[var(--teal)] underline-offset-2 hover:underline"
            >
              去凝时
            </Link>
          </p>
        ) : null}

        {!isEdit ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm text-[var(--mist)]">类型</legend>
            <div className="flex flex-wrap gap-2">
              {KIND_OPTIONS.filter((opt) => {
                if (props.defaultKind === PLAN_KIND_CYCLE) {
                  return opt.value === PLAN_KIND_CYCLE;
                }
                if (props.defaultKind === PLAN_KIND_CAPSULE) {
                  return opt.value === PLAN_KIND_CAPSULE;
                }
                if (
                  props.defaultKind === PLAN_KIND_ONCE ||
                  props.defaultKind === PLAN_KIND_VISION ||
                  !props.defaultKind
                ) {
                  return (
                    opt.value === PLAN_KIND_ONCE ||
                    opt.value === PLAN_KIND_VISION
                  );
                }
                return true;
              }).map((opt) => {
                const active = kind === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.tip}
                    onClick={() => {
                      setKind(opt.value);
                      markDirty();
                    }}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      active
                        ? "bg-[var(--amber)] text-[var(--on-amber)]"
                        : "border border-[var(--line)] bg-[var(--panel)] text-[var(--paper)] hover:border-[var(--amber)]"
                    }`}
                  >
                    {planKindLabel(opt.value)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <p className="font-mono text-xs tracking-wide text-[var(--teal)]">
            类型：{planKindLabel(kind)}
            {kind === PLAN_KIND_CYCLE
              ? ` · ${cycleUnitLabel(
                  cycleUnit,
                  Number(cycleEveryDays) || null,
                )}`
              : null}
          </p>
        )}

        <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
          标题
          <input
            name="title"
            value={title}
            disabled={capsuleLocked}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            className="auth-field"
            placeholder="这件事叫什么"
            maxLength={120}
          />
        </label>

        {kind === PLAN_KIND_CYCLE ? (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
              周期计划单位
              <select
                name="cycleUnit"
                value={cycleUnit}
                disabled={capsuleLocked}
                onChange={(e) => {
                  setCycleUnit(e.target.value);
                  markDirty();
                }}
                className="auth-field"
              >
                <option value={CYCLE_UNIT_DAY}>每日</option>
                <option value={CYCLE_UNIT_WEEK}>每周</option>
                <option value={CYCLE_UNIT_MONTH}>每月</option>
                <option value={CYCLE_UNIT_YEAR}>每年</option>
                <option value={CYCLE_UNIT_CUSTOM}>自定义天数</option>
              </select>
            </label>
            {cycleUnit === CYCLE_UNIT_CUSTOM ? (
              <label className="flex flex-col gap-1.5 text-sm text-[var(--mist)]">
                间隔天数（{MIN_CYCLE_EVERY_DAYS}–{MAX_CYCLE_EVERY_DAYS}）
                <input
                  name="cycleEveryDays"
                  type="number"
                  min={MIN_CYCLE_EVERY_DAYS}
                  max={MAX_CYCLE_EVERY_DAYS}
                  step={1}
                  value={cycleEveryDays}
                  disabled={capsuleLocked}
                  onChange={(e) => {
                    setCycleEveryDays(e.target.value);
                    markDirty();
                  }}
                  className="auth-field"
                  placeholder="例如 3"
                />
              </label>
            ) : (
              <input type="hidden" name="cycleEveryDays" value="" />
            )}
          </div>
        ) : (
          <>
            <input type="hidden" name="cycleUnit" value="" />
            <input type="hidden" name="cycleEveryDays" value="" />
          </>
        )}

        {needsDue || dueAt ? (
          <DatePickerField
            name="dueAt"
            label={dueLabel}
            value={dueAt}
            disabled={capsuleLocked}
            onChange={(next) => {
              setDueAt(next);
              markDirty();
            }}
          />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-[var(--mist)]">截止日期（可选）</p>
            <button
              type="button"
              className="ui-btn-ghost w-fit px-3 py-2 text-sm"
              onClick={() => {
                setDueAt(formatDueDateInput(new Date()));
                markDirty();
              }}
            >
              添加截止日
            </button>
            <input type="hidden" name="dueAt" value="" />
          </div>
        )}

        {kind === PLAN_KIND_VISION && dueAt ? (
          <button
            type="button"
            className="ui-btn-ghost w-fit px-3 py-1.5 text-xs"
            onClick={() => {
              setDueAt("");
              markDirty();
            }}
          >
            清除截止日
          </button>
        ) : null}

        {showRemind ? (
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--field-bg)]/40 p-3 sm:p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm text-[var(--paper)]">提前提醒</p>
              <p className="font-mono text-xs tracking-wide text-[var(--teal)]">
                最多提前 {remindMax} 天（相对今天与截止日）
              </p>
            </div>
            <p className="text-sm leading-6 text-[var(--mist)]">
              默认提前 1 天；可点快捷值或自定义天数。
            </p>
            <input type="hidden" name="remindDays" value={remindDays} />
            {remindPresets.length > 0 ? (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="提前提醒快捷"
              >
                {remindPresets.map((d) => {
                  const active = remindDays === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={capsuleLocked}
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
                  disabled={capsuleLocked}
                  value={remindDraft}
                  onChange={(e) => {
                    setRemindDraft(e.target.value);
                  }}
                  onBlur={() => {
                    const parsed = parseRemindDaysInput(remindDraft);
                    if (parsed == null) {
                      setRemindDraft(String(remindDays));
                      showNotice("提前提醒无效", "请输入正整数天数。");
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
        ) : (
          <input type="hidden" name="remindDays" value={remindDays} />
        )}

        {capsuleLocked ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center">
            <p className="text-sm text-[var(--paper)]">时间胶囊尚未解锁</p>
            <p className="mt-2 text-sm text-[var(--mist)]">
              解锁日 {dueAt || "未设"} 当天起可阅读正文。
            </p>
          </div>
        ) : (
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
              placeholder={
                kind === PLAN_KIND_CAPSULE
                  ? "写给未来的自己……"
                  : "补充一点细节……"
              }
            />
          </label>
        )}

        {!capsuleLocked ? (
          kind === PLAN_KIND_CYCLE && !isEdit ? (
            <section className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--field-bg)]/40 p-3 sm:p-4">
              {draftTasks.map((t, i) => (
                <input key={`${t}-${i}`} type="hidden" name="taskTitle" value={t} />
              ))}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="text-sm text-[var(--paper)]">子任务</p>
                  <p className="mt-0.5 text-xs text-[var(--mist)]">
                    创建后可每日打卡记次；与「完成本期」无关
                  </p>
                </div>
                <p className="font-mono text-xs tracking-wide text-[var(--teal)]">
                  {draftTasks.length === 0
                    ? "无子任务"
                    : `${draftTasks.length} 项`}
                </p>
              </div>
              {draftTasks.length === 0 ? (
                <p className="text-sm text-[var(--mist)]">
                  还没有子任务。可拆成每日打卡记次的小项。
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {draftTasks.map((t, i) => (
                    <li
                      key={`${t}-${i}`}
                      className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 text-sm text-[var(--paper)]">
                        {t}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-[var(--danger)]"
                        onClick={() => {
                          setDraftTasks((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          );
                          markDirty();
                        }}
                      >
                        删
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  value={draftTaskInput}
                  onChange={(e) => setDraftTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const trimmed = draftTaskInput.trim();
                    if (!trimmed) return;
                    setDraftTasks((prev) => [...prev, trimmed].slice(0, 40));
                    setDraftTaskInput("");
                    markDirty();
                  }}
                  placeholder="添加子任务…"
                  maxLength={120}
                  className="auth-field min-w-[12rem] flex-1"
                />
                <button
                  type="button"
                  disabled={!draftTaskInput.trim()}
                  className="ui-btn-ghost px-3 py-2 text-sm"
                  onClick={() => {
                    const trimmed = draftTaskInput.trim();
                    if (!trimmed) return;
                    setDraftTasks((prev) => [...prev, trimmed].slice(0, 40));
                    setDraftTaskInput("");
                    markDirty();
                  }}
                >
                  添加
                </button>
              </div>
            </section>
          ) : null
        ) : null}

      </form>

      {/* 编辑中的子任务（须在计划 form 外，避免嵌套 form） */}
      {isEdit && !capsuleLocked && kind === PLAN_KIND_CYCLE ? (
        <div className="mt-4">
          <PlanTaskPanel planId={props.planId} tasks={props.tasks ?? []} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {isEdit && kind !== PLAN_KIND_CAPSULE ? (
          <p className="font-mono text-xs tracking-wide text-[var(--teal)]">
            状态：{status === PLAN_STATUS_DONE ? "已完成" : "未完成"}
            <span className="ml-2 text-[var(--mist)]">
              （完成会归档入馆藏，临期提醒同步消失）
            </span>
          </p>
        ) : null}
        {isEdit && kind === PLAN_KIND_CAPSULE && !capsuleLocked ? (
          <p className="font-mono text-xs tracking-wide text-[var(--teal)]">
            已解锁 · 可随时重读，无需归档
          </p>
        ) : null}

        {savedFlash && !dirty && !state.error ? (
          <p className="text-sm text-[var(--teal)]" role="status">
            已保存
          </p>
        ) : null}
        {dirty ? (
          <p className="font-mono text-xs tracking-wide text-[var(--mist)]">
            有未保存更改；离开页面前请先保存
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {!capsuleLocked ? (
            <button
              type="submit"
              form="plan-editor-form"
              disabled={pending}
              className="ui-btn-primary !w-auto px-5"
            >
              {pending ? "保存中…" : isEdit ? "保存" : "创建并保存"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={requestLeave}
            className="ui-btn-ghost px-4 py-2.5"
          >
            返回列表
          </button>
          {isEdit ? (
            <>
              {!capsuleLocked && kind !== PLAN_KIND_CAPSULE ? (
                <button
                  type="button"
                  disabled={
                    actionPending ||
                    (status !== PLAN_STATUS_DONE && !cycleCanComplete)
                  }
                  onClick={() => {
                    if (status === PLAN_STATUS_DONE) {
                      void reopen();
                      return;
                    }
                    setCompleteOpen(true);
                  }}
                  className="ui-btn-ghost px-4 py-2.5 text-[var(--teal)] hover:border-[var(--teal)]"
                >
                  {status === PLAN_STATUS_DONE
                    ? "标为未完成"
                    : kind === PLAN_KIND_CYCLE
                      ? cycleDoneToday
                        ? "今日已完成"
                        : cycleCanComplete
                          ? "完成本期"
                          : "未到期"
                      : "完成及归档"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="ui-btn-danger ml-auto px-4 py-2.5"
              >
                删除
              </button>
            </>
          ) : null}
        </div>
      </div>

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
          router.push(listHref);
        }}
      />

      <ConfirmDialog
        open={completeOpen}
        title={kind === PLAN_KIND_CYCLE ? "完成本期？" : "完成及归档？"}
        message={
          kind === PLAN_KIND_CYCLE
            ? "将计次写入馆藏·周期计划归档，并开启下一期。子任务打卡次数会带到下一期。确定吗？"
            : "将标记完成并沉淀入昔时往馆藏；来日途「已完成」仍可查看，今时际临期提醒不再显示。确定吗？"
        }
        confirmLabel={kind === PLAN_KIND_CYCLE ? "完成本期" : "完成及归档"}
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
