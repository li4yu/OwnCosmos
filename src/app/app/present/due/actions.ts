"use server";

import { revalidatePath } from "next/cache";
import { ARCHIVE_REASON_PLAN_COMPLETE } from "@/db/schema";
import { parseDueDateInput } from "@/lib/plan-dates";
import { requireSession } from "@/lib/session";
import { createYuanxiangEssay } from "@/services/essays";
import { completeAndArchivePlan, postponeDuePlan } from "@/services/plans";

export type DueActionState = {
  error?: string;
  essayId?: string;
};

function revalidateDuePaths(planId?: string) {
  revalidatePath("/app");
  revalidatePath("/app/present");
  revalidatePath("/app/present/due");
  revalidatePath("/app/present/essays");
  revalidatePath("/app/future");
  revalidatePath("/app/future/plans");
  revalidatePath("/app/future/cycles");
  revalidatePath("/app/past/gallery");
  revalidatePath("/app/past/gallery");
  if (planId) revalidatePath(`/app/future/plans/${planId}`);
}

export async function completeDuePlanAction(
  planId: string,
): Promise<DueActionState> {
  const session = await requireSession();
  const archiveId = await completeAndArchivePlan(
    session.user.id,
    planId,
    ARCHIVE_REASON_PLAN_COMPLETE,
  );
  if (!archiveId) {
    return { error: "计划不存在、已归档，或周期计划尚未到期" };
  }
  revalidateDuePaths(planId);
  return {};
}

/** 延期：回写来日途截止日 */
export async function postponeDuePlanAction(
  planId: string,
  dueDateRaw: string,
): Promise<DueActionState> {
  const session = await requireSession();
  const dueAt = parseDueDateInput(dueDateRaw);
  if (!dueAt) return { error: "请选择有效的新截止日期" };
  const id = await postponeDuePlan(session.user.id, planId, dueAt);
  if (!id) return { error: "无法延期：计划不存在、已归档或为时间胶囊" };
  revalidateDuePaths(planId);
  return {};
}

/** 随想：生成独立随笔并关联计划 */
export async function createYuanxiangAction(
  planId: string,
  body: string,
): Promise<DueActionState> {
  const session = await requireSession();
  const essayId = await createYuanxiangEssay(session.user.id, planId, body);
  if (!essayId) return { error: "请填写随想内容，或检查计划是否仍有效" };
  revalidateDuePaths(planId);
  revalidatePath(`/app/present/essays/${essayId}`);
  return { essayId };
}
