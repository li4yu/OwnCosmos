import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  archiveItemTag,
  essayTag,
  planTag,
  tag,
} from "@/db/schema";

function newId() {
  return randomBytes(16).toString("hex");
}

export type TagRecord = typeof tag.$inferSelect;

export async function listActiveTags(userId: string) {
  return getDb()
    .select()
    .from(tag)
    .where(and(eq(tag.userId, userId), eq(tag.active, true)))
    .orderBy(asc(tag.name));
}

/** 含停用签，供馆藏筛选展示历史名 */
export async function listAllTags(userId: string) {
  return getDb()
    .select()
    .from(tag)
    .where(eq(tag.userId, userId))
    .orderBy(asc(tag.name));
}

/**
 * 创建或复用同名签：若已停用则重新激活。
 */
export async function ensureTag(userId: string, rawName: string) {
  const name = rawName.trim().slice(0, 32);
  if (!name) return { error: "请填写标签名称" as const };

  const existing = await getDb()
    .select()
    .from(tag)
    .where(and(eq(tag.userId, userId), eq(tag.name, name)))
    .limit(1);
  const row = existing[0];
  if (row) {
    if (!row.active) {
      const now = new Date();
      await getDb()
        .update(tag)
        .set({ active: true, updatedAt: now })
        .where(and(eq(tag.id, row.id), eq(tag.userId, userId)));
      return { tag: { ...row, active: true, updatedAt: now } };
    }
    return { tag: row };
  }

  const now = new Date();
  const id = newId();
  const created: TagRecord = {
    id,
    userId,
    name,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await getDb().insert(tag).values(created);
  return { tag: created };
}

/** 软停用，并摘掉流动随笔 / 未归档计划上的关联 */
export async function deactivateTag(userId: string, tagId: string) {
  const rows = await getDb()
    .select()
    .from(tag)
    .where(and(eq(tag.id, tagId), eq(tag.userId, userId)))
    .limit(1);
  if (!rows[0]) return false;

  const now = new Date();
  await getDb()
    .update(tag)
    .set({ active: false, updatedAt: now })
    .where(and(eq(tag.id, tagId), eq(tag.userId, userId)));
  await getDb()
    .delete(essayTag)
    .where(and(eq(essayTag.userId, userId), eq(essayTag.tagId, tagId)));
  await getDb()
    .delete(planTag)
    .where(and(eq(planTag.userId, userId), eq(planTag.tagId, tagId)));
  return true;
}

export async function listEssayTagIds(userId: string, essayId: string) {
  const rows = await getDb()
    .select({ tagId: essayTag.tagId })
    .from(essayTag)
    .where(and(eq(essayTag.userId, userId), eq(essayTag.essayId, essayId)));
  return rows.map((r) => r.tagId);
}

export async function listPlanTagIds(userId: string, planId: string) {
  const rows = await getDb()
    .select({ tagId: planTag.tagId })
    .from(planTag)
    .where(and(eq(planTag.userId, userId), eq(planTag.planId, planId)));
  return rows.map((r) => r.tagId);
}

export async function listEssayTags(userId: string, essayId: string) {
  return getDb()
    .select({
      id: tag.id,
      name: tag.name,
      active: tag.active,
    })
    .from(essayTag)
    .innerJoin(tag, eq(essayTag.tagId, tag.id))
    .where(and(eq(essayTag.userId, userId), eq(essayTag.essayId, essayId)))
    .orderBy(asc(tag.name));
}

/** 批量取多条随笔的标签名（列表页用） */
export async function mapEssayTagNames(
  userId: string,
  essayIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (essayIds.length === 0) return map;
  const rows = await getDb()
    .select({
      essayId: essayTag.essayId,
      name: tag.name,
    })
    .from(essayTag)
    .innerJoin(tag, eq(essayTag.tagId, tag.id))
    .where(
      and(eq(essayTag.userId, userId), inArray(essayTag.essayId, essayIds)),
    )
    .orderBy(asc(tag.name));
  for (const row of rows) {
    const list = map.get(row.essayId) ?? [];
    list.push(row.name);
    map.set(row.essayId, list);
  }
  return map;
}

export async function listPlanTags(userId: string, planId: string) {
  return getDb()
    .select({
      id: tag.id,
      name: tag.name,
      active: tag.active,
    })
    .from(planTag)
    .innerJoin(tag, eq(planTag.tagId, tag.id))
    .where(and(eq(planTag.userId, userId), eq(planTag.planId, planId)))
    .orderBy(asc(tag.name));
}

/** 批量取多条计划的标签名 */
export async function mapPlanTagNames(
  userId: string,
  planIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (planIds.length === 0) return map;
  const rows = await getDb()
    .select({
      planId: planTag.planId,
      name: tag.name,
    })
    .from(planTag)
    .innerJoin(tag, eq(planTag.tagId, tag.id))
    .where(and(eq(planTag.userId, userId), inArray(planTag.planId, planIds)))
    .orderBy(asc(tag.name));
  for (const row of rows) {
    const list = map.get(row.planId) ?? [];
    list.push(row.name);
    map.set(row.planId, list);
  }
  return map;
}

/** 全量替换随笔标签（仅允许挂当前用户的 active 签，或已挂过的签） */
export async function setEssayTags(
  userId: string,
  essayId: string,
  tagIds: string[],
) {
  const unique = [...new Set(tagIds.filter(Boolean))];
  if (unique.length > 0) {
    const owned = await getDb()
      .select({ id: tag.id })
      .from(tag)
      .where(and(eq(tag.userId, userId), inArray(tag.id, unique)));
    if (owned.length !== unique.length) {
      return { error: "含有无效标签" as const };
    }
  }
  await getDb()
    .delete(essayTag)
    .where(and(eq(essayTag.userId, userId), eq(essayTag.essayId, essayId)));
  if (unique.length > 0) {
    await getDb().insert(essayTag).values(
      unique.map((tagId) => ({
        userId,
        essayId,
        tagId,
      })),
    );
  }
  return { ok: true as const };
}

export async function setPlanTags(
  userId: string,
  planId: string,
  tagIds: string[],
) {
  const unique = [...new Set(tagIds.filter(Boolean))];
  if (unique.length > 0) {
    const owned = await getDb()
      .select({ id: tag.id })
      .from(tag)
      .where(and(eq(tag.userId, userId), inArray(tag.id, unique)));
    if (owned.length !== unique.length) {
      return { error: "含有无效标签" as const };
    }
  }
  await getDb()
    .delete(planTag)
    .where(and(eq(planTag.userId, userId), eq(planTag.planId, planId)));
  if (unique.length > 0) {
    await getDb().insert(planTag).values(
      unique.map((tagId) => ({
        userId,
        planId,
        tagId,
      })),
    );
  }
  return { ok: true as const };
}

/** 归档时：把多篇随笔标签去重合并进馆藏父条 */
export async function mergeEssayTagsToArchive(
  userId: string,
  essayIds: string[],
  archiveItemId: string,
) {
  if (essayIds.length === 0) return;
  const rows = await getDb()
    .select({
      tagId: essayTag.tagId,
      name: tag.name,
    })
    .from(essayTag)
    .innerJoin(tag, eq(essayTag.tagId, tag.id))
    .where(
      and(eq(essayTag.userId, userId), inArray(essayTag.essayId, essayIds)),
    );

  const byTag = new Map<string, string>();
  for (const r of rows) {
    if (!byTag.has(r.tagId)) byTag.set(r.tagId, r.name);
  }
  if (byTag.size === 0) return;
  await getDb().insert(archiveItemTag).values(
    [...byTag.entries()].map(([tagId, nameSnapshot]) => ({
      userId,
      archiveItemId,
      tagId,
      nameSnapshot,
    })),
  );
}

/** 归档时：把随笔标签复制进馆藏（含 name_snapshot） */
export async function copyEssayTagsToArchive(
  userId: string,
  essayId: string,
  archiveItemId: string,
) {
  const rows = await getDb()
    .select({
      tagId: essayTag.tagId,
      name: tag.name,
    })
    .from(essayTag)
    .innerJoin(tag, eq(essayTag.tagId, tag.id))
    .where(and(eq(essayTag.userId, userId), eq(essayTag.essayId, essayId)));

  if (rows.length === 0) return;
  await getDb().insert(archiveItemTag).values(
    rows.map((r) => ({
      userId,
      archiveItemId,
      tagId: r.tagId,
      nameSnapshot: r.name,
    })),
  );
}

/** 归档时：把计划标签复制进馆藏 */
export async function copyPlanTagsToArchive(
  userId: string,
  planId: string,
  archiveItemId: string,
) {
  const rows = await getDb()
    .select({
      tagId: planTag.tagId,
      name: tag.name,
    })
    .from(planTag)
    .innerJoin(tag, eq(planTag.tagId, tag.id))
    .where(and(eq(planTag.userId, userId), eq(planTag.planId, planId)));

  if (rows.length === 0) return;
  await getDb().insert(archiveItemTag).values(
    rows.map((r) => ({
      userId,
      archiveItemId,
      tagId: r.tagId,
      nameSnapshot: r.name,
    })),
  );
}

export async function listArchiveItemTags(
  userId: string,
  archiveItemId: string,
) {
  return getDb()
    .select({
      tagId: archiveItemTag.tagId,
      nameSnapshot: archiveItemTag.nameSnapshot,
    })
    .from(archiveItemTag)
    .where(
      and(
        eq(archiveItemTag.userId, userId),
        eq(archiveItemTag.archiveItemId, archiveItemId),
      ),
    )
    .orderBy(asc(archiveItemTag.nameSnapshot));
}
