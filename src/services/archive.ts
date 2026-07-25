import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_AUTO_48H,
  ARCHIVE_REASON_MANUAL,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  archiveItem,
  essay,
} from "@/db/schema";
import { DEFAULT_ESSAY_IDLE_HOURS } from "@/lib/archive-constants";

function newId() {
  return randomBytes(16).toString("hex");
}

export type ArchiveReason =
  | typeof ARCHIVE_REASON_MANUAL
  | typeof ARCHIVE_REASON_AUTO_48H;

export type ArchiveItemRecord = typeof archiveItem.$inferSelect;
type EssayRow = typeof essay.$inferSelect;

async function insertEssaySediment(
  row: EssayRow,
  reason: ArchiveReason,
  archivedAt: Date,
) {
  const id = newId();
  await getDb().insert(archiveItem).values({
    id,
    userId: row.userId,
    type: ARCHIVE_TYPE_ESSAY_SEDIMENT,
    title: row.title,
    body: row.body,
    sourceModule: "present",
    sourceEssayId: row.id,
    archiveReason: reason,
    archivedAt,
    sourceCreatedAt: row.createdAt,
    sourceUpdatedAt: row.updatedAt,
  });
  return id;
}

/**
 * 手动 / 自动归档单条流动随笔：
 * 写 archive_item 快照 + essay.archived_at
 */
export async function archiveActiveEssay(
  userId: string,
  essayId: string,
  reason: ArchiveReason,
) {
  const rows = await getDb()
    .select()
    .from(essay)
    .where(
      and(
        eq(essay.id, essayId),
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const now = new Date();
  const archiveId = await insertEssaySediment(row, reason, now);
  await getDb()
    .update(essay)
    .set({ archivedAt: now })
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)));
  return archiveId;
}

/** 进站补算：将该用户超过设定小时数未编辑的流动随笔自动归档 */
export async function catchUpIdleEssayArchives(
  userId: string,
  idleHours: number = DEFAULT_ESSAY_IDLE_HOURS,
) {
  const hours = Math.min(720, Math.max(1, Math.floor(idleHours)));
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  const stale = await getDb()
    .select()
    .from(essay)
    .where(
      and(
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
        lt(essay.updatedAt, cutoff),
      ),
    );

  let count = 0;
  for (const row of stale) {
    const now = new Date();
    await insertEssaySediment(row, ARCHIVE_REASON_AUTO_48H, now);
    await getDb()
      .update(essay)
      .set({ archivedAt: now })
      .where(and(eq(essay.id, row.id), eq(essay.userId, userId)));
    count += 1;
  }
  return count;
}

export async function listArchiveItems(
  userId: string,
  opts?: { type?: string },
) {
  const conditions = [eq(archiveItem.userId, userId)];
  if (opts?.type) {
    conditions.push(eq(archiveItem.type, opts.type));
  }
  return getDb()
    .select()
    .from(archiveItem)
    .where(and(...conditions))
    .orderBy(desc(archiveItem.archivedAt));
}

export async function getArchiveItem(userId: string, itemId: string) {
  const rows = await getDb()
    .select()
    .from(archiveItem)
    .where(and(eq(archiveItem.id, itemId), eq(archiveItem.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export function archiveTypeLabel(type: string) {
  switch (type) {
    case ARCHIVE_TYPE_ESSAY_SEDIMENT:
      return "随笔沉淀";
    case ARCHIVE_TYPE_PLAN_ARCHIVE:
      return "规划归档";
    case ARCHIVE_TYPE_FOCUS_RECORD:
      return "凝录";
    case "memory_fragment":
      return "记忆碎片";
    default:
      return type;
  }
}

export function sourceModuleLabel(module: string) {
  switch (module) {
    case "present":
      return "今时际";
    case "future":
      return "来日途";
    case "focus":
      return "凝时";
    case "past":
      return "昔时往";
    default:
      return module;
  }
}

export function archiveReasonLabel(reason: string) {
  switch (reason) {
    case ARCHIVE_REASON_MANUAL:
      return "手动归档";
    case ARCHIVE_REASON_AUTO_48H:
      return "逾时自动归档";
    default:
      return reason;
  }
}

/** 停留时长文案（创建 → 归档） */
export function formatDwell(createdAt: Date, archivedAt: Date) {
  const ms = Math.max(0, archivedAt.getTime() - createdAt.getTime());
  const minutes = Math.floor(ms / (60 * 1000));
  if (minutes < 1) return "不足 1 分钟";
  if (minutes < 60) return `约 ${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `约 ${hours} 小时`;
  const days = Math.floor(hours / 24);
  return `约 ${days} 天`;
}
