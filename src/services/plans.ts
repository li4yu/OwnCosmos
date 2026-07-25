import { randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  PLAN_KIND_ONCE,
  PLAN_STATUS_DONE,
  PLAN_STATUS_OPEN,
  plan,
} from "@/db/schema";

function newId() {
  return randomBytes(16).toString("hex");
}

export type PlanRecord = typeof plan.$inferSelect;
export type PlanStatus =
  | typeof PLAN_STATUS_OPEN
  | typeof PLAN_STATUS_DONE;

/** 未归档规划（含已完成） */
export async function listActivePlans(userId: string) {
  return getDb()
    .select()
    .from(plan)
    .where(and(eq(plan.userId, userId), isNull(plan.archivedAt)))
    .orderBy(asc(plan.dueAt), asc(plan.createdAt));
}

export async function getActivePlan(userId: string, planId: string) {
  const rows = await getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.id, planId),
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createPlan(
  userId: string,
  input: { title: string; body: string; dueAt: Date },
) {
  const now = new Date();
  const id = newId();
  const title = input.title.trim() || "无标题";
  await getDb().insert(plan).values({
    id,
    userId,
    kind: PLAN_KIND_ONCE,
    title,
    body: input.body,
    dueAt: input.dueAt,
    status: PLAN_STATUS_OPEN,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updatePlan(
  userId: string,
  planId: string,
  input: { title: string; body: string; dueAt: Date },
) {
  const existing = await getActivePlan(userId, planId);
  if (!existing) return null;
  const now = new Date();
  const title = input.title.trim() || "无标题";
  await getDb()
    .update(plan)
    .set({
      title,
      body: input.body,
      dueAt: input.dueAt,
      updatedAt: now,
    })
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)));
  return planId;
}

export async function setPlanStatus(
  userId: string,
  planId: string,
  status: PlanStatus,
) {
  const existing = await getActivePlan(userId, planId);
  if (!existing) return null;
  await getDb()
    .update(plan)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)));
  return planId;
}

export async function deleteActivePlan(userId: string, planId: string) {
  const existing = await getActivePlan(userId, planId);
  if (!existing) return false;
  await getDb()
    .delete(plan)
    .where(
      and(
        eq(plan.id, planId),
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
      ),
    );
  return true;
}

export function planStatusLabel(status: string) {
  return status === PLAN_STATUS_DONE ? "已完成" : "未完成";
}
