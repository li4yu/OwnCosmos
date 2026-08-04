import { randomBytes } from "node:crypto";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_FOCUS_COMPLETE,
  ARCHIVE_TYPE_FOCUS_RECORD,
  FOCUS_MODE_COUNTDOWN,
  FOCUS_MODE_FORWARD,
  FOCUS_STATUS_COMPLETED,
  FOCUS_STATUS_PAUSED,
  FOCUS_STATUS_RUNNING,
  PLAN_KIND_CYCLE,
  archiveItem,
  focusSession,
} from "@/db/schema";
import { defaultFocusTitle } from "@/lib/focus-duration";
import { PLANNING_KINDS } from "@/lib/plan-kinds";
import {
  getCheckinForDate,
  listActiveHabits,
  localCheckinDate,
} from "@/services/daily";
import {
  canCompleteCyclePeriod,
  getActivePlan,
  listOpenCyclePlans,
  listOpenPlanningPlans,
} from "@/services/plans";

function newId() {
  return randomBytes(16).toString("hex");
}

export type FocusSessionRecord = typeof focusSession.$inferSelect;

export type FocusBindKey = `plan:${string}` | `habit:${string}` | "";

export type StartFocusInput = {
  mode: typeof FOCUS_MODE_FORWARD | typeof FOCUS_MODE_COUNTDOWN;
  /** 逆漏必填 */
  targetMs?: number;
  /** `plan:id` | `habit:id` | 空 */
  bindKey?: string | null;
};

/** 当前累计专注毫秒（含 running 段） */
export function focusElapsedMs(
  row: Pick<
    FocusSessionRecord,
    "accumulatedMs" | "status" | "runningSince"
  >,
  now = new Date(),
) {
  let total = Math.max(0, row.accumulatedMs);
  if (
    row.status === FOCUS_STATUS_RUNNING &&
    row.runningSince instanceof Date
  ) {
    total += Math.max(0, now.getTime() - row.runningSince.getTime());
  }
  return total;
}

