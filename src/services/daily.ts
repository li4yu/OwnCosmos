import { randomBytes } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_DAILY_CHECKIN,
  ARCHIVE_TYPE_DAILY_CHECKIN,
  archiveItem,
  dailyCheckin,
  dailyHabit,
} from "@/db/schema";
import { mergeDatedArchiveBody } from "@/lib/dated-notes";
import { formatDueDateInput } from "@/lib/plan-dates";

function newId() {
  return randomBytes(16).toString("hex");
}

export type DailyHabitRecord = typeof dailyHabit.$inferSelect;
export type DailyCheckinRecord = typeof dailyCheckin.$inferSelect;

export function localCheckinDate(now = new Date()) {
  return formatDueDateInput(now);
}

export async function listActiveHabits(userId: string) {
  return getDb()
    .select()
    .from(dailyHabit)
    .where(and(eq(dailyHabit.userId, userId), eq(dailyHabit.active, true)))
    .orderBy(asc(dailyHabit.createdAt));
}

export async function createHabit(
  userId: string,
  input: { title: string; body?: string },
) {
  const title = input.title.trim();
  if (!title) return null;
  const now = new Date();
  const id = newId();
  await getDb().insert(dailyHabit).values({
    id,
    userId,
    title,
    body: input.body ?? "",
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function deactivateHabit(userId: string, habitId: string) {
  const rows = await getDb()
    .select()
    .from(dailyHabit)
    .where(and(eq(dailyHabit.id, habitId), eq(dailyHabit.userId, userId)))
    .limit(1);
  if (!rows[0]) return false;
  await getDb()
    .update(dailyHabit)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(dailyHabit.id, habitId), eq(dailyHabit.userId, userId)));
  return true;
}

export async function getCheckinForDate(
  userId: string,
  habitId: string,
  checkinDate: string,
) {
  const rows = await getDb()
    .select()
    .from(dailyCheckin)
    .where(
      and(
        eq(dailyCheckin.userId, userId),
        eq(dailyCheckin.habitId, habitId),
        eq(dailyCheckin.checkinDate, checkinDate),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listTodayCheckins(userId: string, now = new Date()) {
  const checkinDate = localCheckinDate(now);
  return getDb()
    .select()
    .from(dailyCheckin)
    .where(
      and(
        eq(dailyCheckin.userId, userId),
        eq(dailyCheckin.checkinDate, checkinDate),
      ),
    );
}

/** 日课习惯计次归档：同 habit 一条；新打卡日 +1；心得按日追加（日期在前） */
async function upsertDailyHabitArchive(
  habit: DailyHabitRecord,
  note: string,
  checkinDate: string,
  isNewDay: boolean,
  now: Date,
) {
  const existing = await getDb()
    .select()
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, habit.userId),
        eq(archiveItem.type, ARCHIVE_TYPE_DAILY_CHECKIN),
        eq(archiveItem.sourceHabitId, habit.id),
      ),
    )
    .limit(1);

  const prev = existing[0];
  const body = mergeDatedArchiveBody(
    prev?.body ?? "",
    checkinDate,
    note,
    habit.body.trim() || "（已打卡）",
  );
  if (prev) {
    await getDb()
      .update(archiveItem)
      .set({
        title: habit.title,
        body,
        cycleCount: isNewDay
          ? (prev.cycleCount ?? 0) + 1
          : (prev.cycleCount ?? 1),
        archiveReason: ARCHIVE_REASON_DAILY_CHECKIN,
        archivedAt: now,
        sourceUpdatedAt: now,
      })
      .where(eq(archiveItem.id, prev.id));
    return prev.id;
  }

  const id = newId();
  await getDb().insert(archiveItem).values({
    id,
    userId: habit.userId,
    type: ARCHIVE_TYPE_DAILY_CHECKIN,
    title: habit.title,
    body,
    sourceModule: "future",
    sourceHabitId: habit.id,
    cycleCount: 1,
    archiveReason: ARCHIVE_REASON_DAILY_CHECKIN,
    archivedAt: now,
    sourceCreatedAt: habit.createdAt,
    sourceUpdatedAt: now,
    inKnowledge: true,
    keptAt: now,
  });
  return id;
}

/**
 * 打卡；同日重复则更新 note，并同步馆藏日课归档（按习惯计次、按日追加心得）
 */
export async function checkinHabit(
  userId: string,
  habitId: string,
  note: string,
  now = new Date(),
) {
  const habits = await getDb()
    .select()
    .from(dailyHabit)
    .where(
      and(
        eq(dailyHabit.id, habitId),
        eq(dailyHabit.userId, userId),
        eq(dailyHabit.active, true),
      ),
    )
    .limit(1);
  const habit = habits[0];
  if (!habit) return null;

  const checkinDate = localCheckinDate(now);
  const existing = await getCheckinForDate(userId, habitId, checkinDate);
  let checkinId: string;
  let isNewDay = false;
  if (existing) {
    await getDb()
      .update(dailyCheckin)
      .set({ note: note.trim() })
      .where(eq(dailyCheckin.id, existing.id));
    checkinId = existing.id;
  } else {
    checkinId = newId();
    isNewDay = true;
    await getDb().insert(dailyCheckin).values({
      id: checkinId,
      userId,
      habitId,
      checkinDate,
      note: note.trim(),
      createdAt: now,
    });
  }

  await upsertDailyHabitArchive(habit, note, checkinDate, isNewDay, now);
  return checkinId;
}

export async function listRecentCheckins(userId: string, limit = 20) {
  return getDb()
    .select({
      checkin: dailyCheckin,
      habitTitle: dailyHabit.title,
    })
    .from(dailyCheckin)
    .innerJoin(dailyHabit, eq(dailyHabit.id, dailyCheckin.habitId))
    .where(eq(dailyCheckin.userId, userId))
    .orderBy(desc(dailyCheckin.checkinDate), desc(dailyCheckin.createdAt))
    .limit(limit);
}
