import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_AUTO_48H,
  ARCHIVE_REASON_DAILY_CHECKIN,
  ARCHIVE_REASON_FOCUS_COMPLETE,
  ARCHIVE_REASON_MANUAL,
  ARCHIVE_REASON_PLAN_COMPLETE,
  ARCHIVE_REASON_PLAN_CYCLE_ROLLOVER,
  ARCHIVE_REASON_PLAN_OVERDUE,
  ARCHIVE_REASON_USER_UPLOAD,
  ARCHIVE_TYPE_DAILY_CHECKIN,
  ARCHIVE_TYPE_ESSAY_SEDIMENT,
  ARCHIVE_TYPE_ESSAY_TOPIC,
  ARCHIVE_TYPE_FOCUS_RECORD,
  ARCHIVE_TYPE_MEMORY_FRAGMENT,
  ARCHIVE_TYPE_PLAN_ARCHIVE,
  ARCHIVE_TYPE_PLAN_CYCLE,
  WIPE_ARCHIVE_TYPES,
  archiveItem,
  archiveTopicEssay,
  essay,
  essayFolder,
} from "@/db/schema";
import { DEFAULT_ESSAY_IDLE_HOURS } from "@/lib/archive-constants";
import { archiveHasKeepableText } from "@/lib/archive-labels";
import { clampListPageSize } from "@/lib/list-paging";
import { parseMoodKey, type MoodKey } from "@/lib/moods";

export {
  archiveHasKeepableText,
  archiveReasonLabel,
  archiveTypeLabel,
  formatDwell,
  sourceModuleLabel,
} from "@/lib/archive-labels";

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
    sourcePlanId: row.sourcePlanId,
    archiveReason: reason,
    archivedAt,
    sourceCreatedAt: row.createdAt,
    sourceUpdatedAt: row.updatedAt,
    inKnowledge: true,
    keptAt: archivedAt,
    updatedAt: archivedAt,
    mood: row.mood,
  });
  const { copyEssayTagsToArchive } = await import("@/services/tags");
  await copyEssayTagsToArchive(row.userId, row.id, id);
  return id;
}

/**
 * 手动 / 自动归档单条流动随笔：
 * 写 archive_item 快照 + essay.archived_at
 * 专题篇禁止单篇归档，须走 archiveEssayFolder
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
  if (row.folderId) return null;

  const now = new Date();
  const archiveId = await insertEssaySediment(row, reason, now);
  await getDb()
    .update(essay)
    .set({ archivedAt: now })
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)));
  return archiveId;
}

/**
 * 整专题归档：一条父馆藏 + 夹内篇快照，并删除专题夹。
 */
export async function archiveEssayFolder(userId: string, folderId: string) {
  const { getEssayFolder } = await import("@/services/essay-folders");
  const folder = await getEssayFolder(userId, folderId);
  if (!folder) return { error: "专题不存在" as const };

  const rows = await getDb()
    .select()
    .from(essay)
    .where(
      and(
        eq(essay.userId, userId),
        eq(essay.folderId, folderId),
        isNull(essay.archivedAt),
      ),
    )
    .orderBy(asc(essay.createdAt));

  if (rows.length === 0) {
    return { error: "专题内没有可归档的随笔" as const };
  }

  const now = new Date();
  const archiveId = newId();
  await getDb().insert(archiveItem).values({
    id: archiveId,
    userId,
    type: ARCHIVE_TYPE_ESSAY_TOPIC,
    title: folder.name,
    body: folder.body,
    sourceModule: "present",
    archiveReason: ARCHIVE_REASON_MANUAL,
    archivedAt: now,
    sourceCreatedAt: folder.createdAt,
    sourceUpdatedAt: folder.updatedAt,
    cycleCount: rows.length,
    inKnowledge: true,
    keptAt: now,
    updatedAt: now,
  });

  await getDb().insert(archiveTopicEssay).values(
    rows.map((row, index) => ({
      id: newId(),
      userId,
      archiveItemId: archiveId,
      title: row.title,
      body: row.body,
      mood: row.mood,
      sourceEssayId: row.id,
      sourceCreatedAt: row.createdAt,
      sourceUpdatedAt: row.updatedAt,
      sortIndex: index,
    })),
  );

  const { mergeEssayTagsToArchive } = await import("@/services/tags");
  await mergeEssayTagsToArchive(
    userId,
    rows.map((r) => r.id),
    archiveId,
  );

  for (const row of rows) {
    await getDb()
      .update(essay)
      .set({ archivedAt: now })
      .where(and(eq(essay.id, row.id), eq(essay.userId, userId)));
  }

  await getDb()
    .delete(essayFolder)
    .where(and(eq(essayFolder.id, folderId), eq(essayFolder.userId, userId)));

  return {
    ok: true as const,
    count: rows.length,
    name: folder.name,
    archiveId,
  };
}