export async function getActiveFocusSession(userId: string) {
  const rows = await getDb()
    .select()
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        or(
          eq(focusSession.status, FOCUS_STATUS_RUNNING),
          eq(focusSession.status, FOCUS_STATUS_PAUSED),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getFocusSession(userId: string, sessionId: string) {
  const rows = await getDb()
    .select()
    .from(focusSession)
    .where(
      and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** 已完成凝录（模块内列表） */
export async function listCompletedFocusSessions(userId: string, limit = 50) {
  const sessions = await getDb()
    .select()
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        eq(focusSession.status, FOCUS_STATUS_COMPLETED),
      ),
    )
    .orderBy(desc(focusSession.endedAt))
    .limit(limit);

  if (sessions.length === 0) return [];

  const archives = await getDb()
    .select({
      id: archiveItem.id,
      sourceFocusSessionId: archiveItem.sourceFocusSessionId,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        eq(archiveItem.type, ARCHIVE_TYPE_FOCUS_RECORD),
        inArray(
          archiveItem.sourceFocusSessionId,
          sessions.map((s) => s.id),
        ),
      ),
    );

  const archiveBySession = new Map(
    archives
      .filter((a) => a.sourceFocusSessionId)
      .map((a) => [a.sourceFocusSessionId!, a.id]),
  );

  return sessions.map((s) => ({
    ...s,
    archiveId: archiveBySession.get(s.id) ?? null,
    elapsedMs: s.accumulatedMs,
  }));
}

function parseBindKey(raw?: string | null): {
  planId?: string;
  habitId?: string;
} | null {
  const key = (raw ?? "").trim();
  if (!key) return null;
  if (key.startsWith("plan:")) {
    const id = key.slice(5).trim();
    return id ? { planId: id } : null;
  }
  if (key.startsWith("habit:")) {
    const id = key.slice(6).trim();
    return id ? { habitId: id } : null;
  }
  return null;
}

async function resolveFocusBind(userId: string, bindKey?: string | null) {
  const parsed = parseBindKey(bindKey);
  if (!parsed) return { planId: null as string | null, habitId: null as string | null };

  if (parsed.habitId) {
    const habits = await listActiveHabits(userId);
    const habit = habits.find((h) => h.id === parsed.habitId);
    if (!habit) return { error: "绑定的日课不存在或已停用" as const };
    const checkin = await getCheckinForDate(
      userId,
      habit.id,
      localCheckinDate(),
    );
    if (checkin) return { error: "该日课今日已完成，请换未完成的日课" as const };
    return { planId: null, habitId: habit.id };
  }

  if (parsed.planId) {
    const row = await getActivePlan(userId, parsed.planId);
    if (!row || row.archivedAt) {
      return { error: "绑定的目标不存在或已归档" as const };
    }
    if (row.kind === PLAN_KIND_CYCLE) {
      if (!row.dueAt || !canCompleteCyclePeriod(row.dueAt)) {
        return { error: "仅可绑定今日可完成的轮期" as const };
      }
      return { planId: row.id, habitId: null };
    }
    if ((PLANNING_KINDS as readonly string[]).includes(row.kind)) {
      return { planId: row.id, habitId: null };
    }
    return { error: "该类型不可绑定凝时" as const };
  }

  return { planId: null, habitId: null };
}

/** 开始专注；若已有进行中会话则返回既有 */
export async function startFocusSession(userId: string, input: StartFocusInput) {
  const existing = await getActiveFocusSession(userId);
  if (existing) return { session: existing };

  const mode =
    input.mode === FOCUS_MODE_COUNTDOWN
      ? FOCUS_MODE_COUNTDOWN
      : FOCUS_MODE_FORWARD;

  let targetMs: number | null = null;
  if (mode === FOCUS_MODE_COUNTDOWN) {
    const raw = Math.floor(input.targetMs ?? 0);
    if (!Number.isFinite(raw) || raw < 1_000) {
      return { error: "逆漏目标时长至少 1 秒" as const };
    }
    if (raw > 12 * 60 * 60 * 1000) {
      return { error: "逆漏目标时长不能超过 12 小时" as const };
    }
    targetMs = raw;
  }

  const bind = await resolveFocusBind(userId, input.bindKey);
  if ("error" in bind) return { error: bind.error };

  const now = new Date();
  const id = newId();
  await getDb().insert(focusSession).values({
    id,
    userId,
    mode,
    status: FOCUS_STATUS_RUNNING,
    accumulatedMs: 0,
    targetMs,
    planId: bind.planId,
    habitId: bind.habitId,
    runningSince: now,
    startedAt: now,
    updatedAt: now,
  });
  return { session: (await getFocusSession(userId, id))! };
}

/** @deprecated 用 startFocusSession */
export async function startForwardFocus(userId: string) {
  const result = await startFocusSession(userId, { mode: FOCUS_MODE_FORWARD });
  return result.session ?? null;
}

export async function pauseFocusSession(userId: string, sessionId: string) {
  const row = await getFocusSession(userId, sessionId);
  if (!row || row.status !== FOCUS_STATUS_RUNNING) return null;

  const now = new Date();
  const accumulatedMs = focusElapsedMs(row, now);
  await getDb()
    .update(focusSession)
    .set({
      status: FOCUS_STATUS_PAUSED,
      accumulatedMs,
      runningSince: null,
      updatedAt: now,
    })
    .where(and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)));
  return getFocusSession(userId, sessionId);
}

export async function resumeFocusSession(userId: string, sessionId: string) {
  const row = await getFocusSession(userId, sessionId);
  if (!row || row.status !== FOCUS_STATUS_PAUSED) return null;

  const now = new Date();
  await getDb()
    .update(focusSession)
    .set({
      status: FOCUS_STATUS_RUNNING,
      runningSince: now,
      updatedAt: now,
    })
    .where(and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)));
  return getFocusSession(userId, sessionId);
}

/**
 * 结束专注 → 写馆藏凝录 + completed
 */
