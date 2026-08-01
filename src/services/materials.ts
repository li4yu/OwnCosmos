import { randomBytes } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  MATERIAL_SOURCE_ARCHIVE,
  MATERIAL_SOURCE_ESSAY,
  MATERIAL_SOURCE_MANUAL,
  MATERIAL_SOURCE_PLAN,
  archiveItem,
  essay,
  material,
  plan,
} from "@/db/schema";
import { MATERIAL_PAGE_SIZE } from "@/lib/material-query";

function newId() {
  return randomBytes(16).toString("hex");
}

export type MaterialRecord = typeof material.$inferSelect;

export async function listMaterials(userId: string) {
  return getDb()
    .select()
    .from(material)
    .where(eq(material.userId, userId))
    .orderBy(desc(material.createdAt));
}

function escapeIlike(raw: string) {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export type MaterialQueryOpts = {
  titleQ?: string;
  sourceKind?: string;
  createdFrom?: Date;
  createdTo?: Date;
  page?: number;
  pageSize?: number;
};

/** 素材匣分页查询 */
export async function queryMaterials(
  userId: string,
  opts: MaterialQueryOpts = {},
) {
  const pageSize = Math.min(
    10,
    Math.max(1, Math.floor(opts.pageSize ?? MATERIAL_PAGE_SIZE)),
  );
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const conditions: SQL[] = [eq(material.userId, userId)];
  const q = opts.titleQ?.trim();
  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    conditions.push(
      or(ilike(material.title, pattern), ilike(material.body, pattern))!,
    );
  }
  if (opts.sourceKind?.trim()) {
    conditions.push(eq(material.sourceKind, opts.sourceKind.trim()));
  }
  if (opts.createdFrom) {
    conditions.push(gte(material.createdAt, opts.createdFrom));
  }
  if (opts.createdTo) {
    conditions.push(lte(material.createdAt, opts.createdTo));
  }
  const where = and(...conditions);

  const [totalRow] = await getDb()
    .select({ n: count() })
    .from(material)
    .where(where);
  const total = totalRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const items = await getDb()
    .select()
    .from(material)
    .where(where)
    .orderBy(desc(material.createdAt))
    .limit(pageSize)
    .offset((safePage - 1) * pageSize);

  return { items, total, page: safePage, pageSize, totalPages };
}

export async function createMaterialFromText(
  userId: string,
  input: {
    body: string;
    title?: string;
    sourceKind?: string;
    sourceEssayId?: string | null;
    sourceArchiveItemId?: string | null;
    sourcePlanId?: string | null;
  },
) {
  const body = input.body.trim();
  if (!body) return { error: "素材正文不能为空" as const };
  const now = new Date();
  const id = newId();
  const title =
    (input.title?.trim() || body.slice(0, 40).replace(/\s+/g, " ")) ?? "";
  await getDb().insert(material).values({
    id,
    userId,
    body,
    title,
    sourceKind: input.sourceKind ?? MATERIAL_SOURCE_MANUAL,
    sourceEssayId: input.sourceEssayId ?? null,
    sourceArchiveItemId: input.sourceArchiveItemId ?? null,
    sourcePlanId: input.sourcePlanId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

export async function collectFromEssay(
  userId: string,
  essayId: string,
  excerpt?: string,
) {
  const rows = await getDb()
    .select()
    .from(essay)
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "随笔不存在" as const };
  const body = (excerpt?.trim() || row.body).trim();
  if (!body) return { error: "没有可收藏的文字" as const };
  return createMaterialFromText(userId, {
    body,
    title: row.title,
    sourceKind: MATERIAL_SOURCE_ESSAY,
    sourceEssayId: essayId,
  });
}

export async function collectFromArchive(
  userId: string,
  archiveItemId: string,
  excerpt?: string,
) {
  const rows = await getDb()
    .select()
    .from(archiveItem)
    .where(
      and(eq(archiveItem.id, archiveItemId), eq(archiveItem.userId, userId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "馆藏不存在" as const };
  const body = (excerpt?.trim() || row.body).trim();
  if (!body) return { error: "没有可收藏的文字" as const };
  return createMaterialFromText(userId, {
    body,
    title: row.title,
    sourceKind: MATERIAL_SOURCE_ARCHIVE,
    sourceArchiveItemId: archiveItemId,
  });
}

export async function collectFromPlan(
  userId: string,
  planId: string,
  excerpt?: string,
) {
  const rows = await getDb()
    .select()
    .from(plan)
    .where(and(eq(plan.id, planId), eq(plan.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return { error: "计划不存在" as const };
  const body = (excerpt?.trim() || row.body).trim();
  if (!body) return { error: "没有可收藏的文字" as const };
  return createMaterialFromText(userId, {
    body,
    title: row.title,
    sourceKind: MATERIAL_SOURCE_PLAN,
    sourcePlanId: planId,
  });
}

export async function deleteMaterial(userId: string, materialId: string) {
  const result = await getDb()
    .delete(material)
    .where(and(eq(material.id, materialId), eq(material.userId, userId)))
    .returning({ id: material.id });
  return Boolean(result[0]);
}

export async function getMaterial(userId: string, materialId: string) {
  const rows = await getDb()
    .select()
    .from(material)
    .where(and(eq(material.id, materialId), eq(material.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}
