"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { parseDueDateInput, isDueDateBeforeToday } from "@/lib/plan-dates";
import {
  isCycleUnit,
  isPlanKind,
  type CycleUnit,
  type PlanKind,
} from "@/lib/plan-kinds";
import {
  DEFAULT_REMIND_DAYS,
  validateRemindDays,
} from "@/lib/plan-remind";
import {
  ARCHIVE_REASON_PLAN_COMPLETE,
  PLAN_KIND_CAPSULE,
  PLAN_KIND_CYCLE,
  PLAN_KIND_ONCE,
  PLAN_KIND_VISION,
  PLAN_STATUS_DONE,
  PLAN_STATUS_OPEN,
  PLAN_TASK_STATUS_DEFERRED,
  PLAN_TASK_STATUS_DONE,
  PLAN_TASK_STATUS_OPEN,
} from "@/db/schema";
import {
  checkinHabit,
  createHabit,
  deactivateHabit,
} from "@/services/daily";
import {
  createPlanTask,
  deletePlanTask,
  setPlanTaskStatus,
  type PlanTaskStatus,
} from "@/services/plan-tasks";
import {
  checkinCyclePlan,
  completeAndArchivePlan,
  createPlan,
  deleteActivePlan,
  setPlanStatus,
  updatePlan,
  type PlanStatus,
} from "@/services/plans";

export type PlanActionState = {
  error?: string;
  createdId?: string;
};

function revalidatePlans(planId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/future");
  revalidatePath("/app/future/plans");
  revalidatePath("/app/future/cycles");
  revalidatePath("/app/future/capsule");
  revalidatePath("/app/future/daily");
  revalidatePath("/app/present");
  revalidatePath("/app/present/due");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/plan-archive");
  revalidatePath("/app/past/gallery/plan-cycle");
  if (planId) revalidatePath(`/app/future/plans/${planId}`);
}

function revalidateDaily() {
  revalidatePath("/app");
  revalidatePath("/app/future/daily");
  revalidatePath("/app/future");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/daily-checkin");
}

function readKind(formData: FormData): PlanKind {
  const raw = String(formData.get("kind") ?? PLAN_KIND_ONCE);
  return isPlanKind(raw) ? raw : PLAN_KIND_ONCE;
}

function readCycleUnit(formData: FormData): CycleUnit | null {
  const raw = String(formData.get("cycleUnit") ?? "");
  return isCycleUnit(raw) ? raw : null;
}

function readPlanFields(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const dueRaw = String(formData.get("dueAt") ?? "").trim();
  const dueAt = dueRaw ? parseDueDateInput(dueRaw) : null;
  const remindRaw = Number(formData.get("remindDays") ?? DEFAULT_REMIND_DAYS);
  const kind = readKind(formData);
  const cycleUnit = readCycleUnit(formData);
  const sourceEssayId = String(formData.get("sourceEssayId") ?? "").trim() || null;
  return { title, body, dueAt, dueRaw, remindRaw, kind, cycleUnit, sourceEssayId };
}

function validatePlanInput(fields: ReturnType<typeof readPlanFields>): string | null {
  const { title, body, dueAt, remindRaw, kind, cycleUnit } = fields;
  if (!title.trim() && !body.trim()) {
    return "请至少填写标题或描述";
  }
  if (kind === PLAN_KIND_VISION) {
    if (dueAt && isDueDateBeforeToday(dueAt)) {
      return "截止日期不能早于今天";
    }
    if (dueAt) {
      const remindError = validateRemindDays(remindRaw, dueAt);
      if (remindError) return remindError;
    }
    return null;
  }
  if (!dueAt) {
    if (kind === PLAN_KIND_CAPSULE) return "请选择胶囊解锁日期";
    if (kind === PLAN_KIND_CYCLE) return "请选择本期结束日期";
    return "请选择有效的截止日期";
  }
  if (isDueDateBeforeToday(dueAt) && kind !== PLAN_KIND_CAPSULE) {
    // 胶囊允许选今天解锁；其它类型截止不能早于今天
    return "截止日期不能早于今天";
  }
  if (kind === PLAN_KIND_CAPSULE && isDueDateBeforeToday(dueAt)) {
    return "解锁日期不能早于今天";
  }
  if (kind === PLAN_KIND_CYCLE && !cycleUnit) {
    return "请选择轮期单位";
  }
  // 轮期 / 胶囊无临期配
  if (kind !== PLAN_KIND_CAPSULE && kind !== PLAN_KIND_CYCLE) {
    const remindError = validateRemindDays(remindRaw, dueAt);
    if (remindError) return remindError;
  }
  return null;
}

export async function createPlanAction(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requireSession();
  const fields = readPlanFields(formData);
  const error = validatePlanInput(fields);
  if (error) return { error };

  const id = await createPlan(session.user.id, {
    title: fields.title,
    body: fields.body,
    dueAt: fields.dueAt,
    remindDays: fields.remindRaw,
    kind: fields.kind,
    cycleUnit: fields.cycleUnit,
    sourceEssayId: fields.sourceEssayId,
  });
  revalidatePlans(id);
  return { createdId: id };
}

