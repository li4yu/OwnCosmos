import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { archiveItem, essay, plan } from "@/db/schema";
import { stripToPlainText } from "@/lib/rich-text";

export type SearchHitKind = "essay" | "plan" | "archive";

export type SearchHit = {
  kind: SearchHitKind;
  id: string;
  title: string;
  body: string;
  href: string;
  meta: string;
};

function escapeLike(q: string) {
  return q.replace(/[%_\\]/g, "\\$&");
}

/**
 * 全局关键词检索：流动随笔 + 未归档计划 + 馆藏（标题/正文 ILIKE）
 */
export async function searchAll(
  userId: string,
  rawQ: string,
  limitPerKind = 20,
) {
  const q = rawQ.trim();
  if (!q) return [] as SearchHit[];
  const pattern = `%${escapeLike(q)}%`;
  const hits: SearchHit[] = [];

  const essays = await getDb()
    .select({
      id: essay.id,
      title: essay.title,
      body: essay.body,
      updatedAt: essay.updatedAt,
    })
    .from(essay)
    .where(
      and(
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
        or(ilike(essay.title, pattern), ilike(essay.body, pattern)),
      ),
    )
    .orderBy(desc(essay.updatedAt))
    .limit(limitPerKind);

  for (const row of essays) {
    hits.push({
      kind: "essay",
      id: row.id,
      title: row.title,
      body: row.body,
      href: `/app/present/essays/${row.id}`,
      meta: "随笔",
    });
  }

  const plans = await getDb()
    .select({
      id: plan.id,
      title: plan.title,
      body: plan.body,
      kind: plan.kind,
      updatedAt: plan.updatedAt,
    })
    .from(plan)
    .where(
      and(
        eq(plan.userId, userId),
        isNull(plan.archivedAt),
        or(ilike(plan.title, pattern), ilike(plan.body, pattern)),
      ),
    )
    .orderBy(desc(plan.updatedAt))
    .limit(limitPerKind);

  for (const row of plans) {
    hits.push({
      kind: "plan",
      id: row.id,
      title: row.title,
      body: row.body,
      href: `/app/future/plans/${row.id}`,
      meta: "来日途",
    });
  }

  const archives = await getDb()
    .select({
      id: archiveItem.id,
      title: archiveItem.title,
      body: archiveItem.body,
      type: archiveItem.type,
      archivedAt: archiveItem.archivedAt,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        or(
          ilike(archiveItem.title, pattern),
          ilike(archiveItem.body, pattern),
        ),
      ),
    )
    .orderBy(desc(archiveItem.archivedAt))
    .limit(limitPerKind);

  for (const row of archives) {
    hits.push({
      kind: "archive",
      id: row.id,
      title: row.title,
      body: row.body,
      href: `/app/past/gallery/${row.id}`,
      meta: "馆藏",
    });
  }

  return hits;
}

/** 引用过往：仅搜馆藏 */
export async function searchArchivesForBorrow(
  userId: string,
  rawQ: string,
  limit = 30,
) {
  const q = rawQ.trim();
  if (!q) return [];
  const pattern = `%${escapeLike(q)}%`;
  const rows = await getDb()
    .select({
      id: archiveItem.id,
      title: archiveItem.title,
      body: archiveItem.body,
      type: archiveItem.type,
      archivedAt: archiveItem.archivedAt,
    })
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.userId, userId),
        or(ilike(archiveItem.title, pattern), ilike(archiveItem.body, pattern)),
        sql`length(trim(${archiveItem.body})) > 0`,
      ),
    )
    .orderBy(desc(archiveItem.archivedAt))
    .limit(limit * 2);

  return rows
    .map((row) => ({
      ...row,
      body: stripToPlainText(row.body),
    }))
    .filter((row) => row.body.length > 0)
    .slice(0, limit);
}
