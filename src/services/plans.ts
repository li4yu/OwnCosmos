import { randomBytes } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_PLAN_COMPLETE,
  ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
  ARCHIVE_REASON_PLAN_OVERDUE,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
  CYCLE_UNIT_CUSTOM,
  CYCLE_UNIT_DAY,
  PLAN_KIND_CAPSULE,
  PLAN_KIND_CYCLE,
  PLAN_KIND_ONCE,
  PLAN_STATUS_DONE,
  PLAN_STATUS_OPEN,
  archiveItem,
  essay,
  plan,
  planTask,
} from "@/db/schema";
import { mergeDatedArchiveBody, parseDatedNotes } from "@/lib/dated-notes";
import {
  calendarDaysUntilDue,
  formatDueDateInput,
  localTodayNoon,
} from "@/lib/plan-dates";
import {
  advanceCycleDue,
  clampCycleEveryDays,
  isCapsuleLocked,
  isCycleUnit,
  participatesInDueReminders,
  PLANNING_KINDS,
  type CycleUnit,
  type PlanKind,
} from "@/lib/plan-kinds";
import { parseMoodKey, type MoodKey } from "@/lib/moods";
import { clampListPageSize } from "@/lib/list-paging";
import { PLAN_PAGE_SIZE } from "@/lib/plan-query";
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
  cycleEveryDays?: number | null;
  seriesId?: string | null;
  parentPlanId?: string | null;
  mood?: string | null;
};

function resolveCycleEveryDays(
  kind: PlanKind | string,
  cycleUnit: CycleUnit | string | null | undefined,
  raw: number | null | undefined,
) {
  if (kind !== PLAN_KIND_CYCLE || cycleUnit !== CYCLE_UNIT_CUSTOM) return null;
  return clampCycleEveryDays(raw ?? NaN);
}

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

function escapeIlike(raw: string) {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export type PlanQueryOpts = {
  titleQ?: string;
  tagId?: string;
  mood?: MoodKey;
  kind?: PlanKind;
  kinds?: readonly PlanKind[];
  /** 按 due_at；无截止的愿景在筛「有截止起止」时会被排除 */
  dueFrom?: Date;
  dueTo?: Date;
  page?: number;
  pageSize?: number;
};

function buildPlanFilterConditions(
  userId: string,
  opts: PlanQueryOpts,
  base: SQL[],
): SQL | undefined {
  const conditions: SQL[] = [...base];
  const kinds =
    opts.kind != null
      ? [opts.kind]
      : opts.kinds && opts.kinds.length > 0
        ? [...opts.kinds]
        : null;
  if (kinds) conditions.push(inArray(plan.kind, kinds));

  const q = opts.titleQ?.trim();
  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    conditions.push(
      or(ilike(plan.title, pattern), ilike(plan.body, pattern))!,
    );
  }
  if (opts.mood) conditions.push(eq(plan.mood, opts.mood));
  if (opts.dueFrom || opts.dueTo) {
    conditions.push(isNotNull(plan.dueAt));
    if (opts.dueFrom) conditions.push(gte(plan.dueAt, opts.dueFrom));
    if (opts.dueTo) conditions.push(lte(plan.dueAt, opts.dueTo));
  }
  if (opts.tagId?.trim()) {
    const tagId = opts.tagId.trim();
    conditions.push(
      sql`exists (
        select 1 from plan_tag pt
        where pt.plan_id = ${plan.id}
          and pt.user_id = ${userId}
          and pt.tag_id = ${tagId}
      )`,
    );
  }
  return and(...conditions);
}

