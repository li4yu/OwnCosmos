import { calendarDaysUntilDue } from "@/lib/plan-dates";

/** 默认提前 1 天提醒 */
export const DEFAULT_REMIND_DAYS = 1;

/** 绝对上限（天） */
export const REMIND_DAYS_HARD_MAX = 90;

/**
 * 相对今天与截止日期，提前提醒允许的最大值：
 * - 截止今天：最多 1
 * - 截止在未来：最多 = 距今天数
 */
export function maxRemindDaysForDue(dueAt: Date, now = new Date()): number {
  const span = calendarDaysUntilDue(dueAt, now);
  if (span < 0) return DEFAULT_REMIND_DAYS;
  if (span === 0) return 1;
  return Math.min(REMIND_DAYS_HARD_MAX, span);
}

export function clampRemindDays(
  raw: number,
  dueAt?: Date | null,
  now = new Date(),
) {
  const fallback = DEFAULT_REMIND_DAYS;
  if (!Number.isFinite(raw)) {
    return dueAt
      ? Math.min(fallback, maxRemindDaysForDue(dueAt, now))
      : fallback;
  }
  let n = Math.floor(raw);
  n = Math.max(1, n);
  n = Math.min(REMIND_DAYS_HARD_MAX, n);
  if (dueAt) {
    n = Math.min(n, maxRemindDaysForDue(dueAt, now));
  }
  return n;
}

/** 校验失败返回中文错误，通过返回 null */
export function validateRemindDays(
  raw: number,
  dueAt: Date,
  now = new Date(),
): string | null {
  if (!Number.isFinite(raw)) {
    return "请填写有效的提前天数";
  }
  if (!Number.isInteger(raw)) {
    return "提前天数须为整数";
  }
  if (raw < 1) {
    return "提前天数至少为 1 天";
  }
  if (raw > REMIND_DAYS_HARD_MAX) {
    return `提前天数不能超过 ${REMIND_DAYS_HARD_MAX} 天`;
  }
  const max = maxRemindDaysForDue(dueAt, now);
  if (raw > max) {
    const span = calendarDaysUntilDue(dueAt, now);
    if (span === 0) {
      return "截止为今天时，提前提醒最多提前 1 天";
    }
    return `截止日期距今 ${span} 天，提前提醒不能超过 ${max} 天`;
  }
  return null;
}

export function parseRemindDaysInput(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

/** 快捷选项：在合法上限内截取 */
export function remindPresetsForDue(dueAt: Date, now = new Date()) {
  const max = maxRemindDaysForDue(dueAt, now);
  return ([1, 3, 7, 15, 30] as const).filter((d) => d <= max);
}
