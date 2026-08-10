import { DEFAULT_SEARCH_TOP_K } from "@/ai/config";
import {
  semanticSearchProject,
  semanticSearchUser,
} from "@/ai/search";
import { formatFocusDurationMs } from "@/lib/focus-duration";
import { formatDueDateInput } from "@/lib/plan-dates";
import {
  getFocusShortStats,
  listCompletedFocusSessions,
} from "@/services/focus";
import { getHomeSummary } from "@/services/home-summary";
import { listDueReminderPlans } from "@/services/plans";
import { getMoodSpectrum, getYearBrief } from "@/services/review";

/** 本地书单 MVP 占位（非编造用户馆藏） */
const LOCAL_BOOKLIST = [
  {
    title: "散步的力量",
    note: "短途走动即可，不必专程远足",
  },
  {
    title: "慢慢来也比较快",
    note: "降低节奏时的轻读物向",
  },
];

export async function toolSemanticSearchProject(
  userId: string,
  query: string,
  topK = DEFAULT_SEARCH_TOP_K,
) {
  return semanticSearchProject(userId, query, topK);
}

export async function toolSemanticSearchUser(
  userId: string,
  query: string,
  topK = DEFAULT_SEARCH_TOP_K,
) {
  return semanticSearchUser(userId, query, topK);
}

export async function toolListDueItems(userId: string) {
  const rows = await listDueReminderPlans(userId);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    dueAt: formatDueDateInput(r.dueAt),
    daysLeft: r.daysLeft,
    remindDays: r.remindDays,
    href: `/app/present/due?focus=${r.id}`,
  }));
}

export async function toolGetHomeSummary(userId: string) {
  const s = await getHomeSummary(userId);
  return {
    dueCount: s.dueCount,
    dueItems: s.dueItems.slice(0, 8).map((d) => ({
      id: d.id,
      title: d.title,
      dueAt: formatDueDateInput(d.dueAt),
      daysLeft: d.daysLeft,
      href: `/app/present/due?focus=${d.id}`,
    })),
    activeEssayCount: s.activeEssayCount,
    todayFocusLabel: s.todayFocusLabel,
    dailyDone: s.dailyDone,
    dailyTotal: s.dailyTotal,
    checkinDone: s.checkinDone,
    checkinTotal: s.checkinTotal,
    checkinHints: s.checkinItems.slice(0, 6).map((c) => ({
      title: c.title,
      href: c.href,
      checkedIn: c.checkedIn,
    })),
  };
}

export async function toolGetFocusStats(userId: string) {
  const stats = await getFocusShortStats(userId);
  return {
    todayMs: stats.todayMs,
    todayLabel: formatFocusDurationMs(stats.todayMs),
    todayCount: stats.todayCount,
    weekMs: stats.weekMs,
    weekLabel: formatFocusDurationMs(stats.weekMs),
    weekCount: stats.weekCount,
    href: "/app/focus",
  };
}

export async function toolGetRecentFocusNotes(userId: string) {
  const rows = await listCompletedFocusSessions(userId, 3);
  return rows.map((r) => ({
    title: (r.title ?? "").slice(0, 40) || "（未命名专注记录）",
    durationLabel: formatFocusDurationMs(r.accumulatedMs),
    endedAt: r.endedAt?.toISOString?.()?.slice(0, 10) ?? null,
  }));
}

export async function toolGetMoodSummary(userId: string) {
  const year = new Date().getFullYear();
  try {
    const [byMood, brief] = await Promise.all([
      getMoodSpectrum(userId, year),
      getYearBrief(userId, year),
    ]);
    return {
      year,
      byMood: byMood.slice(0, 8),
      totalArchives: brief.total,
      withMood: brief.withMood,
      hrefMood: "/app/past/mood",
    };
  } catch {
    return { year, byMood: [], totalArchives: 0, withMood: 0 };
  }
}

export function toolGetBooklist() {
  return LOCAL_BOOKLIST;
}
