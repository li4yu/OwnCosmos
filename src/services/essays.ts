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
import { BODY_FORMAT_HTML, BODY_FORMAT_PLAIN, essay } from "@/db/schema";
import { ESSAY_PAGE_SIZE } from "@/lib/essay-query";
import { clampListPageSize } from "@/lib/list-paging";
import { parseMoodKey, type MoodKey } from "@/lib/moods";
import {
  isRichBodyEmpty,
  resolveBodyFormat,
  sanitizeEssayHtml,
} from "@/lib/rich-text";
import { syncEssayImagesFromBody } from "@/services/essay-images";

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
  /**
   * undefined = 不限专题；
   * null = 每日随笔（folder_id IS NULL）；
   * string = 指定专题
   */
  folderId?: string | null;
};

export async function listActiveEssays(
  userId: string,
  opts?: { folderId?: string | null },
) {
  const conditions: SQL[] = [
    eq(essay.userId, userId),
    isNull(essay.archivedAt),
  ];
  if (opts && "folderId" in opts) {
    if (opts.folderId === null) {
      conditions.push(isNull(essay.folderId));
    } else if (opts.folderId) {
      conditions.push(eq(essay.folderId, opts.folderId));
    }
  }
  return getDb()
    .select()
    .from(essay)
    .where(and(...conditions))
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
  if ("folderId" in opts) {
    if (opts.folderId === null) {
      conditions.push(isNull(essay.folderId));
    } else if (opts.folderId) {
      conditions.push(eq(essay.folderId, opts.folderId));
    }
  }
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

/** 流动随笔分页查询（标题/正文模糊、标签、心情、更新时间） */
export async function queryActiveEssays(
  userId: string,
  opts: EssayQueryOpts = {},
) {
  const pageSize = clampListPageSize(opts.pageSize ?? ESSAY_PAGE_SIZE);
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
    bodyFormat?: string | null;
    sourcePlanId?: string | null;
    sourceFocusSessionId?: string | null;
    mood?: string | null;
    folderId?: string | null;
  },
) {
  let folderId: string | null = input.folderId ?? null;
  if (folderId) {
    const { getEssayFolder } = await import("@/services/essay-folders");
    const folder = await getEssayFolder(userId, folderId);
    if (!folder) return null;
  }
  const now = new Date();
  const id = newId();
  const title = input.title.trim() || "无标题";
  const bodyFormat = resolveBodyFormat(input.bodyFormat ?? BODY_FORMAT_HTML);
  const body =
    bodyFormat === BODY_FORMAT_HTML
      ? sanitizeEssayHtml(input.body)
      : input.body;
  await getDb().insert(essay).values({
    id,
    userId,
    title,
    body,
    bodyFormat,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    sourcePlanId: input.sourcePlanId ?? null,
    sourceFocusSessionId: input.sourceFocusSessionId ?? null,
    mood: parseMoodKey(input.mood),
    folderId,
  });
  if (bodyFormat === BODY_FORMAT_HTML) {
    await syncEssayImagesFromBody(userId, id, body);
  }
  return id;
}

/**
 * 随想：临期提醒附写 → 独立随笔，溯源计划
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
  if (!text || isRichBodyEmpty(text)) return null;
  const title = `随想 · ${planRow.title.trim() || "无标题"}`;
  return createEssay(userId, {
    title,
    body: text,
    bodyFormat: BODY_FORMAT_PLAIN,
    sourcePlanId: planId,
  });
}

export async function updateEssay(
  userId: string,
  essayId: string,
  input: {
    title: string;
    body: string;
    bodyFormat?: string | null;
    mood?: string | null;
  },
) {
  const existing = await getActiveEssay(userId, essayId);
  if (!existing) return null;
  const now = new Date();
  const title = input.title.trim() || "无标题";
  const bodyFormat = resolveBodyFormat(
    input.bodyFormat ?? existing.bodyFormat ?? BODY_FORMAT_HTML,
  );
  const body =
    bodyFormat === BODY_FORMAT_HTML
      ? sanitizeEssayHtml(input.body)
      : input.body;
  await getDb()
    .update(essay)
    .set({
      title,
      body,
      bodyFormat,
      updatedAt: now,
      ...(input.mood !== undefined ? { mood: parseMoodKey(input.mood) } : {}),
    })
    .where(and(eq(essay.id, essayId), eq(essay.userId, userId)));
  if (bodyFormat === BODY_FORMAT_HTML) {
    await syncEssayImagesFromBody(userId, essayId, body);
  }
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