/** 规划页：未完成（open + 未归档）分页 */
export async function queryOpenPlanningPlans(
  userId: string,
  opts: PlanQueryOpts = {},
) {
  const pageSize = clampListPageSize(opts.pageSize ?? PLAN_PAGE_SIZE);
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const where = buildPlanFilterConditions(userId, opts, [
    eq(plan.userId, userId),
    isNull(plan.archivedAt),
    eq(plan.status, PLAN_STATUS_OPEN),
  ]);

  const [totalRow] = await getDb()
    .select({ n: count() })
    .from(plan)
    .where(where);
  const total = totalRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const rows = await getDb()
    .select()
    .from(plan)
    .where(where)
    .orderBy(asc(plan.dueAt), asc(plan.createdAt))
    .limit(pageSize)
    .offset((safePage - 1) * pageSize);

  return {
    items: rows.map((row) => redactIfLocked(row)),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

/** 规划页：已完成分页（附 archiveId） */
export async function queryCompletedPlanningPlans(
  userId: string,
  opts: PlanQueryOpts = {},
) {
  const pageSize = clampListPageSize(opts.pageSize ?? PLAN_PAGE_SIZE);
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const where = buildPlanFilterConditions(userId, opts, [
    eq(plan.userId, userId),
    or(isNotNull(plan.archivedAt), eq(plan.status, PLAN_STATUS_DONE))!,
  ]);

  // 先取去重后的 plan id 再分页较稳妥；量级可控时用窗口简化：
  // 查全部匹配 id 再切片（规划页通常不多）。若担心性能可再改子查询。
  const matched = await getDb()
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
    .where(where)
    .orderBy(desc(plan.archivedAt), desc(plan.updatedAt));

  const byPlanId = new Map<
    string,
    PlanRecord & { archiveId: string | null }
  >();
  for (const r of matched) {
    const next = {
      ...redactIfLocked(r.plan),
      archiveId: r.archiveId ?? null,
    };
    const prev = byPlanId.get(next.id);
    if (!prev) {
      byPlanId.set(next.id, next);
      continue;
    }
    if (!prev.archiveId && next.archiveId) byPlanId.set(next.id, next);
  }
  const all = [...byPlanId.values()];
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const items = all.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return { items, total, page: safePage, pageSize, totalPages };
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

  // 同一 plan 若有多条 plan_archive 快照，join 会炸行；按 plan.id 去重
  const byPlanId = new Map<
    string,
    PlanRecord & { archiveId: string | null }
  >();
  for (const r of rows) {
    const next = {
      ...redactIfLocked(r.plan),
      archiveId: r.archiveId ?? null,
    };
    const prev = byPlanId.get(next.id);
    if (!prev) {
      byPlanId.set(next.id, next);
      continue;
    }
    if (!prev.archiveId && next.archiveId) {
      byPlanId.set(next.id, next);
    }
  }
  return [...byPlanId.values()];
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
  // 当日置顶，其余按剩余天数升序
  return dueRows.sort((a, b) => {
    const aToday = a.daysLeft === 0 ? 0 : 1;
    const bToday = b.daysLeft === 0 ? 0 : 1;
    return (
      aToday - bToday ||
      a.daysLeft - b.daysLeft ||
      a.dueAt.getTime() - b.dueAt.getTime()
    );
  });
}

/** 临期帖延期：回写 due_at */
export async function postponeDuePlan(
  userId: string,
  planId: string,
  newDueAt: Date,
) {
  const existing = await getActivePlan(userId, planId);
  if (!existing) return null;
  if (existing.kind === PLAN_KIND_CAPSULE) return null;
  const now = new Date();
  const remindDays =
    existing.kind === PLAN_KIND_CYCLE
      ? existing.remindDays
      : clampRemindDays(existing.remindDays, newDueAt);
  await getDb()
    .update(plan)
    .set({
      dueAt: newDueAt,
      remindDays,
      updatedAt: now,
    })
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)));
  return planId;
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
  const cycleEveryDays = resolveCycleEveryDays(
    kind,
    cycleUnit,
    input.cycleEveryDays,
  );

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
    cycleEveryDays,
    seriesId,
    parentPlanId: input.parentPlanId ?? null,
    mood: parseMoodKey(input.mood),
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
    cycleEveryDays?: number | null;
    mood?: string | null;
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
  if (input.mood !== undefined) {
    patch.mood = parseMoodKey(input.mood);
  }
  if (
    existing.kind === PLAN_KIND_CYCLE &&
    input.cycleUnit &&
    isCycleUnit(input.cycleUnit)
  ) {
    patch.cycleUnit = input.cycleUnit;
    patch.cycleEveryDays = resolveCycleEveryDays(
      existing.kind,
      input.cycleUnit,
      input.cycleEveryDays,
    );
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
    inKnowledge: true,
    keptAt: archivedAt,
    mood: row.mood,
  });
  const { copyPlanTagsToArchive } = await import("@/services/tags");
  await copyPlanTagsToArchive(row.userId, row.id, id);
  const { scheduleArchiveRagUpsert } = await import("@/ai");
  scheduleArchiveRagUpsert(row.userId, id);
  return id;
}

/** 去掉段落中的「子任务」快照段，保留心得 */
function stripCycleTaskSnapshot(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const cut = trimmed.search(/\n\n子任务\n/);
  if (cut >= 0) return trimmed.slice(0, cut).trim();
  if (trimmed === "子任务" || trimmed.startsWith("子任务\n")) return "";
  return trimmed;
}

/** 本期心得 + 子任务打卡次数快照（写入馆藏按日段落） */
function buildCyclePeriodArchiveNote(
  note: string | undefined,
  tasks: { title: string; checkCount: number }[],
) {
  const base = note?.trim() || "（已打卡）";
  if (tasks.length === 0) return base;
  const lines = tasks.map((t) => `${t.title} · ${t.checkCount} 次`);
  return `${base}\n\n子任务\n${lines.join("\n")}`;
}

