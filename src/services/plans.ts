import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_PLAN_COMPLETE,
  ARCHIVE_REASON_PLAN_OVERDUE,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  PLAN_KIND_ONCE,
  PLAN_STATUS_DONE,
  PLAN_STATUS_OPEN,
  archiveItem,
  plan,
} from "@/db/schema";
import { calendarDaysUntilDue, localTodayNoon } from "@/lib/plan-dates";
import { clampRemindDays, DEFAULT_REMIND_DAYS } from "@/lib/plan-remind";

export {
  clampRemindDays,
  DEFAULT_REMIND_DAYS,
  maxRemindDaysForDue,
  remindPresetsForDue,
} from "@/lib/plan-remind";
export { calendarDaysUntilDue } from "@/lib/plan-dates";

function newId() {
  return randomBytes(16).toString("hex");
}

export type PlanRecord = typeof plan.$inferSelect;
export type PlanStatus =
  | typeof PLAN_STATUS_OPEN
  | typeof PLAN_STATUS_DONE;

export function isInRemindWindow(
  dueAt: Date,
  remindDays: number,
  now = new Date(),
) {
  const days = calendarDaysUntilDue(dueAt, now);
  return days <= remindDays;
}

/** 未完成：未归档且 open（来日途进行中） */
export async function listOpenPlans(userId: string) {
  return getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
        eq(plan.status, PLAN_STATUS_OPEN),
      ),
    )
    .orderBy(asc(plan.dueAt), asc(plan.createdAt));
}

/**
 * 已完成：已归档，或仅标 done 尚未归档的遗留数据
 * 附带馆藏条目 id（若有）便于跳转
 */
export async function listCompletedPlans(userId: string) {
  const rows = await getDb()
    .select({
      plan,
      archiveId: archiveItem.id,
    })
    .from(plan)
    .leftJoin(
      archiveItem,
      and(
        eq(archiveItem.sourcePlanId, plan.id),
        eq(archiveItem.userId, userId),
        eq(archiveItem.type, ARCHIVE_TYPE_PLAN_ARCHIVE),
      ),
    )
    .where(
      and(
        eq(plan.userId, userId),
        or(isNotNull(plan.archivedAt), eq(plan.status, PLAN_STATUS_DONE)),
      ),
    )
    .orderBy(desc(plan.archivedAt), desc(plan.updatedAt));

  return rows.map((r) => ({
    ...r.plan,
    archiveId: r.archiveId ?? null,
  }));
}

/** @deprecated 使用 listOpenPlans；保留给补算等需要「未归档含 done」的场景 */
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

/** 临期帖：进入提醒窗、且未完成的未归档计划 */
export async function listDueReminderPlans(userId: string, now = new Date()) {
  const rows = await listOpenPlans(userId);
  return rows
    .filter((row) => isInRemindWindow(row.dueAt, row.remindDays, now))
    .map((row) => {
      const daysLeft = calendarDaysUntilDue(row.dueAt, now);
      return { ...row, daysLeft };
    })
    .sort(
      (a, b) =>
        a.daysLeft - b.daysLeft || a.dueAt.getTime() - b.dueAt.getTime(),
    );
}

export async function createPlan(
  userId: string,
  input: {
    title: string;
    body: string;
    dueAt: Date;
    remindDays?: number;
  },
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
    remindDays: clampRemindDays(input.remindDays ?? DEFAULT_REMIND_DAYS, input.dueAt),
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
  input: {
    title: string;
    body: string;
    dueAt: Date;
    remindDays: number;
  },
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
      remindDays: clampRemindDays(input.remindDays, input.dueAt),
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

async function insertPlanArchive(
  row: PlanRecord,
  reason:
    | typeof ARCHIVE_REASON_PLAN_COMPLETE
    | typeof ARCHIVE_REASON_PLAN_OVERDUE,
  archivedAt: Date,
) {
  const id = newId();
  await getDb().insert(archiveItem).values({
    id,
    userId: row.userId,
    type: ARCHIVE_TYPE_PLAN_ARCHIVE,
    title: row.title,
    body: row.body,
    sourceModule: "future",
    sourceEssayId: null,
    sourcePlanId: row.id,
    archiveReason: reason,
    archivedAt,
    sourceCreatedAt: row.createdAt,
    sourceUpdatedAt: row.updatedAt,
  });
  return id;
}

/**
 * 完成并归档：写规划归档快照 + plan.archived_at + status=done
 */
export async function completeAndArchivePlan(
  userId: string,
  planId: string,
  reason:
    | typeof ARCHIVE_REASON_PLAN_COMPLETE
    | typeof ARCHIVE_REASON_PLAN_OVERDUE = ARCHIVE_REASON_PLAN_COMPLETE,
) {
  const row = await getActivePlan(userId, planId);
  if (!row) return null;
  const now = new Date();
  const archiveId = await insertPlanArchive(row, reason, now);
  await getDb()
    .update(plan)
    .set({
      status: PLAN_STATUS_DONE,
      archivedAt: now,
      updatedAt: now,
    })
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)));
  return archiveId;
}

/** 进站补算：截止日期已过仍未归档的计划 → 馆藏 */
export async function catchUpOverduePlanArchives(userId: string, now = new Date()) {
  const today = localTodayNoon(now);
  const overdue = await getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
        lt(plan.dueAt, today),
      ),
    );

  let count = 0;
  for (const row of overdue) {
    // dueAt 存正午；严格「早于今天」才逾期（今天到期仍可点完成）
    if (calendarDaysUntilDue(row.dueAt, now) >= 0) continue;
    await completeAndArchivePlan(
      userId,
      row.id,
      ARCHIVE_REASON_PLAN_OVERDUE,
    );
    count += 1;
  }
  return count;
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