export async function listArchiveTopicEssays(
  userId: string,
  archiveItemId: string,
) {
  return getDb()
    .select()
    .from(archiveTopicEssay)
    .where(
      and(
        eq(archiveTopicEssay.userId, userId),
        eq(archiveTopicEssay.archiveItemId, archiveItemId),
      ),
    )
    .orderBy(asc(archiveTopicEssay.sortIndex), asc(archiveTopicEssay.sourceCreatedAt));
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
        isNull(essay.folderId),
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
  opts?: { type?: string; inKnowledge?: boolean },
) {
  const conditions = [eq(archiveItem.userId, userId)];
  if (opts?.type) {
    conditions.push(eq(archiveItem.type, opts.type));
  }
  if (opts?.inKnowledge === true) {
    conditions.push(eq(archiveItem.inKnowledge, true));
  }
  return getDb()
    .select()
    .from(archiveItem)
    .where(and(...conditions))
    .orderBy(desc(archiveItem.archivedAt));
}

const DEFAULT_PAGE_SIZE = 10;

export type ArchiveQueryOpts = {
  type?: string;
  types?: readonly string[];
  inKnowledge?: boolean;
  /** 标题模糊（不区分大小写） */
  titleQ?: string;
  archivedFrom?: Date;
  archivedTo?: Date;
  /** Phase 13: 按馆藏绪签筛选 */
  tagId?: string;
  page?: number;
  pageSize?: number;
};

