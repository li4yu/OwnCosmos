import { and, asc, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  archiveItem,
  archiveItemTag,
} from "@/db/schema";
import { archiveTypeLabel } from "@/lib/archive-labels";
import { moodDisplay, type MoodKey } from "@/lib/moods";

export type YearMonthDensity = {
  year: number;
  month: number;
  count: number;
};

/** 折线通用点（近七天 / 近一月 / 近一年） */
export type DensityPoint = {
  key: string;
  label: string;
  count: number;
};

export type AnniversaryHit = {
  id: string;
  title: string;
  year: number;
  archivedAt: Date;
  typeLabel: string;
};

export type MoodCount = {
  mood: string;
  label: string;
  count: number;
};

export type TypeCount = {
  type: string;
  label: string;
  count: number;
};

export type TagCount = {
  name: string;
  count: number;
};

export type MoodTagPair = {
  mood: string;
  moodLabel: string;
  tagName: string;
  count: number;
};

export type YearBrief = {
  year: number;
  total: number;
  withMood: number;
  byType: TypeCount[];
  byMood: MoodCount[];
  topTags: TagCount[];
};

function localYmdParts(d = new Date()) {
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

/** 时间线 · 年月密度：按年/月归档密度 */
export async function getArchiveDensityByYearMonth(
  userId: string,
): Promise<YearMonthDensity[]> {
  const rows = await getDb()
    .select({
      year: sql<number>`extract(year from ${archiveItem.archivedAt})::int`,
      month: sql<number>`extract(month from ${archiveItem.archivedAt})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(archiveItem)
    .where(eq(archiveItem.userId, userId))
    .groupBy(
      sql`extract(year from ${archiveItem.archivedAt})`,
      sql`extract(month from ${archiveItem.archivedAt})`,
    )
    .orderBy(
      sql`extract(year from ${archiveItem.archivedAt})`,
      sql`extract(month from ${archiveItem.archivedAt})`,
    );
  return rows.map((r) => ({
    year: Number(r.year),
    month: Number(r.month),
    count: Number(r.count),
  }));
}

/** 往年今日：往年同月同日有归档 */
export async function listAnniversaryHits(
  userId: string,
  now = new Date(),
  limit = 8,
): Promise<AnniversaryHit[]> {
  const { year, month, day } = localYmdParts(now);
  const rows = await getDb()
    .select({
      id: archiveItem.id,
      title: archiveItem.title,
      type: archiveItem.type,
      archivedAt: archiveItem.archivedAt,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        sql`extract(month from ${archiveItem.archivedAt}) = ${month}`,
        sql`extract(day from ${archiveItem.archivedAt}) = ${day}`,
        sql`extract(year from ${archiveItem.archivedAt}) < ${year}`,
      ),
    )
    .orderBy(desc(archiveItem.archivedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    year: r.archivedAt.getFullYear(),
    archivedAt: r.archivedAt,
    typeLabel: archiveTypeLabel(r.type),
  }));
}

/** 情绪分布：有情绪标记的归档按心情计数 */
export async function getMoodSpectrum(
  userId: string,
  year?: number,
): Promise<MoodCount[]> {
  const conditions = [
    eq(archiveItem.userId, userId),
    isNotNull(archiveItem.mood),
  ];
  if (year != null) {
    conditions.push(
      sql`extract(year from ${archiveItem.archivedAt}) = ${year}`,
    );
  }
  const rows = await getDb()
    .select({
      mood: archiveItem.mood,
      count: sql<number>`count(*)::int`,
    })
    .from(archiveItem)
    .where(and(...conditions))
    .groupBy(archiveItem.mood)
    .orderBy(desc(sql`count(*)`));

  return rows
    .filter((r): r is typeof r & { mood: string } => Boolean(r.mood))
    .map((r) => ({
      mood: r.mood,
      label: moodDisplay(r.mood as MoodKey),
      count: Number(r.count),
    }));
}

/** 年度摘要：某年结构化汇总（无 AI 文案） */
export async function getYearBrief(
  userId: string,
  year: number,
): Promise<YearBrief> {
  const yearCond = and(
    eq(archiveItem.userId, userId),
    sql`extract(year from ${archiveItem.archivedAt}) = ${year}`,
  );

  const [totalRow] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(archiveItem)
    .where(yearCond);

  const [moodRow] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(archiveItem)
    .where(and(yearCond, isNotNull(archiveItem.mood)));

  const typeRows = await getDb()
    .select({
      type: archiveItem.type,
      count: sql<number>`count(*)::int`,
    })
    .from(archiveItem)
    .where(yearCond)
    .groupBy(archiveItem.type)
    .orderBy(desc(sql`count(*)`));

  const byMood = await getMoodSpectrum(userId, year);

  const tagRows = await getDb()
    .select({
      name: archiveItemTag.nameSnapshot,
      count: sql<number>`count(*)::int`,
    })
    .from(archiveItemTag)
    .innerJoin(
      archiveItem,
      and(
        eq(archiveItemTag.archiveItemId, archiveItem.id),
        eq(archiveItemTag.userId, archiveItem.userId),
      ),
    )
    .where(yearCond)
    .groupBy(archiveItemTag.nameSnapshot)
    .orderBy(desc(sql`count(*)`))
    .limit(12);

  return {
    year,
    total: Number(totalRow?.n ?? 0),
    withMood: Number(moodRow?.n ?? 0),
    byType: typeRows.map((r) => ({
      type: r.type,
      label: archiveTypeLabel(r.type),
      count: Number(r.count),
    })),
    byMood,
    topTags: tagRows.map((r) => ({
      name: r.name,
      count: Number(r.count),
    })),
  };
}

/** 情绪共现：情绪 × 主题共现（规则统计） */
export async function getMoodTagCooccurrence(
  userId: string,
  year?: number,
  limit = 20,
): Promise<MoodTagPair[]> {
  const conditions = [
    eq(archiveItem.userId, userId),
    isNotNull(archiveItem.mood),
  ];
  if (year != null) {
    conditions.push(
      sql`extract(year from ${archiveItem.archivedAt}) = ${year}`,
    );
  }

  const rows = await getDb()
    .select({
      mood: archiveItem.mood,
      tagName: archiveItemTag.nameSnapshot,
      count: sql<number>`count(*)::int`,
    })
    .from(archiveItem)
    .innerJoin(
      archiveItemTag,
      and(
        eq(archiveItemTag.archiveItemId, archiveItem.id),
        eq(archiveItemTag.userId, archiveItem.userId),
      ),
    )
    .where(and(...conditions))
    .groupBy(archiveItem.mood, archiveItemTag.nameSnapshot)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows
    .filter((r): r is typeof r & { mood: string } => Boolean(r.mood))
    .map((r) => ({
      mood: r.mood,
      moodLabel: moodDisplay(r.mood as MoodKey),
      tagName: r.tagName,
      count: Number(r.count),
    }));
}

/** 馆藏中出现过归档的年份列表（新→旧） */
export async function listArchiveYears(userId: string): Promise<number[]> {
  const rows = await getDb()
    .select({
      year: sql<number>`extract(year from ${archiveItem.archivedAt})::int`,
    })
    .from(archiveItem)
    .where(eq(archiveItem.userId, userId))
    .groupBy(sql`extract(year from ${archiveItem.archivedAt})`)
    .orderBy(desc(sql`extract(year from ${archiveItem.archivedAt})`));
  return rows.map((r) => Number(r.year));
}

/** 年月密度可选：某月条目（轻量列表） */
export async function listArchiveTitlesInMonth(
  userId: string,
  year: number,
  month: number,
  limit = 30,
) {
  return getDb()
    .select({
      id: archiveItem.id,
      title: archiveItem.title,
      type: archiveItem.type,
      archivedAt: archiveItem.archivedAt,
      mood: archiveItem.mood,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        sql`extract(year from ${archiveItem.archivedAt}) = ${year}`,
        sql`extract(month from ${archiveItem.archivedAt}) = ${month}`,
      ),
    )
    .orderBy(asc(archiveItem.archivedAt))
    .limit(limit);
}

/** 近 N 个自然日密度（缺日补 0，旧→新；label 为 M/D） */
export async function getRecentDayDensity(
  userId: string,
  dayCount: number,
  now = new Date(),
): Promise<DensityPoint[]> {
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (dayCount - 1),
  );
  const endExclusive = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );

  const rows = await getDb()
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
        gte(archiveItem.archivedAt, start),
        lt(archiveItem.archivedAt, endExclusive),
      ),
    )
    .groupBy(
      sql`extract(year from ${archiveItem.archivedAt})`,
      sql`extract(month from ${archiveItem.archivedAt})`,
      sql`extract(day from ${archiveItem.archivedAt})`,
    );

  const map = new Map(
    rows.map((r) => [
      `${Number(r.year)}-${Number(r.month)}-${Number(r.day)}`,
      Number(r.count),
    ]),
  );

  const out: DensityPoint[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    out.push({
      key: `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      label: `${m}/${day}`,
      count: map.get(`${y}-${m}-${day}`) ?? 0,
    });
  }
  return out;
}