export async function completeFocusSession(
  userId: string,
  sessionId: string,
  reflection = "",
) {
  const row = await getFocusSession(userId, sessionId);
  if (
    !row ||
    (row.status !== FOCUS_STATUS_RUNNING &&
      row.status !== FOCUS_STATUS_PAUSED)
  ) {
    return null;
  }

  const now = new Date();
  const accumulatedMs = focusElapsedMs(row, now);
  const title = defaultFocusTitle(row.mode, accumulatedMs);
  const body = reflection.trim();

  const archiveId = newId();
  await getDb().insert(archiveItem).values({
    id: archiveId,
    userId,
    type: ARCHIVE_TYPE_FOCUS_RECORD,
    title,
    body,
    sourceModule: "focus",
    sourceFocusSessionId: sessionId,
    sourcePlanId: row.planId,
    sourceHabitId: row.habitId,
    archiveReason: ARCHIVE_REASON_FOCUS_COMPLETE,
    archivedAt: now,
    sourceCreatedAt: row.startedAt,
    sourceUpdatedAt: now,
    inKnowledge: true,
    keptAt: now,
  });

  const { scheduleArchiveRagUpsert } = await import("@/ai");
  scheduleArchiveRagUpsert(userId, archiveId);

  await getDb()
    .update(focusSession)
    .set({
      status: FOCUS_STATUS_COMPLETED,
      accumulatedMs,
      runningSince: null,
      endedAt: now,
      title,
      reflection: body,
      updatedAt: now,
    })
    .where(and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)));

  return {
    sessionId,
    archiveId,
    accumulatedMs,
    title,
    planId: row.planId,
    habitId: row.habitId,
  };
}

function startOfLocalDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** 周一为周起点 */
function startOfLocalWeek(d = new Date()) {
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = startOfLocalDay(d);
  start.setDate(start.getDate() - diff);
  return start;
}

async function sumCompletedFocusMs(userId: string, from: Date) {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${focusSession.accumulatedMs}), 0)`,
      n: sql<number>`count(*)::int`,
    })
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        eq(focusSession.status, FOCUS_STATUS_COMPLETED),
        isNotNull(focusSession.endedAt),
        gte(focusSession.endedAt, from),
      ),
    );
  return {
    totalMs: Number(row?.total ?? 0),
    count: Number(row?.n ?? 0),
  };
}

/** 凝时模块短统计：当日 / 本周已完成时长 */
export async function getFocusShortStats(userId: string) {
  const today = await sumCompletedFocusMs(userId, startOfLocalDay());
  const week = await sumCompletedFocusMs(userId, startOfLocalWeek());
  return {
    todayMs: today.totalMs,
    todayCount: today.count,
    weekMs: week.totalMs,
    weekCount: week.count,
  };
}

/** 某计划下已完成专注累计毫秒 */
export async function sumFocusMsForPlan(userId: string, planId: string) {
  const [row] = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${focusSession.accumulatedMs}), 0)`,
      n: sql<number>`count(*)::int`,
    })
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        eq(focusSession.planId, planId),
        eq(focusSession.status, FOCUS_STATUS_COMPLETED),
      ),
    );
  return {
    totalMs: Number(row?.total ?? 0),
    count: Number(row?.n ?? 0),
  };
}

export type FocusBindOption = {
  value: FocusBindKey;
  label: string;
  group: "habit" | "plan" | "cycle";
};

/**
 * 可绑目标：未完成日课、未完成规划、今日可完成的轮期
 *（不含胶囊、非今日轮期、已打卡日课）
 */
export async function listFocusBindOptions(
  userId: string,
): Promise<FocusBindOption[]> {
  const now = new Date();
  const { listTodayCheckins } = await import("@/services/daily");
  const [habits, planning, cycles, checkins] = await Promise.all([
    listActiveHabits(userId),
    listOpenPlanningPlans(userId),
    listOpenCyclePlans(userId),
    listTodayCheckins(userId, now),
  ]);
  const checkedHabitIds = new Set(checkins.map((c) => c.habitId));
  const options: FocusBindOption[] = [];

  for (const h of habits) {
    if (checkedHabitIds.has(h.id)) continue;
    options.push({
      value: `habit:${h.id}`,
      label: h.title.trim() || "（无标题）",
      group: "habit",
    });
  }

  for (const p of planning) {
    options.push({
      value: `plan:${p.id}`,
      label: p.title.trim() || "（无标题）",
      group: "plan",
    });
  }

  for (const c of cycles) {
    if (!c.dueAt || !canCompleteCyclePeriod(c.dueAt, now)) continue;
    options.push({
      value: `plan:${c.id}`,
      label: c.title.trim() || "（无标题）",
      group: "cycle",
    });
  }

  return options;
}
