import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  FOCUS_STATUS_COMPLETED,
  focusSession,
} from "@/db/schema";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { formatDueDateInput } from "@/lib/plan-dates";
import { cycleUnitLabel } from "@/lib/plan-kinds";
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
  canCompleteCyclePeriod,
  listDueReminderPlans,
  listOpenCyclePlans,
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

export type HomeCheckinItem = {
  kind: "daily" | "cycle";
  id: string;
  title: string;
  subtitle: string;
  checkedIn: boolean;
  /** 是否可点打卡/完成本期（轮期未到期为 false） */
  canCheckin: boolean;
  note: string;
  href: string;
};

export type HomeDueItem = {
  id: string;
  title: string;
  dueAt: Date;
  daysLeft: number;
  remindDays: number;
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
 * - 临期 / 随笔 / 专注 / 日课+轮期打卡列表
 */
export async function getHomeSummary(
  userId: string,
  now = new Date(),
): Promise<HomeSummary> {
  const [due, essays, activeFocus, habits, checkins, cycles] =
    await Promise.all([
      listDueReminderPlans(userId, now),
      listActiveEssays(userId),
      getActiveFocusSession(userId),
      listActiveHabits(userId),
      listTodayCheckins(userId, now),
      listOpenCyclePlans(userId),
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

  // 轮期：未到期不上首页；到期当天起出现在打卡列表
  const cycleItems: HomeCheckinItem[] = cycles
    .filter((p) => canCompleteCyclePeriod(p.dueAt, now))
    .map((p) => ({
      kind: "cycle" as const,
      id: p.id,
      title: p.title,
      subtitle: `轮期 · ${cycleUnitLabel(p.cycleUnit)}${
        p.dueAt ? ` · 本期至 ${formatDueDateInput(p.dueAt)}` : ""
      }`,
      checkedIn: false,
      canCheckin: true,
      note: "",
      href: `/app/future/plans/${p.id}`,
    }));

  const checkinItems = [...dailyItems, ...cycleItems];
  const dailyDone = dailyItems.filter((h) => h.checkedIn).length;

  const dueItems: HomeDueItem[] = due.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt,
    daysLeft: row.daysLeft,
    remindDays: row.remindDays,
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
