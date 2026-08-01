import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_TYPE_PLAN_CYCLE,
  archiveItem,
  dailyCheckin,
  FOCUS_STATUS_COMPLETED,
  focusSession,
} from "@/db/schema";

export type HomePulseDay = {
  key: string;
  label: string;
  /** YYYY-MM-DD */
  date: string;
};

export type HomeCheckinDay = HomePulseDay & {
  habitCount: number;
  cycleCount: number;
};

export type HomeFocusDay = HomePulseDay & {
  ms: number;
  count: number;
};

function lastNDays(dayCount: number, now = new Date()): HomePulseDay[] {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (dayCount - 1),
  );
  const out: HomePulseDay[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    out.push({
      key: date,
      date,
      label: `${m}/${day}`,
    });
  }
  return out;
}

/** 近 N 日：日课打卡次数 + 轮期完成本期次数 */
export async function getRecentCheckinDayCounts(
  userId: string,
  dayCount = 7,
  now = new Date(),
): Promise<HomeCheckinDay[]> {
  const days = lastNDays(dayCount, now);
  const startDate = days[0]!.date;
  const endExclusive = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const startTs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (dayCount - 1),
    0,
    0,
    0,
    0,
  );

  const [habitRows, cycleRows] = await Promise.all([
    getDb()
      .select({
        date: dailyCheckin.checkinDate,
        count: sql<number>`count(*)::int`,
      })
      .from(dailyCheckin)
      .where(
        and(
          eq(dailyCheckin.userId, userId),
          gte(dailyCheckin.checkinDate, startDate),
        ),
      )
      .groupBy(dailyCheckin.checkinDate),
    getDb()
      .select({
        year: sql<number>`extract(year from ${archiveItem.archivedAt})::int`,
        month: sql<number>`extract(month from ${archiveItem.archivedAt})::int`,
        day: sql<number>`extract(day from ${archiveItem.archivedAt})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(archiveItem)
      .where(
        and(
          eq(archiveItem.userId, userId),
          eq(archiveItem.type, ARCHIVE_TYPE_PLAN_CYCLE),
          gte(archiveItem.archivedAt, startTs),
          lt(archiveItem.archivedAt, endExclusive),
        ),
      )
      .groupBy(
        sql`extract(year from ${archiveItem.archivedAt})`,
        sql`extract(month from ${archiveItem.archivedAt})`,
        sql`extract(day from ${archiveItem.archivedAt})`,
      ),
  ]);

  const habitMap = new Map(
    habitRows.map((r) => [r.date, Number(r.count)] as const),
  );
  const cycleMap = new Map(
    cycleRows.map((r) => {
      const key = `${Number(r.year)}-${String(Number(r.month)).padStart(2, "0")}-${String(Number(r.day)).padStart(2, "0")}`;
      return [key, Number(r.count)] as const;
    }),
  );

  return days.map((d) => ({
    ...d,
    habitCount: habitMap.get(d.date) ?? 0,
    cycleCount: cycleMap.get(d.date) ?? 0,
  }));
}

/** 近 N 日：凝时完成次数与时长 */
export async function getRecentFocusDayStats(
  userId: string,
  dayCount = 7,
  now = new Date(),
): Promise<HomeFocusDay[]> {
  const days = lastNDays(dayCount, now);
  const startTs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (dayCount - 1),
    0,
    0,
    0,
    0,
  );
  const endExclusive = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const rows = await getDb()
    .select({
      year: sql<number>`extract(year from ${focusSession.endedAt})::int`,
      month: sql<number>`extract(month from ${focusSession.endedAt})::int`,
      day: sql<number>`extract(day from ${focusSession.endedAt})::int`,
      ms: sql<number>`coalesce(sum(${focusSession.accumulatedMs}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        eq(focusSession.status, FOCUS_STATUS_COMPLETED),
        isNotNull(focusSession.endedAt),
        gte(focusSession.endedAt, startTs),
        lt(focusSession.endedAt, endExclusive),
      ),
    )
    .groupBy(
      sql`extract(year from ${focusSession.endedAt})`,
      sql`extract(month from ${focusSession.endedAt})`,
      sql`extract(day from ${focusSession.endedAt})`,
    );

  const map = new Map(
    rows.map((r) => {
      const key = `${Number(r.year)}-${String(Number(r.month)).padStart(2, "0")}-${String(Number(r.day)).padStart(2, "0")}`;
      return [key, { ms: Number(r.ms), count: Number(r.count) }] as const;
    }),
  );

  return days.map((d) => {
    const hit = map.get(d.date);
    return {
      ...d,
      ms: hit?.ms ?? 0,
      count: hit?.count ?? 0,
    };
  });
}
