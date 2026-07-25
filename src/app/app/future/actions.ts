"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { parseDueDateInput, isDueDateBeforeToday } from "@/lib/plan-dates";
import {
  DEFAULT_REMIND_DAYS,
  validateRemindDays,
} from "@/lib/plan-remind";
import {
  ARCHIVE_REASON_PLAN_COMPLETE,
  PLAN_STATUS_DONE,
  PLAN_STATUS_OPEN,
} from "@/db/schema";
import {
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
  revalidatePath("/app/future");
  revalidatePath("/app/future/plans");
  revalidatePath("/app/present");
  revalidatePath("/app/present/due");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery/plan-archive");
  if (planId) revalidatePath(`/app/future/plans/${planId}`);
}

function readPlanFields(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const dueRaw = String(formData.get("dueAt") ?? "");
  const dueAt = parseDueDateInput(dueRaw);
  const remindRaw = Number(formData.get("remindDays") ?? DEFAULT_REMIND_DAYS);
  return { title, body, dueAt, dueRaw, remindRaw };
}

export async function createPlanAction(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requireSession();
  const { title, body, dueAt, remindRaw } = readPlanFields(formData);
  if (!dueAt) {
    return { error: "请选择有效的截止日期" };
  }
  if (isDueDateBeforeToday(dueAt)) {
    return { error: "截止日期不能早于今天" };
  }
  const remindError = validateRemindDays(remindRaw, dueAt);
  if (remindError) {
    return { error: remindError };
  }
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或描述" };
  }
  const id = await createPlan(session.user.id, {
    title,
    body,
    dueAt,
    remindDays: remindRaw,
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
  const { title, body, dueAt, remindRaw } = readPlanFields(formData);
  if (!dueAt) {
    return { error: "请选择有效的截止日期" };
  }
  if (isDueDateBeforeToday(dueAt)) {
    return { error: "截止日期不能早于今天" };
  }
  const remindError = validateRemindDays(remindRaw, dueAt);
  if (remindError) {
    return { error: remindError };
  }
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或描述" };
  }
  const updated = await updatePlan(session.user.id, planId, {
    title,
    body,
    dueAt,
    remindDays: remindRaw,
  });
  if (!updated) {
    return { error: "计划不存在或已归档" };
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
  // 标为完成 = 完成及归档入馆藏（与临期帖一致）；来日途「已完成」仍展示该行
  if (status === PLAN_STATUS_DONE) {
    const archiveId = await completeAndArchivePlan(
      session.user.id,
      planId,
      ARCHIVE_REASON_PLAN_COMPLETE,
    );
    if (!archiveId) {
      return { error: "计划不存在或已归档" };
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

/** 来日途显式「完成及归档」 */
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
    return { error: "计划不存在或已归档，无法删除" };
  }
  revalidatePlans(planId);
  return {};
}
