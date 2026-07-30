import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_PLAN_COMPLETE,
  ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
  ARCHIVE_REASON_PLAN_OVERDUE,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
  PLAN_KIND_CAPSULE,
  PLAN_KIND_CYCLE,
  PLAN_KIND_ONCE,
  PLAN_STATUS_DONE,
  PLAN_STATUS_OPEN,
  archiveItem,
  essay,
  plan,
} from "@/db/schema";
import { calendarDaysUntilDue, localTodayNoon } from "@/lib/plan-dates";
import {
  advanceCycleDue,
  isCapsuleLocked,
  isCycleUnit,
  participatesInDueReminders,
  PLANNING_KINDS,
  type CycleUnit,
  type PlanKind,
} from "@/lib/plan-kinds";
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

export type CreatePlanInput = {
  title: string;
  body: string;
  dueAt: Date | null;
  remindDays?: number;
  kind?: PlanKind;
  sourceEssayId?: string | null;
  cycleUnit?: CycleUnit | null;
  seriesId?: string | null;
  parentPlanId?: string | null;
};

export function isInRemindWindow(
  dueAt: Date,
  remindDays: number,
  now = new Date(),
) {
  const days = calendarDaysUntilDue(dueAt, now);
  return days <= remindDays;
}

function redactIfLocked(row: PlanRecord, now = new Date()): PlanRecord {
  if (!isCapsuleLocked(row.kind, row.dueAt, now)) return row;
  return { ...row, body: "" };
}

/** 未完成：未归档且 open；可按 kind 过滤 */
export async function listOpenPlans(
  userId: string,
  kinds?: readonly PlanKind[],
) {
  const conditions = [
    eq(plan.userId, userId),
    isNull(plan.archivedAt),
    eq(plan.status, PLAN_STATUS_OPEN),
  ];
  if (kinds && kinds.length > 0) {
    conditions.push(inArray(plan.kind, [...kinds]));
  }
  const rows = await getDb()
    .select()
    .from(plan)
    .where(and(...conditions))
    .orderBy(asc(plan.dueAt), asc(plan.createdAt));
  return rows.map((row) => redactIfLocked(row));
}

export async function listOpenPlanningPlans(userId: string) {
  return listOpenPlans(userId, PLANNING_KINDS);
}

export async function listOpenCyclePlans(userId: string) {
  return listOpenPlans(userId, [PLAN_KIND_CYCLE]);
}

export async function listOpenCapsulePlans(userId: string) {
  return listOpenPlans(userId, [PLAN_KIND_CAPSULE]);
}