function escapeIlike(raw: string) {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function buildArchiveConditions(
  userId: string,
  opts: ArchiveQueryOpts,
): SQL | undefined {
  const conditions: SQL[] = [eq(archiveItem.userId, userId)];
  if (opts.type) conditions.push(eq(archiveItem.type, opts.type));
  if (opts.types?.length) {
    conditions.push(inArray(archiveItem.type, [...opts.types]));
  }
  if (opts.inKnowledge === true) {
    conditions.push(eq(archiveItem.inKnowledge, true));
  }
  if (opts.inKnowledge === false) {
    conditions.push(eq(archiveItem.inKnowledge, false));
  }
  const q = opts.titleQ?.trim();
  if (q) {
    conditions.push(ilike(archiveItem.title, `%${escapeIlike(q)}%`));
  }
  if (opts.archivedFrom) {
    conditions.push(gte(archiveItem.archivedAt, opts.archivedFrom));
  }
  if (opts.archivedTo) {
    conditions.push(lte(archiveItem.archivedAt, opts.archivedTo));
  }
  if (opts.tagId?.trim()) {
    const tagId = opts.tagId.trim();
    conditions.push(
      sql`exists (
        select 1 from archive_item_tag ait
        where ait.archive_item_id = ${archiveItem.id}
          and ait.user_id = ${userId}
          and ait.tag_id = ${tagId}
      )`,
    );
  }
  return and(...conditions);
}

/** 馆藏分页查询（藏忆 / 抹忆共用） */
export async function queryArchiveItems(
  userId: string,
  opts: ArchiveQueryOpts = {},
) {
  const pageSize = clampListPageSize(opts.pageSize ?? DEFAULT_PAGE_SIZE);
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const where = buildArchiveConditions(userId, opts);

  const [totalRow] = await getDb()
    .select({ n: count() })
    .from(archiveItem)
    .where(where);
  const total = totalRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const items = await getDb()
    .select()
    .from(archiveItem)
    .where(where)
    .orderBy(desc(archiveItem.archivedAt))
    .limit(pageSize)
    .offset((safePage - 1) * pageSize);

  return { items, total, page: safePage, pageSize, totalPages };
}

export async function getArchiveItem(userId: string, itemId: string) {
  const rows = await getDb()
    .select()
    .from(archiveItem)
    .where(and(eq(archiveItem.id, itemId), eq(archiveItem.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/** 藏忆 / 取消藏忆；纯图无正文的碎片不可藏忆 */
export async function setArchiveKept(
  userId: string,
  itemId: string,
  kept: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const item = await getArchiveItem(userId, itemId);
  if (!item) return { ok: false, error: "条目不存在" };
  if (kept) {
    if (!archiveHasKeepableText(item)) {
      return { ok: false, error: "纯图无文字，无法藏忆进知识库" };
    }
  }
  const now = new Date();
  await getDb()
    .update(archiveItem)
    .set({
      inKnowledge: kept,
      keptAt: kept ? now : null,
      updatedAt: now,
    })
    .where(and(eq(archiveItem.id, itemId), eq(archiveItem.userId, userId)));
  return { ok: true };
}

/** 批量藏忆 / 取消藏忆 */
export async function setArchiveKeptMany(
  userId: string,
  itemIds: string[],
  kept: boolean,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const ids = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return { ok: false, error: "请先选择条目" };

  const rows = await getDb()
    .select()
    .from(archiveItem)
    .where(and(eq(archiveItem.userId, userId), inArray(archiveItem.id, ids)));

  if (rows.length === 0) return { ok: false, error: "未找到所选条目" };

  let targetIds = rows.map((r) => r.id);
  if (kept) {
    targetIds = rows.filter(archiveHasKeepableText).map((r) => r.id);
    if (targetIds.length === 0) {
      return { ok: false, error: "所选条目均无可用文本，无法藏忆" };
    }
  }

  const now = new Date();
  await getDb()
    .update(archiveItem)
    .set({
      inKnowledge: kept,
      keptAt: kept ? now : null,
      updatedAt: now,
    })
    .where(
      and(eq(archiveItem.userId, userId), inArray(archiveItem.id, targetIds)),
    );
  return { ok: true, count: targetIds.length };
}

async function deleteLocalImage(imageKey: string | null | undefined) {
  if (!imageKey) return;
  if (imageKey.includes("..") || path.isAbsolute(imageKey)) return;
  const abs = path.join(process.cwd(), "public", imageKey);
  try {
    await unlink(abs);
  } catch {
    // 文件可能已不在
  }
}

async function hardDeleteArchiveRows(
  userId: string,
  rows: { id: string; imageKey: string | null }[],
) {
  for (const row of rows) {
    await deleteLocalImage(row.imageKey);
  }
  if (rows.length === 0) return 0;
  await getDb()
    .delete(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        inArray(
          archiveItem.id,
          rows.map((r) => r.id),
        ),
      ),
    );
  return rows.length;
}

/**
 * 抹忆：按归档时间范围硬删（WIPE_ARCHIVE_TYPES，含轮期/日课归档）
 */
export async function wipeInflowArchives(
  userId: string,
  from: Date,
  to: Date,
) {
  if (from.getTime() > to.getTime()) {
    return { ok: false as const, error: "开始日期不能晚于结束日期", count: 0 };
  }
  const rows = await getDb()
    .select({
      id: archiveItem.id,
      imageKey: archiveItem.imageKey,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        inArray(archiveItem.type, [...WIPE_ARCHIVE_TYPES]),
        gte(archiveItem.archivedAt, from),
        lte(archiveItem.archivedAt, to),
      ),
    );

  const deleted = await hardDeleteArchiveRows(userId, rows);
  return { ok: true as const, count: deleted };
}

/** 抹忆：按选中 id 硬删（流入类 + 记忆碎片） */
export async function wipeInflowArchivesByIds(
  userId: string,
  itemIds: string[],
) {
  const ids = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { ok: false as const, error: "请先选择条目", count: 0 };
  }
  const rows = await getDb()
    .select({
      id: archiveItem.id,
      imageKey: archiveItem.imageKey,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        inArray(archiveItem.type, [...WIPE_ARCHIVE_TYPES]),
        inArray(archiveItem.id, ids),
      ),
    );
  if (rows.length === 0) {
    return { ok: false as const, error: "所选条目不可抹忆或不存在", count: 0 };
  }
  const deleted = await hardDeleteArchiveRows(userId, rows);
  return { ok: true as const, count: deleted };
}

export async function createMemoryFragment(
  userId: string,
  input: {
    title: string;
    body: string;
    imageUrl?: string | null;
    imageKey?: string | null;
  },
) {
  const titleRaw = input.title.trim();
  const title = titleRaw || "无标题";
  const body = input.body.trim();
  const imageUrl = input.imageUrl?.trim() || null;
  const imageKey = input.imageKey?.trim() || null;
  // 标题 / 正文 / 图片 至少一项
  if (!titleRaw && !body && !imageUrl) return null;

  const now = new Date();
  const id = newId();
  await getDb().insert(archiveItem).values({
    id,
    userId,
    type: ARCHIVE_TYPE_MEMORY_FRAGMENT,
    title,
    body,
    sourceModule: "past",
    archiveReason: ARCHIVE_REASON_USER_UPLOAD,
    archivedAt: now,
    sourceCreatedAt: now,
    sourceUpdatedAt: now,
    imageUrl,
    imageKey,
    inKnowledge: false,
    keptAt: null,
    updatedAt: now,
  });
  return id;
}

export async function updateMemoryFragment(
  userId: string,
  itemId: string,
  input: {
    title: string;
    body: string;
    imageUrl?: string | null;
    imageKey?: string | null;
    clearImage?: boolean;
  },
) {
  const item = await getArchiveItem(userId, itemId);
  if (!item || item.type !== ARCHIVE_TYPE_MEMORY_FRAGMENT) return null;

  const titleRaw = input.title.trim();
  const title = titleRaw || "无标题";
  const body = input.body.trim();
  let imageUrl = item.imageUrl;
  let imageKey = item.imageKey;
  if (input.clearImage) {
    await deleteLocalImage(item.imageKey);
    imageUrl = null;
    imageKey = null;
  } else if (input.imageUrl !== undefined) {
    if (input.imageKey && input.imageKey !== item.imageKey) {
      await deleteLocalImage(item.imageKey);
    }
    imageUrl = input.imageUrl?.trim() || null;
    imageKey = input.imageKey?.trim() || null;
  }
  if (!titleRaw && !body && !imageUrl) return null;

  const now = new Date();
  const keepable = archiveHasKeepableText({ title, body });
  await getDb()
    .update(archiveItem)
    .set({
      title,
      body,
      imageUrl,
      imageKey,
      sourceUpdatedAt: now,
      updatedAt: now,
      ...(keepable
        ? {}
        : { inKnowledge: false, keptAt: null }),
    })
    .where(and(eq(archiveItem.id, itemId), eq(archiveItem.userId, userId)));
  return itemId;
}

export async function deleteMemoryFragment(userId: string, itemId: string) {
  const item = await getArchiveItem(userId, itemId);
  if (!item || item.type !== ARCHIVE_TYPE_MEMORY_FRAGMENT) return false;
  await deleteLocalImage(item.imageKey);
  await getDb()
    .delete(archiveItem)
    .where(and(eq(archiveItem.id, itemId), eq(archiveItem.userId, userId)));
  return true;
}

/** Phase 15: 馆藏补改绪印（只改 mood，不改只读正文） */
export async function setArchiveMood(
  userId: string,
  itemId: string,
  mood: string | null,
): Promise<{ ok: true; mood: MoodKey | null } | { ok: false; error: string }> {
  const item = await getArchiveItem(userId, itemId);
  if (!item) return { ok: false, error: "条目不存在" };
  const next = mood === null || mood === "" ? null : parseMoodKey(mood);
  if (mood && mood.trim() && !next) {
    return { ok: false, error: "无效的心情" };
  }
  const now = new Date();
  await getDb()
    .update(archiveItem)
    .set({ mood: next, updatedAt: now })
    .where(and(eq(archiveItem.id, itemId), eq(archiveItem.userId, userId)));
  return { ok: true, mood: next };
}

