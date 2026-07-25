import { and, eq, gte, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  FOCUS_STATUS_COMPLETED,
  focusSession,
} from "@/db/schema";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { listActiveEssays } from "@/services/essays";
import {
  focusElapsedMs,
  getActiveFocusSession,
} from "@/services/focus";
import { listDueReminderPlans } from "@/services/plans";

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

export type HomeSummary = {
  dueCount: number;
  activeEssayCount: number;
  todayFocusMs: number;
  todayFocusLabel: string;
};

/**
 * 首页今日摘要：只读聚合，不落第二份本体
 * - 临期数 / 未归档随笔数 / 今日专注（已完成 + 进行中累计）
 */
export async function getHomeSummary(
  userId: string,
  now = new Date(),
): Promise<HomeSummary> {
  const [due, essays, activeFocus] = await Promise.all([
    listDueReminderPlans(userId, now),
    listActiveEssays(userId),
    getActiveFocusSession(userId),
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

  return {
    dueCount: due.length,
    activeEssayCount: essays.length,
    todayFocusMs,
    todayFocusLabel: formatFocusDurationMs(todayFocusMs),
  };
}