/**
 * 参照日课：子任务打卡后，把「名称 · 次数」同步进轮期系列馆藏（按打卡日改写该段）。
 * 不增加 cycle_count（计次仍只在完成本期 / 滚期时 +1）。
 */
export async function syncCycleArchiveTaskSnapshot(
  userId: string,
  planId: string,
  now = new Date(),
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
  if (!row) return null;

  const tasks = await getDb()
    .select({
      title: planTask.title,
      checkCount: planTask.checkCount,
    })
    .from(planTask)
    .where(and(eq(planTask.userId, userId), eq(planTask.planId, planId)))
    .orderBy(asc(planTask.sortOrder), asc(planTask.createdAt));
  if (tasks.length === 0) return null;

  const seriesId = row.seriesId ?? row.id;
  const checkinDate = formatDueDateInput(now);
  const existing = await getDb()
    .select()
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        eq(archiveItem.type, ARCHIVE_TYPE_PLAN_CYCLE),
        eq(archiveItem.sourceSeriesId, seriesId),
      ),
    )
    .limit(1);
  const prev = existing[0];
  const { blocks } = parseDatedNotes(prev?.body ?? "");
  const dayText = blocks.find((b) => b.date === checkinDate)?.text ?? "";
  const noteOnly = stripCycleTaskSnapshot(dayText);
  const body = mergeDatedArchiveBody(
    prev?.body ?? "",
    checkinDate,
    buildCyclePeriodArchiveNote(
      noteOnly && noteOnly !== "（已打卡）" ? noteOnly : undefined,
      tasks,
    ),
    "（已打卡）",
  );

  if (prev) {
    await getDb()
      .update(archiveItem)
      .set({
        title: row.title,
        body,
        sourcePlanId: row.id,
        cycleUnit: row.cycleUnit ?? prev.cycleUnit,
        cycleEveryDays: row.cycleEveryDays ?? prev.cycleEveryDays,
        archivedAt: now,
        sourceUpdatedAt: now,
      })
      .where(eq(archiveItem.id, prev.id));
    return prev.id;
  }

  const id = newId();
  await getDb().insert(archiveItem).values({
    id,
    userId,
    type: ARCHIVE_TYPE_PLAN_CYCLE,
    title: row.title,
    body,
    sourceModule: "future",
    sourceEssayId: row.sourceEssayId,
    sourcePlanId: row.id,
    sourceSeriesId: seriesId,
    cycleCount: 0,
    cycleUnit: row.cycleUnit,
    cycleEveryDays: row.cycleEveryDays,
    archiveReason: ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
    archivedAt: now,
    sourceCreatedAt: row.createdAt,
    sourceUpdatedAt: now,
    inKnowledge: true,
    keptAt: now,
    mood: row.mood,
  });
  const { copyPlanTagsToArchive } = await import("@/services/tags");
  await copyPlanTagsToArchive(userId, row.id, id);
  const { scheduleArchiveRagUpsert } = await import("@/ai");
  scheduleArchiveRagUpsert(userId, id);
  return id;
}

/**
 * 轮期系列计次归档：同 series 只保留一条馆藏，cycle_count +1；
 * 心得按本期截止日追加（日期在前），与日课一致；有子任务时附带次数快照
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
  const periodDate = formatDueDateInput(row.dueAt ?? archivedAt);
  const tasks = await getDb()
    .select({
      title: planTask.title,
      checkCount: planTask.checkCount,
    })
    .from(planTask)
    .where(and(eq(planTask.userId, row.userId), eq(planTask.planId, row.id)))
    .orderBy(asc(planTask.sortOrder), asc(planTask.createdAt));
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
  const { blocks } = parseDatedNotes(prev?.body ?? "");
  const dayText = blocks.find((b) => b.date === periodDate)?.text ?? "";
  const preservedNote =
    note?.trim() ||
    stripCycleTaskSnapshot(dayText) ||
    undefined;
  const body = mergeDatedArchiveBody(
    prev?.body ?? "",
    periodDate,
    buildCyclePeriodArchiveNote(preservedNote, tasks),
    "（已打卡）",
  );
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
        cycleEveryDays: row.cycleEveryDays ?? prev.cycleEveryDays,
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
    cycleEveryDays: row.cycleEveryDays,
    archiveReason: reason,
    archivedAt,
    sourceCreatedAt: row.createdAt,
    sourceUpdatedAt: row.updatedAt,
    inKnowledge: true,
    keptAt: archivedAt,
    mood: row.mood,
  });
  const { copyPlanTagsToArchive } = await import("@/services/tags");
  await copyPlanTagsToArchive(row.userId, row.id, id);
  const { scheduleArchiveRagUpsert } = await import("@/ai");
  scheduleArchiveRagUpsert(row.userId, id);
  return id;
}

/**
 * 完成并归档：写规划归档快照 + plan.archived_at + status=done
 * 轮期走系列计次并滚下一期（与首页打卡同一路径）
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
  // 轮期：到期当天起可完成；完成即滚下一期
  if (row.kind === PLAN_KIND_CYCLE) {
    if (
      reason === ARCHIVE_REASON_PLAN_COMPLETE &&
      !canCompleteCyclePeriod(row.dueAt)
    ) {
      return null;
    }
    const result = await rolloverCyclePlan(userId, planId);
    return result?.archiveId ?? null;
  }
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

/**
 * 系列是否在某日做过滚期/完成本期（按 archivedAt 的本地日，避免超前滚掉的「未来截止日」被当成今日已完成）
 */
