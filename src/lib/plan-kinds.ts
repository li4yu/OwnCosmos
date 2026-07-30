import {
  CYCLE_UNIT_DAY,
  CYCLE_UNIT_MONTH,
  CYCLE_UNIT_WEEK,
  CYCLE_UNIT_YEAR,
  PLAN_KIND_CAPSULE,
  PLAN_KIND_CYCLE,
  PLAN_KIND_ONCE,
  PLAN_KIND_STAGE,
  PLAN_KIND_VISION,
} from "@/db/schema";
import { calendarDaysUntilDue } from "@/lib/plan-dates";

export {
  CYCLE_UNIT_DAY,
  CYCLE_UNIT_MONTH,
  CYCLE_UNIT_WEEK,
  CYCLE_UNIT_YEAR,
  PLAN_KIND_CAPSULE,
  PLAN_KIND_CYCLE,
  PLAN_KIND_ONCE,
  PLAN_KIND_STAGE,
  PLAN_KIND_VISION,
};

export const PLAN_KINDS = [
  PLAN_KIND_ONCE,
  PLAN_KIND_VISION,
  PLAN_KIND_STAGE,
  PLAN_KIND_CYCLE,
  PLAN_KIND_CAPSULE,
] as const;

export type PlanKind = (typeof PLAN_KINDS)[number];

export const CYCLE_UNITS = [
  CYCLE_UNIT_DAY,
  CYCLE_UNIT_WEEK,
  CYCLE_UNIT_MONTH,
  CYCLE_UNIT_YEAR,
] as const;

export type CycleUnit = (typeof CYCLE_UNITS)[number];

/** 规划列表：单次 / 愿景 / 阶段 */
export const PLANNING_KINDS: readonly PlanKind[] = [
  PLAN_KIND_ONCE,
  PLAN_KIND_VISION,
  PLAN_KIND_STAGE,
];

export function isPlanKind(v: string): v is PlanKind {
  return (PLAN_KINDS as readonly string[]).includes(v);
}

export function isCycleUnit(v: string): v is CycleUnit {
  return (CYCLE_UNITS as readonly string[]).includes(v);
}

export function planKindLabel(kind: string) {
  switch (kind) {
    case PLAN_KIND_VISION:
      return "愿景";
    case PLAN_KIND_STAGE:
      return "阶段";
    case PLAN_KIND_CYCLE:
      return "轮期";
    case PLAN_KIND_CAPSULE:
      return "胶囊";
    default:
      return "单次";
  }
}

export function cycleUnitLabel(unit: string | null | undefined) {
  switch (unit) {
    case CYCLE_UNIT_DAY:
      return "每日";
    case CYCLE_UNIT_WEEK:
      return "每周";
    case CYCLE_UNIT_MONTH:
      return "每月";
    case CYCLE_UNIT_YEAR:
      return "每年";
    default:
      return "周期";
  }
}

/** 胶囊未到解锁日（解锁日当天起可读） */
export function isCapsuleLocked(
  kind: string,
  dueAt: Date | null | undefined,
  now = new Date(),
) {
  if (kind !== PLAN_KIND_CAPSULE || !dueAt) return false;
  return calendarDaysUntilDue(dueAt, now) > 0;
}

/** 进入临期帖：须有截止日；胶囊 / 轮期不进临期窗（轮期到期当天再上首页打卡） */
export function participatesInDueReminders(
  kind: string,
  dueAt: Date | null | undefined,
) {
  return (
    Boolean(dueAt) &&
    kind !== PLAN_KIND_CAPSULE &&
    kind !== PLAN_KIND_CYCLE
  );
}

export function advanceCycleDue(dueAt: Date, unit: CycleUnit): Date {
  const next = new Date(dueAt);
  switch (unit) {
    case CYCLE_UNIT_DAY:
      next.setDate(next.getDate() + 1);
      break;
    case CYCLE_UNIT_WEEK:
      next.setDate(next.getDate() + 7);
      break;
    case CYCLE_UNIT_MONTH:
      next.setMonth(next.getMonth() + 1);
      break;
    case CYCLE_UNIT_YEAR:
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  next.setHours(12, 0, 0, 0);
  return next;
}
