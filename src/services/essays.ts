import { randomBytes } from "node:crypto";
import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import { essay } from "@/db/schema";
import { ESSAY_PAGE_SIZE } from "@/lib/essay-query";
import { parseMoodKey, type MoodKey } from "@/lib/moods";

function newId() {
  return randomBytes(16).toString("hex");
}

function escapeIlike(raw: string) {
  return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export type EssayRecord = typeof essay.$inferSelect;

export type EssayQueryOpts = {
  /** 标题模糊 */
  titleQ?: string;
  tagId?: string;
  mood?: MoodKey;
  /** 按 updated_at */
  updatedFrom?: Date;
  updatedTo?: Date;
  page?: number;
  pageSize?: number;
};

export async function listActiveEssays(userId: string) {
  return getDb()
    .select()
    .from(essay)
    .where(and(eq(essay.userId, userId), isNull(essay.archivedAt)))
    .orderBy(desc(essay.updatedAt));
}

function buildActiveEssayConditions(
  userId: string,
  opts: EssayQueryOpts,
): SQL | undefined {
  const conditions: SQL[] = [
    eq(essay.userId, userId),
    isNull(essay.archivedAt),
  ];
  const q = opts.titleQ?.trim();
  if (q) {
    const pattern = `%${escapeIlike(q)}%`;
    conditions.push(
      or(ilike(essay.title, pattern), ilike(essay.body, pattern))!,
    );
  }
  if (opts.mood) {
    conditions.push(eq(essay.mood, opts.mood));
  }
  if (opts.updatedFrom) {
    conditions.push(gte(essay.updatedAt, opts.updatedFrom));
  }
  if (opts.updatedTo) {
    conditions.push(lte(essay.updatedAt, opts.updatedTo));
  }
  if (opts.tagId?.trim()) {
    const tagId = opts.tagId.trim();
    conditions.push(
      sql`exists (
        select 1 from essay_tag et
        where et.essay_id = ${essay.id}
          and et.user_id = ${userId}
          and et.tag_id = ${tagId}
      )`,
    );
  }
  return and(...conditions);
}

/** 流动随笔分页查询（标题/正文模糊、绪签、心情、更新时间） */
export async function queryActiveEssays(
  userId: string,
  opts: EssayQueryOpts = {},
) {
  const pageSize = Math.min(
    10,
    Math.max(1, Math.floor(opts.pageSize ?? ESSAY_PAGE_SIZE)),
  );
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const where = buildActiveEssayConditions(userId, opts);

  const [totalRow] = await getDb()
    .select({ n: count() })
    .from(essay)
    .where(where);
  const total = totalRow?.n ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const items = await getDb()
    .select()
    .from(essay)
    .where(where)
    .orderBy(desc(essay.updatedAt))
    .limit(pageSize)
    .offset((safePage - 1) * pageSize);

  return { items, total, page: safePage, pageSize, totalPages };
}

export async function getActiveEssay(userId: string, essayId: string) {
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
  return rows[0] ?? null;
}

export async function createEssay(
  userId: string,
  input: {
    title: string;
    body: string;
    sourcePlanId?: string | null;
    mood?: string | null;
  },
) {
  const now = new Date();
  const id = newId();
  const title = input.title.trim() || "无标题";
  const body = input.body;
  await getDb().insert(essay).values({
    id,
    userId,
    title,
    body,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    sourcePlanId: input.sourcePlanId ?? null,
    mood: parseMoodKey(input.mood),
  });
  return id;
}

/**
 * 缘想：临期帖附写 → 独立流思笺，溯源计划
 */
export async function createYuanxiangEssay(
  userId: string,
  planId: string,
  body: string,
) {
  const { getActivePlan } = await import("@/services/plans");
  const planRow = await getActivePlan(userId, planId);
  if (!planRow || planRow.archivedAt) return null;
  const text = body.trim();
  if (!text) return null;
  const title = `缘想 · ${planRow.title.trim() || "无标题"}`;
  return createEssay(userId, {
    title,
    body: text,
    sourcePlanId: planId,
  });
}

export async function updateEssay(
  userId: string,
  essayId: string,
  input: { title: string; body: string; mood?: string | null },
) {
  const existing = await getActiveEssay(userId, essayId);
  if (!existing) return null;
  const now = new Date();
  const title = input.title.trim() || "无标题";
  await getDb()
    .update(essay)
    .set({
      title,
      body: input.body,
      updatedAt: now,
      ...(input.mood !== undefined ? { mood: parseMoodKey(input.mood) } : {}),
    })
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)));
  return essayId;
}

/** 仅删除流动中（未归档）随笔 */
export async function deleteActiveEssay(userId: string, essayId: string) {
  const existing = await getActiveEssay(userId, essayId);
  if (!existing) return false;
  await getDb()
    .delete(essay)
    .where(
      and(
        eq(essay.id, essayId),
        eq(essay.userId, userId),
        isNull(essay.archivedAt),
      ),
    );
  return true;
}