/** 馆藏类型占比（全部） */
export async function getArchiveTypeCounts(
  userId: string,
): Promise<TypeCount[]> {
  const rows = await getDb()
    .select({
      type: archiveItem.type,
      count: sql<number>`count(*)::int`,
    })
    .from(archiveItem)
    .where(eq(archiveItem.userId, userId))
    .groupBy(archiveItem.type)
    .orderBy(desc(sql`count(*)`));
  return rows.map((r) => ({
    type: r.type,
    label: archiveTypeLabel(r.type),
    count: Number(r.count),
  }));
}

/** 近 12 个自然月密度（缺月补 0，旧→新） */
export async function getRecentMonthDensity(
  userId: string,
  months = 12,
  now = new Date(),
): Promise<YearMonthDensity[]> {
  const density = await getArchiveDensityByYearMonth(userId);
  const map = new Map(
    density.map((d) => [`${d.year}-${d.month}`, d.count] as const),
  );
  const out: YearMonthDensity[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  for (let i = 0; i < months; i++) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;
    out.push({
      year,
      month,
      count: map.get(`${year}-${month}`) ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

export type PastHubSnapshot = {
  total: number;
  last7Days: DensityPoint[];
  last30Days: DensityPoint[];
  last12Months: DensityPoint[];
  byType: TypeCount[];
  byMood: MoodCount[];
};

/** 昔时往枢纽摘要（三图数据） */
export async function getPastHubSnapshot(
  userId: string,
): Promise<PastHubSnapshot> {
  const [last7Days, last30Days, recentMonths, byType, byMood, totalRow] =
    await Promise.all([
      getRecentDayDensity(userId, 7),
      getRecentDayDensity(userId, 30),
      getRecentMonthDensity(userId, 12),
      getArchiveTypeCounts(userId),
      getMoodSpectrum(userId),
      getDb()
        .select({ n: sql<number>`count(*)::int` })
        .from(archiveItem)
        .where(eq(archiveItem.userId, userId))
        .then((rows) => rows[0]),
    ]);
  return {
    total: Number(totalRow?.n ?? 0),
    last7Days,
    last30Days,
    last12Months: recentMonths.map((m) => ({
      key: `${m.year}-${String(m.month).padStart(2, "0")}`,
      label: `${m.month}月`,
      count: m.count,
    })),
    byType,
    byMood,
  };
}
