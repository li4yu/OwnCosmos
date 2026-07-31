import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  FOCUS_STATUS_COMPLETED,
  focusSession,
} from "@/db/schema";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { formatDueDateInput } from "@/lib/plan-dates";
import { cycleUnitLabel, planKindLabel } from "@/lib/plan-kinds";
import { listActiveEssays } from "@/services/essays";
import {
  focusElapsedMs,
  getActiveFocusSession,
} from "@/services/focus";
import {
  listActiveHabits,
  listTodayCheckins,
} from "@/services/daily";
import {
  listCyclePlanTasksForHome,
  taskCheckedInOnDate,
} from "@/services/plan-tasks";
import {
  canCompleteCyclePeriod,
  listDueReminderPlans,
  listOpenCyclePlans,
  seriesHasArchivedPeriodOnDate,
} from "@/services/plans";

function localDayBounds(now = new Date()) {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return { start, end };
}

export type HomeCheckinChildTask = {
  id: string;
  title: string;
  checkCount: number;
  checkedInToday: boolean;
};

export type HomeCheckinItem = {
  kind: "daily" | "cycle" | "task";
  id: string;
  title: string;
  subtitle: string;
  checkedIn: boolean;
  /** 是否可点打卡/完成本期（轮期未到期为 false） */
  canCheckin: boolean;
  note: string;
  href: string;
  /** 子任务所属轮期计划 id（kind=task） */
  planId?: string;
  /** 子任务累计打卡次数 */
  checkCount?: number;
  /** 轮期条目下挂载的子任务（首页嵌套展示） */
  childTasks?: HomeCheckinChildTask[];
};

export type HomeDueItem = {
  id: string;
  title: string;
  dueAt: Date;
  daysLeft: number;
  remindDays: number;
  kindLabel?: string;
};

export type HomeSummary = {
  dueCount: number;
  dueItems: HomeDueItem[];
  activeEssayCount: number;
  todayFocusMs: number;
  todayFocusLabel: string;
  dailyDone: number;
  dailyTotal: number;
  checkinDone: number;
  checkinTotal: number;
  checkinItems: HomeCheckinItem[];
};

/**
 * 首页今日摘要：只读聚合，不落第二份本体
 * - 临期 / 随笔 / 专注 / 日课+轮期打卡 + 轮期子任务（记次）
 */
export async function getHomeSummary(
  userId: string,
  now = new Date(),
): Promise<HomeSummary> {
  const [due, essays, activeFocus, habits, checkins, cycles, cycleTasks] =
    await Promise.all([
      listDueReminderPlans(userId, now),
      listActiveEssays(userId),
      getActiveFocusSession(userId),
      listActiveHabits(userId),
      listTodayCheckins(userId, now),
      listOpenCyclePlans(userId),
      listCyclePlanTasksForHome(userId),
    ]);

  const { start, end } = localDayBounds(now);
  const completedToday = await getDb()
    .select({
      total: sql<number>`coalesce(sum(${focusSession.accumulatedMs}), 0)`,
    })
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        eq(focusSession.status, FOCUS_STATUS_COMPLETED),
        gte(focusSession.endedAt, start),
        lt(focusSession.endedAt, end),
      ),
    );

  let todayFocusMs = Number(completedToday[0]?.total ?? 0);
  if (activeFocus) {
    todayFocusMs += focusElapsedMs(activeFocus, now);
  }

  const checkinByHabit = new Map(checkins.map((c) => [c.habitId, c]));
  const dailyItems: HomeCheckinItem[] = habits.map((h) => {
    const c = checkinByHabit.get(h.id);
    return {
      kind: "daily" as const,
      id: h.id,
      title: h.title,
      subtitle: "日课",
      checkedIn: Boolean(c),
      canCheckin: true,
      note: c?.note ?? "",
      href: "/app/future/daily",
    };
  });

  // 轮期：到期可完成本期；有子任务时即使未到期也上首页（便于打卡记次）
  const todayKey = formatDueDateInput(now);
  const tasksByPlan = new Map<string, typeof cycleTasks>();
  for (const t of cycleTasks) {
    const list = tasksByPlan.get(t.planId) ?? [];
    list.push(t);
    tasksByPlan.set(t.planId, list);
  }

  const cycleItems: HomeCheckinItem[] = [];
  for (const p of cycles) {
    const seriesId = p.seriesId ?? p.id;
    const canCheckin = canCompleteCyclePeriod(p.dueAt, now);
    const doneToday = await seriesHasArchivedPeriodOnDate(
      userId,
      seriesId,
      todayKey,
    );
    const childTasks = (tasksByPlan.get(p.id) ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      checkCount: t.checkCount,
      checkedInToday: taskCheckedInOnDate(t.lastCheckinDate, todayKey),
    }));
    // 未到期、今日未完成、又无子任务 → 不上首页
    if (!canCheckin && !doneToday && childTasks.length === 0) continue;
    const taskSummary =
      childTasks.length > 0
        ? ` · 子任务 ${childTasks.length} 项 / 共 ${childTasks.reduce((s, t) => s + t.checkCount, 0)} 次`
        : "";
    cycleItems.push({
      kind: "cycle",
      id: p.id,
      title: p.title,
      subtitle: `轮期 · ${cycleUnitLabel(p.cycleUnit, p.cycleEveryDays)}${
        p.dueAt ? ` · 本期至 ${formatDueDateInput(p.dueAt)}` : ""
      }${doneToday && !canCheckin ? " · 今日已完成" : ""}${taskSummary}`,
      checkedIn: doneToday && !canCheckin,
      canCheckin,
      note: "",
      href: `/app/future/plans/${p.id}`,
      childTasks,
    });
  }

  const checkinItems = [...dailyItems, ...cycleItems];
  const dailyDone = dailyItems.filter((h) => h.checkedIn).length;

  const dueItems: HomeDueItem[] = due.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt,
    daysLeft: row.daysLeft,
    remindDays: row.remindDays,
    kindLabel: planKindLabel(row.kind),
  }));

  return {
    dueCount: dueItems.length,
    dueItems,
    activeEssayCount: essays.length,
    todayFocusMs,
    todayFocusLabel: formatFocusDurationMs(todayFocusMs),
    dailyDone,
    dailyTotal: dailyItems.length,
    checkinDone: dailyDone,
    checkinTotal: checkinItems.length,
    checkinItems,
  };
}
