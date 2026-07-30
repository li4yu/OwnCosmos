import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  PLAN_TASK_STATUS_DEFERRED,
  PLAN_TASK_STATUS_DONE,
  PLAN_TASK_STATUS_OPEN,
  plan,
  planTask,
} from "@/db/schema";
import { getActivePlan } from "@/services/plans";

function newId() {
  return randomBytes(16).toString("hex");
}

export type PlanTaskRecord = typeof planTask.$inferSelect;
export type PlanTaskStatus =
  | typeof PLAN_TASK_STATUS_OPEN
  | typeof PLAN_TASK_STATUS_DONE
  | typeof PLAN_TASK_STATUS_DEFERRED;

export async function listPlanTasks(userId: string, planId: string) {
  return getDb()
    .select()
    .from(planTask)
    .where(and(eq(planTask.userId, userId), eq(planTask.planId, planId)))
    .orderBy(asc(planTask.sortOrder), asc(planTask.createdAt));
}

export async function createPlanTask(
  userId: string,
  planId: string,
  title: string,
) {
  const existing = await getActivePlan(userId, planId);
  if (!existing) return null;
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
    sortOrder: existingTasks.length,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function setPlanTaskStatus(
  userId: string,
  taskId: string,
  status: PlanTaskStatus,
) {
  const rows = await getDb()
    .select({ task: planTask, archivedAt: plan.archivedAt })
    .from(planTask)
    .innerJoin(plan, eq(plan.id, planTask.planId))
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row || row.archivedAt) return false;

  await getDb()
    .update(planTask)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)));
  return true;
}

export async function deletePlanTask(userId: string, taskId: string) {
  const rows = await getDb()
    .select({ task: planTask, archivedAt: plan.archivedAt })
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
  if (!rows[0]) return false;
  await getDb()
    .delete(planTask)
    .where(and(eq(planTask.id, taskId), eq(planTask.userId, userId)));
  return true;
}

export function planTaskProgress(tasks: PlanTaskRecord[]) {
  if (tasks.length === 0) return { done: 0, total: 0, label: "无子任务" };
  const done = tasks.filter((t) => t.status === PLAN_TASK_STATUS_DONE).length;
  return {
    done,
    total: tasks.length,
    label: `${done}/${tasks.length}`,
  };
}
