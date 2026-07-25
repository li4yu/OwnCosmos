"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import {
  createPlan,
  deleteActivePlan,
  setPlanStatus,
  updatePlan,
  type PlanStatus,
} from "@/services/plans";
import { parseDueDateInput, isDueDateBeforeToday } from "@/lib/plan-dates";
import { PLAN_STATUS_DONE, PLAN_STATUS_OPEN } from "@/db/schema";

export type PlanActionState = {
  error?: string;
  createdId?: string;
};

function revalidatePlans(planId?: string) {
  revalidatePath("/app/future");
  revalidatePath("/app/future/plans");
  if (planId) revalidatePath(`/app/future/plans/${planId}`);
}

function readPlanFields(formData: FormData) {
  const title = String(formData.get("title") ?? "");
  const body = String(formData.get("body") ?? "");
  const dueRaw = String(formData.get("dueAt") ?? "");
  const dueAt = parseDueDateInput(dueRaw);
  return { title, body, dueAt, dueRaw };
}

export async function createPlanAction(
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requireSession();
  const { title, body, dueAt } = readPlanFields(formData);
  if (!dueAt) {
    return { error: "请选择有效的截止日期" };
  }
  if (isDueDateBeforeToday(dueAt)) {
    return { error: "截止日期不能早于今天" };
  }
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或描述" };
  }
  const id = await createPlan(session.user.id, { title, body, dueAt });
  revalidatePlans(id);
  return { createdId: id };
}

export async function updatePlanAction(
  planId: string,
  _prev: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  const session = await requireSession();
  const { title, body, dueAt } = readPlanFields(formData);
  if (!dueAt) {
    return { error: "请选择有效的截止日期" };
  }
  if (isDueDateBeforeToday(dueAt)) {
    return { error: "截止日期不能早于今天" };
  }
  if (!title.trim() && !body.trim()) {
    return { error: "请至少填写标题或描述" };
  }
  const updated = await updatePlan(session.user.id, planId, {
    title,
    body,
    dueAt,
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
  const ok = await setPlanStatus(session.user.id, planId, status);
  if (!ok) {
    return { error: "计划不存在或已归档" };
  }
  revalidatePlans(planId);
  return {};
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
