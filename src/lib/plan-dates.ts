/** 解析 YYYY-MM-DD 为本地正午，避免时区偏移丢日 */
export function parseDueDateInput(raw: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function formatDueDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 本地「今天」正午 */
export function localTodayNoon(now = new Date()): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0,
  );
}

/** 截止日期早于今天（不含今天） */
export function isDueDateBeforeToday(dueAt: Date, now = new Date()): boolean {
  return dueAt.getTime() < localTodayNoon(now).getTime();
}

/** 日历日差：due − today（本地日）；负数为已逾期 */
export function calendarDaysUntilDue(dueAt: Date, now = new Date()) {
  const today = localTodayNoon(now);
  const due = localTodayNoon(dueAt);
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}