/** 已到解锁日、尚未归档的胶囊（供信封提醒） */
export async function listUnlockReadyCapsules(
  userId: string,
  now = new Date(),
) {
  const rows = await listOpenCapsulePlans(userId);
  return rows
    .filter((row) => row.dueAt && !isCapsuleLocked(row.kind, row.dueAt, now))
    .sort(
      (a, b) =>
        (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
}

/**
 * 已完成：已归档，或仅标 done 尚未归档的遗留数据
 * 附带馆藏条目 id（若有）便于跳转
 */
export async function listCompletedPlans(
  userId: string,
  kinds?: readonly PlanKind[],
) {
  const conditions = [
    eq(plan.userId, userId),
    or(isNotNull(plan.archivedAt), eq(plan.status, PLAN_STATUS_DONE)),
  ];
  if (kinds && kinds.length > 0) {
    conditions.push(inArray(plan.kind, [...kinds]));
  }
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
    .where(and(...conditions))
    .orderBy(desc(plan.archivedAt), desc(plan.updatedAt));

  return rows.map((r) => ({
    ...redactIfLocked(r.plan),
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
  const row = rows[0];
  if (!row) return null;
  return redactIfLocked(row);
}

/** 编辑页：含胶囊锁定标记与原文（仅未锁定时） */
export async function getActivePlanForEdit(userId: string, planId: string) {
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
  const row = rows[0];
  if (!row) return null;
  const locked = isCapsuleLocked(row.kind, row.dueAt);
  return {
    ...row,
    body: locked ? "" : row.body,
    capsuleLocked: locked,
  };
}

export type PlanSourceLink = {
  essayId: string;
  title: string;
  href: string;
  archived: boolean;
};

/** 计划溯源随笔：流动中 → 编辑页；已归档 → 馆藏详情 */
export async function resolvePlanSourceLink(
  userId: string,
  sourceEssayId: string | null | undefined,
): Promise<PlanSourceLink | null> {
  if (!sourceEssayId) return null;
  const essays = await getDb()
    .select()
    .from(essay)
    .where(and(eq(essay.id, sourceEssayId), eq(essay.userId, userId)))
    .limit(1);
  const e = essays[0];
  if (!e) return null;
  if (!e.archivedAt) {
    return {
      essayId: e.id,
      title: e.title,
      href: `/app/present/essays/${e.id}`,
      archived: false,
    };
  }
  const archives = await getDb()
    .select()
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        eq(archiveItem.sourceEssayId, e.id),
        eq(archiveItem.type, ARCHIVE_TYPE_ESSAY_SEDIMENT),
      ),
    )
    .orderBy(desc(archiveItem.archivedAt))
    .limit(1);
  const arch = archives[0];
  return {
    essayId: e.id,
    title: e.title,
    href: arch
      ? `/app/past/gallery/${arch.id}?section=essay-sediment`
      : "/app/past/gallery/essay-sediment",
    archived: true,
  };
}

/** 临期帖：进入提醒窗、且未完成的未归档计划（排除胶囊与无截止） */
export async function listDueReminderPlans(userId: string, now = new Date()) {
  const rows = await listOpenPlans(userId);
  const dueRows: Array<PlanRecord & { dueAt: Date; daysLeft: number }> = [];
  for (const row of rows) {
    if (!row.dueAt || !participatesInDueReminders(row.kind, row.dueAt)) continue;
    if (!isInRemindWindow(row.dueAt, row.remindDays, now)) continue;
    dueRows.push({
      ...row,
      dueAt: row.dueAt,
      daysLeft: calendarDaysUntilDue(row.dueAt, now),
    });
  }
  return dueRows.sort(
    (a, b) =>
      a.daysLeft - b.daysLeft || a.dueAt.getTime() - b.dueAt.getTime(),
  );
}

export async function createPlan(userId: string, input: CreatePlanInput) {
  const now = new Date();
  const id = newId();
  const title = input.title.trim() || "无标题";
  const kind = input.kind ?? PLAN_KIND_ONCE;
  const dueAt = input.dueAt;
  const seriesId =
    kind === PLAN_KIND_CYCLE
      ? (input.seriesId ?? newId())
      : (input.seriesId ?? null);
  const cycleUnit = kind === PLAN_KIND_CYCLE ? (input.cycleUnit ?? null) : null;

  await getDb().insert(plan).values({
    id,
    userId,
    kind,
    title,
    body: input.body,
    dueAt,
    // 轮期不使用临期配，存默认值即可
    remindDays:
      kind === PLAN_KIND_CYCLE
        ? DEFAULT_REMIND_DAYS
        : dueAt
          ? clampRemindDays(input.remindDays ?? DEFAULT_REMIND_DAYS, dueAt)
          : DEFAULT_REMIND_DAYS,
    status: PLAN_STATUS_OPEN,
    archivedAt: null,
    sourceEssayId: input.sourceEssayId ?? null,
    cycleUnit,
    seriesId,
    parentPlanId: input.parentPlanId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/** 流思笺提炼：预填标题正文，默认 once，截止默认今天（可再改） */
export async function refineEssayToPlan(
  userId: string,
  essayId: string,
  dueAt: Date,
) {
  const rows = await getDb()
    .select()
    .from(essay)
    .where(
      and(
        eq(essay.id, essayId),
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
      ),
    )
    .limit(1);
  const e = rows[0];
  if (!e) return null;
  return createPlan(userId, {
    title: e.title,
    body: e.body,
    dueAt,
    kind: PLAN_KIND_ONCE,
    sourceEssayId: e.id,
  });
}

export async function updatePlan(
  userId: string,
  planId: string,
  input: {
    title: string;
    body: string;
    dueAt: Date | null;
    remindDays: number;
    cycleUnit?: CycleUnit | null;
  },
) {
  const existing = await getActivePlan(userId, planId);
  if (!existing) return null;
  // 时间胶囊封存后不可修改
  if (existing.kind === PLAN_KIND_CAPSULE) return null;
  const locked = isCapsuleLocked(existing.kind, existing.dueAt);
  if (locked) return null;

  const now = new Date();
  const title = input.title.trim() || "无标题";
  const patch: Partial<PlanRecord> = {
    title,
    body: input.body,
    dueAt: input.dueAt,
    remindDays:
      existing.kind === PLAN_KIND_CYCLE
        ? existing.remindDays
        : input.dueAt
          ? clampRemindDays(input.remindDays, input.dueAt)
          : existing.remindDays,
    updatedAt: now,
  };
  if (
    existing.kind === PLAN_KIND_CYCLE &&
    input.cycleUnit &&
    isCycleUnit(input.cycleUnit)
  ) {
    patch.cycleUnit = input.cycleUnit;
  }
  await getDb()
    .update(plan)
    .set(patch)
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
    | typeof ARCHIVE_REASON_PLAN_OVERDUE
    | typeof ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
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
    sourceEssayId: row.sourceEssayId,
    sourcePlanId: row.id,
    archiveReason: reason,
    archivedAt,
    sourceCreatedAt: row.createdAt,
    sourceUpdatedAt: row.updatedAt,
  });
  return id;
}

/**
 * 轮期系列计次归档：同 series 只保留一条馆藏，cycle_count +1
 */
async function upsertCycleSeriesArchive(
  row: PlanRecord,
  reason:
    | typeof ARCHIVE_REASON_PLAN_COMPLETE
    | typeof ARCHIVE_REASON_PLAN_OVERDUE
    | typeof ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
  archivedAt: Date,
  note?: string,
) {
  const seriesId = row.seriesId ?? row.id;
  const body = note?.trim() || row.body;
  const existing = await getDb()
    .select()
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, row.userId),
        eq(archiveItem.type, ARCHIVE_TYPE_PLAN_CYCLE),
        eq(archiveItem.sourceSeriesId, seriesId),
      ),
    )
    .limit(1);

  const prev = existing[0];
  if (prev) {
    await getDb()
      .update(archiveItem)
      .set({
        title: row.title,
        body,
        sourcePlanId: row.id,
        sourceEssayId: row.sourceEssayId,
        cycleCount: (prev.cycleCount ?? 0) + 1,
        cycleUnit: row.cycleUnit ?? prev.cycleUnit,
        archiveReason: reason,
        archivedAt,
        sourceUpdatedAt: row.updatedAt,
      })
      .where(eq(archiveItem.id, prev.id));
    return prev.id;
  }

  const id = newId();
  await getDb().insert(archiveItem).values({
    id,
    userId: row.userId,
    type: ARCHIVE_TYPE_PLAN_CYCLE,
    title: row.title,
    body,
    sourceModule: "future",
    sourceEssayId: row.sourceEssayId,
    sourcePlanId: row.id,
    sourceSeriesId: seriesId,
    cycleCount: 1,
    cycleUnit: row.cycleUnit,
    archiveReason: reason,
    archivedAt,
    sourceCreatedAt: row.createdAt,
    sourceUpdatedAt: row.updatedAt,
  });
  return id;
}

/**
 * 完成并归档：写规划归档快照 + plan.archived_at + status=done
 * 轮期走系列计次（plan_cycle_archive），不每期新增一条
 */
export async function completeAndArchivePlan(
  userId: string,
  planId: string,
  reason:
    | typeof ARCHIVE_REASON_PLAN_COMPLETE
    | typeof ARCHIVE_REASON_PLAN_OVERDUE
    | typeof ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER = ARCHIVE_REASON_PLAN_COMPLETE,
) {
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
  const row = rows[0];
  if (!row) return null;
  // 时间胶囊不走完成归档
  if (row.kind === PLAN_KIND_CAPSULE) return null;
  // 轮期手动完成：未到期不允许（与首页打卡一致）；逾期补算走 rolloverCyclePlan
  if (
    row.kind === PLAN_KIND_CYCLE &&
    reason === ARCHIVE_REASON_PLAN_COMPLETE &&
    !canCompleteCyclePeriod(row.dueAt)
  ) {
    return null;
  }
  const now = new Date();
  const archiveId =
    row.kind === PLAN_KIND_CYCLE
      ? await upsertCycleSeriesArchive(row, reason, now, undefined)
      : await insertPlanArchive(row, reason, now);
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

/**
 * 轮期滚下一期：当期计次归档 + 同 series 开新一期
 * @param note 打卡心得（写入系列馆藏正文）
 */
export async function rolloverCyclePlan(
  userId: string,
  planId: string,
  note?: string,
) {
  const rows = await getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.id, planId),
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
        eq(plan.kind, PLAN_KIND_CYCLE),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row || !row.dueAt || !row.cycleUnit || !isCycleUnit(row.cycleUnit)) {
    return null;
  }
  const now = new Date();
  const archiveId = await upsertCycleSeriesArchive(
    row,
    ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
    now,
    note,
  );
  await getDb()
    .update(plan)
    .set({
      status: PLAN_STATUS_DONE,
      archivedAt: now,
      updatedAt: now,
    })
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)));

  const nextDue = advanceCycleDue(row.dueAt, row.cycleUnit);
  const nextId = await createPlan(userId, {
    title: row.title,
    body: row.body,
    dueAt: nextDue,
    remindDays: row.remindDays,
    kind: PLAN_KIND_CYCLE,
    cycleUnit: row.cycleUnit,
    seriesId: row.seriesId ?? newId(),
    sourceEssayId: row.sourceEssayId,
    parentPlanId: row.parentPlanId,
  });
  return { archiveId, nextId };
}

