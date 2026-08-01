import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_FOCUS_COMPLETE,
  ARCHIVE_TYPE_FOCUS_RECORD,
  FOCUS_MODE_FORWARD,
  FOCUS_STATUS_COMPLETED,
  FOCUS_STATUS_PAUSED,
  FOCUS_STATUS_RUNNING,
  archiveItem,
  focusSession,
} from "@/db/schema";
import { defaultFocusTitle } from "@/lib/focus-duration";

function newId() {
  return randomBytes(16).toString("hex");
}

export type FocusSessionRecord = typeof focusSession.$inferSelect;

/** 当前累计专注毫秒（含 running 段） */
export function focusElapsedMs(
  row: Pick<
    FocusSessionRecord,
    "accumulatedMs" | "status" | "runningSince"
  >,
  now = new Date(),
) {
  let total = Math.max(0, row.accumulatedMs);
  if (
    row.status === FOCUS_STATUS_RUNNING &&
    row.runningSince instanceof Date
  ) {
    total += Math.max(0, now.getTime() - row.runningSince.getTime());
  }
  return total;
}

export async function getActiveFocusSession(userId: string) {
  const rows = await getDb()
    .select()
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        or(
          eq(focusSession.status, FOCUS_STATUS_RUNNING),
          eq(focusSession.status, FOCUS_STATUS_PAUSED),
        ),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getFocusSession(userId: string, sessionId: string) {
  const rows = await getDb()
    .select()
    .from(focusSession)
    .where(
      and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** 已完成凝录（模块内列表） */
export async function listCompletedFocusSessions(userId: string, limit = 50) {
  const sessions = await getDb()
    .select()
    .from(focusSession)
    .where(
      and(
        eq(focusSession.userId, userId),
        eq(focusSession.status, FOCUS_STATUS_COMPLETED),
      ),
    )
    .orderBy(desc(focusSession.endedAt))
    .limit(limit);

  if (sessions.length === 0) return [];

  const archives = await getDb()
    .select({
      id: archiveItem.id,
      sourceFocusSessionId: archiveItem.sourceFocusSessionId,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        eq(archiveItem.type, ARCHIVE_TYPE_FOCUS_RECORD),
        inArray(
          archiveItem.sourceFocusSessionId,
          sessions.map((s) => s.id),
        ),
      ),
    );

  const archiveBySession = new Map(
    archives
      .filter((a) => a.sourceFocusSessionId)
      .map((a) => [a.sourceFocusSessionId!, a.id]),
  );

  return sessions.map((s) => ({
    ...s,
    archiveId: archiveBySession.get(s.id) ?? null,
    elapsedMs: s.accumulatedMs,
  }));
}

/** 开始顺钟；若已有进行中会话则返回既有 */
export async function startForwardFocus(userId: string) {
  const existing = await getActiveFocusSession(userId);
  if (existing) return existing;

  const now = new Date();
  const id = newId();
  await getDb().insert(focusSession).values({
    id,
    userId,
    mode: FOCUS_MODE_FORWARD,
    status: FOCUS_STATUS_RUNNING,
    accumulatedMs: 0,
    runningSince: now,
    startedAt: now,
    updatedAt: now,
  });
  return (await getFocusSession(userId, id))!;
}

export async function pauseFocusSession(userId: string, sessionId: string) {
  const row = await getFocusSession(userId, sessionId);
  if (!row || row.status !== FOCUS_STATUS_RUNNING) return null;

  const now = new Date();
  const accumulatedMs = focusElapsedMs(row, now);
  await getDb()
    .update(focusSession)
    .set({
      status: FOCUS_STATUS_PAUSED,
      accumulatedMs,
      runningSince: null,
      updatedAt: now,
    })
    .where(and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)));
  return getFocusSession(userId, sessionId);
}

export async function resumeFocusSession(userId: string, sessionId: string) {
  const row = await getFocusSession(userId, sessionId);
  if (!row || row.status !== FOCUS_STATUS_PAUSED) return null;

  const now = new Date();
  await getDb()
    .update(focusSession)
    .set({
      status: FOCUS_STATUS_RUNNING,
      runningSince: now,
      updatedAt: now,
    })
    .where(and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)));
  return getFocusSession(userId, sessionId);
}

/**
 * 结束顺钟 → 写馆藏凝录 + completed
 */
export async function completeFocusSession(
  userId: string,
  sessionId: string,
  reflection = "",
) {
  const row = await getFocusSession(userId, sessionId);
  if (
    !row ||
    (row.status !== FOCUS_STATUS_RUNNING &&
      row.status !== FOCUS_STATUS_PAUSED)
  ) {
    return null;
  }

  const now = new Date();
  const accumulatedMs = focusElapsedMs(row, now);
  const title = defaultFocusTitle(row.mode, accumulatedMs);
  const body = reflection.trim();

  const archiveId = newId();
  await getDb().insert(archiveItem).values({
    id: archiveId,
    userId,
    type: ARCHIVE_TYPE_FOCUS_RECORD,
    title,
    body,
    sourceModule: "focus",
    sourceFocusSessionId: sessionId,
    archiveReason: ARCHIVE_REASON_FOCUS_COMPLETE,
    archivedAt: now,
    sourceCreatedAt: row.startedAt,
    sourceUpdatedAt: now,
    inKnowledge: true,
    keptAt: now,
  });

  await getDb()
    .update(focusSession)
    .set({
      status: FOCUS_STATUS_COMPLETED,
      accumulatedMs,
      runningSince: null,
      endedAt: now,
      title,
      reflection: body,
      updatedAt: now,
    })
    .where(and(eq(focusSession.id, sessionId), eq(focusSession.userId, userId)));

  return { sessionId, archiveId, accumulatedMs, title };
}