export async function updatePlanAction(
  planId: string,
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requireSession();
  const fields = readPlanFields(formData);
  const error = validatePlanInput(fields);
  if (error) return { error };
  const updated = await updatePlan(session.user.id, planId, {
    title: fields.title,
    body: fields.body,
    dueAt: fields.dueAt,
    remindDays: fields.remindRaw,
    cycleUnit: fields.cycleUnit,
  });
  if (!updated) {
    return { error: "计划不存在、已归档，或时间胶囊封存后不可修改" };
  }
  revalidatePlans(planId);
  return {};
}

export async function setPlanStatusAction(
  planId: string,
  status: PlanStatus,
): Promise<PlanActionState> {
  const session = await requireSession();
  if (status !== PLAN_STATUS_OPEN && status !== PLAN_STATUS_DONE) {
    return { error: "无效状态" };
  }
  if (status === PLAN_STATUS_DONE) {
    const archiveId = await completeAndArchivePlan(
      session.user.id,
      planId,
      ARCHIVE_REASON_PLAN_COMPLETE,
    );
    if (!archiveId) {
      return {
        error: "计划不存在、已归档，或轮期尚未到期（到期当天起可完成）",
      };
    }
    revalidatePlans(planId);
    return {};
  }
  const ok = await setPlanStatus(session.user.id, planId, status);
  if (!ok) {
    return { error: "计划不存在或已归档" };
  }
  revalidatePlans(planId);
  return {};
}

export async function completePlanAction(
  planId: string,
): Promise<PlanActionState> {
  return setPlanStatusAction(planId, PLAN_STATUS_DONE);
}

export async function deletePlanAction(
  planId: string,
): Promise<PlanActionState> {
  const session = await requireSession();
  const ok = await deleteActivePlan(session.user.id, planId);
  if (!ok) {
    return { error: "无法删除：不存在、已归档，或胶囊尚未解锁" };
  }
  revalidatePlans(planId);
  return {};
}

export async function createPlanTaskAction(
  planId: string,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "");
  const id = await createPlanTask(session.user.id, planId, title);
  if (!id) return { error: "无法添加子任务" };
  revalidatePlans(planId);
  return {};
}

export async function setPlanTaskStatusAction(
  planId: string,
  taskId: string,
  status: PlanTaskStatus,
): Promise<PlanActionState> {
  const session = await requireSession();
  if (
    status !== PLAN_TASK_STATUS_OPEN &&
    status !== PLAN_TASK_STATUS_DONE &&
    status !== PLAN_TASK_STATUS_DEFERRED
  ) {
    return { error: "无效状态" };
  }
  const ok = await setPlanTaskStatus(session.user.id, taskId, status);
  if (!ok) return { error: "子任务不存在或计划已归档" };
  revalidatePlans(planId);
  return {};
}

export async function deletePlanTaskAction(
  planId: string,
  taskId: string,
): Promise<PlanActionState> {
  const session = await requireSession();
  const ok = await deletePlanTask(session.user.id, taskId);
  if (!ok) return { error: "无法删除子任务" };
  revalidatePlans(planId);
  return {};
}

export type DailyActionState = {
  error?: string;
  ok?: boolean;
};

export async function createHabitAction(
  _prev: DailyActionState,
  formData: FormData,
): Promise<DailyActionState> {
  const session = await requireSession();
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const id = await createHabit(session.user.id, { title, body });
  if (!id) return { error: "请填写日课名称" };
  revalidateDaily();
  return { ok: true };
}

export async function checkinHabitAction(
  habitId: string,
  _prev: DailyActionState,
  formData: FormData,
): Promise<DailyActionState> {
  const session = await requireSession();
  const note = String(formData.get("note") ?? "");
  const id = await checkinHabit(session.user.id, habitId, note);
  if (!id) return { error: "日课不存在或已停用" };
  revalidateDaily();
  return { ok: true };
}

export async function deactivateHabitAction(
  habitId: string,
): Promise<DailyActionState> {
  const session = await requireSession();
  const ok = await deactivateHabit(session.user.id, habitId);
  if (!ok) return { error: "日课不存在" };
  revalidateDaily();
  return { ok: true };
}

/** 首页快捷：日课打卡（心得可选，同步馆藏计次） */
export async function quickCheckinHabitAction(
  habitId: string,
  note: string,
): Promise<DailyActionState> {
  const session = await requireSession();
  const id = await checkinHabit(session.user.id, habitId, note);
  if (!id) return { error: "日课不存在或已停用" };
  revalidateDaily();
  return { ok: true };
}

/** 首页快捷：轮期完成本期并滚下一期（心得写入馆藏；未到期拒绝） */
export async function quickCheckinCycleAction(
  planId: string,
  note: string,
): Promise<DailyActionState> {
  const session = await requireSession();
  const result = await checkinCyclePlan(session.user.id, planId, note);
  if (!result.ok) return { error: result.error };
  revalidatePlans(planId);
  revalidatePath("/app");
  return { ok: true };
}