/**
 * 本期是否已到可完成日（截止日当天或已逾期）
 * 未到期不允许「完成本期」，避免滚出下一期后立刻再打完
 */
export function canCompleteCyclePeriod(
  dueAt: Date | null | undefined,
  now = new Date(),
) {
  if (!dueAt) return false;
  return calendarDaysUntilDue(dueAt, now) <= 0;
}

/**
 * 首页快捷打卡：完成本期并滚下一期（可附心得）
 * 仅允许到期日当天及之后
 */
export async function checkinCyclePlan(
  userId: string,
  planId: string,
  note: string,
): Promise<
  | { ok: true; archiveId: string; nextId: string }
  | { ok: false; error: string }
> {
  const rows = await getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.id, planId),
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
        eq(plan.kind, PLAN_KIND_CYCLE),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: "轮期不存在或已归档" };
  if (!canCompleteCyclePeriod(row.dueAt)) {
    return {
      ok: false,
      error: "本期尚未到期。到期当天起才能完成本期并开启下一期。",
    };
  }
  const result = await rolloverCyclePlan(userId, planId, note);
  if (!result) return { ok: false, error: "无法完成本期，请检查轮期设置" };
  return { ok: true, ...result };
}

/**
 * 进站补算：
 * - 轮期逾期 → 滚期
 * - 胶囊不自动归档
 * - 其余有截止日且逾期 → 逾期归档
 */
export async function catchUpOverduePlanArchives(
  userId: string,
  now = new Date(),
) {
  const today = localTodayNoon(now);
  const overdue = await getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
        isNotNull(plan.dueAt),
        lt(plan.dueAt, today),
      ),
    );

  let count = 0;
  for (const row of overdue) {
    if (!row.dueAt) continue;
    if (calendarDaysUntilDue(row.dueAt, now) >= 0) continue;
    if (row.kind === PLAN_KIND_CAPSULE) continue;
    if (row.kind === PLAN_KIND_CYCLE) {
      const result = await rolloverCyclePlan(userId, row.id);
      if (result) count += 1;
      continue;
    }
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
  // 胶囊仅解锁后可删
  if (
    existing.kind === PLAN_KIND_CAPSULE &&
    isCapsuleLocked(existing.kind, existing.dueAt)
  ) {
    return false;
  }
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