export async function seriesHasArchivedPeriodOnDate(
  userId: string,
  seriesId: string,
  dateKey: string,
) {
  const rows = await getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.userId, userId),
        eq(plan.seriesId, seriesId),
        eq(plan.kind, PLAN_KIND_CYCLE),
        isNotNull(plan.archivedAt),
      ),
    );
  return rows.some(
    (r) =>
      r.archivedAt != null && formatDueDateInput(r.archivedAt) === dateKey,
  );
}

/**
 * 每日轮期若被超前滚过（open 截止在未来，但今天尚未有归档期），把截止拉回今天
 */
async function repairSkippedDailyCycles(userId: string, now = new Date()) {
  const today = localTodayNoon(now);
  const todayKey = formatDueDateInput(now);
  const cycles = await listOpenCyclePlans(userId);
  for (const row of cycles) {
    if (row.cycleUnit !== CYCLE_UNIT_DAY || !row.dueAt) continue;
    if (calendarDaysUntilDue(row.dueAt, now) <= 0) continue;
    const seriesId = row.seriesId ?? row.id;
    const doneToday = await seriesHasArchivedPeriodOnDate(
      userId,
      seriesId,
      todayKey,
    );
    if (doneToday) continue;
    await getDb()
      .update(plan)
      .set({ dueAt: today, updatedAt: now })
      .where(and(eq(plan.id, row.id), eq(plan.userId, userId)));
  }
}

/**
 * 轮期滚下一期：当期计次归档 + 同 series 开新一期
 * @param note 打卡心得（按本期截止日追加到系列馆藏正文）
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
  if (
    row.cycleUnit === CYCLE_UNIT_CUSTOM &&
    !clampCycleEveryDays(row.cycleEveryDays ?? NaN)
  ) {
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

  const nextDue = advanceCycleDue(
    row.dueAt,
    row.cycleUnit,
    row.cycleEveryDays,
  );
  const nextId = await createPlan(userId, {
    title: row.title,
    body: row.body,
    dueAt: nextDue,
    remindDays: row.remindDays,
    kind: PLAN_KIND_CYCLE,
    cycleUnit: row.cycleUnit,
    cycleEveryDays: row.cycleEveryDays,
    seriesId: row.seriesId ?? newId(),
    sourceEssayId: row.sourceEssayId,
    parentPlanId: row.parentPlanId,
  });
  // 子任务与打卡次数随系列带到下一期；与「完成本期」计次归档相互独立
  const { copyPlanTasksToPlan } = await import("@/services/plan-tasks");
  await copyPlanTasksToPlan(userId, planId, nextId);
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
 * - 轮期逾期 → 连续滚期直到不逾期（一次进站补齐多日）
 * - 每日轮期若被超前滚过今天 → 拉回今天
 * - 胶囊不自动归档
 * - 其余有截止日且逾期 → 逾期归档
 *
 * 逾期判定只用本地日历日差，避免 timestamp 无时区与 SQL 比较偏差。
 */
export async function catchUpOverduePlanArchives(
  userId: string,
  now = new Date(),
) {
  const candidates = await getDb()
    .select()
    .from(plan)
    .where(
      and(
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
        isNotNull(plan.dueAt),
      ),
    );

  let count = 0;
  for (const row of candidates) {
    if (!row.dueAt) continue;
    if (calendarDaysUntilDue(row.dueAt, now) >= 0) continue;
    if (row.kind === PLAN_KIND_CAPSULE) continue;
    if (row.kind === PLAN_KIND_CYCLE) continue;
    await completeAndArchivePlan(
      userId,
      row.id,
      ARCHIVE_REASON_PLAN_OVERDUE,
    );
    count += 1;
  }

  for (let step = 0; step < 400; step += 1) {
    const cycles = await listOpenCyclePlans(userId);
    let rolled = false;
    for (const row of cycles) {
      if (!row.dueAt) continue;
      if (calendarDaysUntilDue(row.dueAt, now) >= 0) continue;
      const result = await rolloverCyclePlan(userId, row.id);
      if (result) {
        count += 1;
        rolled = true;
      }
    }
    if (!rolled) break;
  }

  await repairSkippedDailyCycles(userId, now);
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
