import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  PLAN_KIND_CYCLE,
  PLAN_STATUS_OPEN,
  PLAN_TASK_STATUS_OPEN,
  plan,
  planTask,
} from "@/db/schema";
import { formatDueDateInput } from "@/lib/plan-dates";
import {
  getActivePlan,
  syncCycleArchiveTaskSnapshot,
} from "@/services/plans";

function newId() {
  return randomBytes(16).toString("hex");
}

export type PlanTaskRecord = typeof planTask.$inferSelect;

export type CheckinPlanTaskResult =
  | { ok: true; checkCount: number; lastCheckinDate: string }
  | { ok: false; error: "not_found" | "already_today" };

export type CancelPlanTaskCheckinResult =
  | { ok: true; checkCount: number }
  | { ok: false; error: "not_found" | "not_today" };

export function localTaskCheckinDate(now = new Date()) {
  return formatDueDateInput(now);
}

export function taskCheckedInOnDate(
  lastCheckinDate: string | null | undefined,
  dateKey: string,
) {
  return Boolean(lastCheckinDate && lastCheckinDate === dateKey);
}

export async function listPlanTasks(userId: string, planId: string) {
  return getDb()
    .select()
    .from(planTask)
    .where(and(eq(planTask.userId, userId), eq(planTask.planId, planId)))
    .orderBy(asc(planTask.sortOrder), asc(planTask.createdAt));
}

/** 首页 / 轮期列表：进行中轮期下的子任务 */
export async function listCyclePlanTasksForHome(userId: string) {
  return getDb()
    .select({
      id: planTask.id,
      title: planTask.title,
      checkCount: planTask.checkCount,
      lastCheckinDate: planTask.lastCheckinDate,
      planId: plan.id,
      planTitle: plan.title,
    })
    .from(planTask)
    .innerJoin(plan, eq(plan.id, planTask.planId))
    .where(
      and(
        eq(planTask.userId, userId),
        isNull(plan.archivedAt),
        eq(plan.status, PLAN_STATUS_OPEN),
        eq(plan.kind, PLAN_KIND_CYCLE),
      ),
    )
    .orderBy(asc(plan.dueAt), asc(planTask.sortOrder), asc(planTask.createdAt));
}

export async function createPlanTask(
  userId: string,
  planId: string,
  title: string,
) {
  const existing = await getActivePlan(userId, planId);
  if (!existing || existing.kind !== PLAN_KIND_CYCLE) return null;
  const trimmed = title.trim();
  if (!trimmed) return null;

  const existingTasks = await listPlanTasks(userId, planId);
  const now = new Date();
  const id = newId();
  await getDb().insert(planTask).values({
    id,
    userId,
    planId,
    title: trimmed,
    status: PLAN_TASK_STATUS_OPEN,
    checkCount: 0,
    lastCheckinDate: null,
    sortOrder: existingTasks.length,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** 子任务打卡：+1 次数；同一本地日仅一次；不完成轮期 */
export async function checkinPlanTask(
  userId: string,
  taskId: string,
  now = new Date(),
): Promise<CheckinPlanTaskResult> {
  const rows = await getDb()
    .select({
      task: planTask,
      kind: plan.kind,
      archivedAt: plan.archivedAt,
    })
    .from(planTask)
    .innerJoin(plan, eq(plan.id, planTask.planId))
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row || row.archivedAt || row.kind !== PLAN_KIND_CYCLE) {
    return { ok: false, error: "not_found" };
  }

  const today = localTaskCheckinDate(now);
  if (taskCheckedInOnDate(row.task.lastCheckinDate, today)) {
    return { ok: false, error: "already_today" };
  }

  const nextCount = (row.task.checkCount ?? 0) + 1;
  await getDb()
    .update(planTask)
    .set({
      checkCount: nextCount,
      lastCheckinDate: today,
      status: PLAN_TASK_STATUS_OPEN,
      updatedAt: now,
    })
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)));
  // 参照日课：打卡即把子任务名与次数写入轮期系列馆藏（不计本期次数）
  await syncCycleArchiveTaskSnapshot(userId, row.task.planId, now);
  return { ok: true, checkCount: nextCount, lastCheckinDate: today };
}

/** 取消今日子任务打卡：次数 -1，清除今日标记，并同步轮期馆藏快照 */
export async function cancelPlanTaskCheckin(
  userId: string,
  taskId: string,
  now = new Date(),
): Promise<CancelPlanTaskCheckinResult> {
  const rows = await getDb()
    .select({
      task: planTask,
      kind: plan.kind,
      archivedAt: plan.archivedAt,
    })
    .from(planTask)
    .innerJoin(plan, eq(plan.id, planTask.planId))
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row || row.archivedAt || row.kind !== PLAN_KIND_CYCLE) {
    return { ok: false, error: "not_found" };
  }

  const today = localTaskCheckinDate(now);
  if (!taskCheckedInOnDate(row.task.lastCheckinDate, today)) {
    return { ok: false, error: "not_today" };
  }

  const nextCount = Math.max(0, (row.task.checkCount ?? 0) - 1);
  await getDb()
    .update(planTask)
    .set({
      checkCount: nextCount,
      lastCheckinDate: null,
      updatedAt: now,
    })
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)));
  await syncCycleArchiveTaskSnapshot(userId, row.task.planId, now);
  return { ok: true, checkCount: nextCount };
}

export async function deletePlanTask(userId: string, taskId: string) {
  const rows = await getDb()
    .select({ task: planTask, archivedAt: plan.archivedAt, kind: plan.kind })
    .from(planTask)
    .innerJoin(plan, eq(plan.id, planTask.planId))
    .where(
      and(
        eq(planTask.id, taskId),
        eq(planTask.userId, userId),
        isNull(plan.archivedAt),
      ),
    )
    .limit(1);
  if (!rows[0] || rows[0].kind !== PLAN_KIND_CYCLE) return false;
  await getDb()
    .delete(planTask)
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)));
  return true;
}

/** 轮期滚下一期：带走子任务、累计次数与今日打卡标记 */
export async function copyPlanTasksToPlan(
  userId: string,
  fromPlanId: string,
  toPlanId: string,
) {
  const tasks = await listPlanTasks(userId, fromPlanId);
  if (tasks.length === 0) return;
  const now = new Date();
  await getDb().insert(planTask).values(
    tasks.map((t, i) => ({
      id: newId(),
      userId,
      planId: toPlanId,
      title: t.title,
      status: PLAN_TASK_STATUS_OPEN,
      checkCount: t.checkCount ?? 0,
      lastCheckinDate: t.lastCheckinDate,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export function planTaskProgress(tasks: PlanTaskRecord[]) {
  if (tasks.length === 0) return { done: 0, total: 0, label: "无子任务" };
  const punches = tasks.reduce((sum, t) => sum + (t.checkCount ?? 0), 0);
  return {
    done: punches,
    total: tasks.length,
    label: `${tasks.length} 项 · 共打卡 ${punches} 次`,
  };
}
