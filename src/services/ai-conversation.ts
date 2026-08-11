import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { chatCompletion } from "@/ai/llm";
import { SYSTEM_MEMORY_COMPRESS } from "@/ai/prompts";
import { getDb } from "@/db";
import { aiConversation, aiMessage } from "@/db/schema";
import {
  COMPANION_CLOSED_RETENTION_DAYS,
  COMPANION_MAX_CONVERSATIONS,
  retentionCutoff,
} from "@/lib/conversation-retention";

const RECENT_MESSAGE_LIMIT = 12;
const COMPRESS_AFTER_MESSAGES = 16;

function newId() {
  return randomBytes(16).toString("hex");
}

/** 伴读：删过期已关闭会话 + 超上限时删最旧已关闭（不碰当前开放） */
export async function purgeCompanionConversations(userId: string) {
  const db = getDb();
  const cutoff = retentionCutoff(COMPANION_CLOSED_RETENTION_DAYS);

  await db
    .delete(aiConversation)
    .where(
      and(
        eq(aiConversation.userId, userId),
        isNotNull(aiConversation.closedAt),
        lt(aiConversation.closedAt, cutoff),
      ),
    );

  const rows = await db
    .select({
      id: aiConversation.id,
      closedAt: aiConversation.closedAt,
      updatedAt: aiConversation.updatedAt,
    })
    .from(aiConversation)
    .where(eq(aiConversation.userId, userId))
    .orderBy(asc(aiConversation.updatedAt));

  const excess = rows.length - COMPANION_MAX_CONVERSATIONS;
  if (excess <= 0) return;

  const victimIds: string[] = [];
  for (const row of rows) {
    if (victimIds.length >= excess) break;
    if (row.closedAt != null) victimIds.push(row.id);
  }
  if (victimIds.length === 0) return;

  await db
    .delete(aiConversation)
    .where(
      and(
        eq(aiConversation.userId, userId),
        inArray(aiConversation.id, victimIds),
      ),
    );
}

export async function getOrCreateOpenConversation(userId: string) {
  await purgeCompanionConversations(userId);
  const db = getDb();
  const existing = await db
    .select()
    .from(aiConversation)
    .where(
      and(eq(aiConversation.userId, userId), isNull(aiConversation.closedAt)),
    )
    .orderBy(desc(aiConversation.updatedAt))
    .limit(1);
  if (existing[0]) return existing[0];

  const id = newId();
  const now = new Date();
  await db.insert(aiConversation).values({
    id,
    userId,
    title: null,
    summary: null,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  });
  const rows = await db
    .select()
    .from(aiConversation)
    .where(eq(aiConversation.id, id))
    .limit(1);
  return rows[0]!;
}

export async function startNewConversation(userId: string) {
  await purgeCompanionConversations(userId);
  const db = getDb();
  const now = new Date();
  await db
    .update(aiConversation)
    .set({ closedAt: now, updatedAt: now })
    .where(
      and(eq(aiConversation.userId, userId), isNull(aiConversation.closedAt)),
    );

  const id = newId();
  await db.insert(aiConversation).values({
    id,
    userId,
    title: null,
    summary: null,
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  });
  await purgeCompanionConversations(userId);
  const rows = await db
    .select()
    .from(aiConversation)
    .where(eq(aiConversation.id, id))
    .limit(1);
  return rows[0]!;
}

/** 近期伴读会话（含已关闭），供历史切换 */
export async function listCompanionConversations(
  userId: string,
  limit = COMPANION_MAX_CONVERSATIONS,
) {
  await purgeCompanionConversations(userId);
  return getDb()
    .select({
      id: aiConversation.id,
      title: aiConversation.title,
      updatedAt: aiConversation.updatedAt,
      closedAt: aiConversation.closedAt,
    })
    .from(aiConversation)
    .where(eq(aiConversation.userId, userId))
    .orderBy(desc(aiConversation.updatedAt))
    .limit(limit);
}

/** 切到指定会话：设为当前打开，其余关闭 */
export async function openCompanionConversation(
  userId: string,
  conversationId: string,
) {
  const listed = await listConversationMessages(userId, conversationId, 1);
  if (!listed?.conversation) return null;
  const db = getDb();
  const now = new Date();
  await db
    .update(aiConversation)
    .set({ closedAt: now, updatedAt: now })
    .where(
      and(eq(aiConversation.userId, userId), isNull(aiConversation.closedAt)),
    );
  await db
    .update(aiConversation)
    .set({ closedAt: null, updatedAt: now })
    .where(
      and(
        eq(aiConversation.id, conversationId),
        eq(aiConversation.userId, userId),
      ),
    );
  return listConversationMessages(userId, conversationId);
}

/** 删除伴读会话（消息级联） */
export async function deleteCompanionConversation(
  userId: string,
  conversationId: string,
) {
  const listed = await listConversationMessages(userId, conversationId, 1);
  if (!listed?.conversation) return null;

  await getDb()
    .delete(aiConversation)
    .where(
      and(
        eq(aiConversation.id, conversationId),
        eq(aiConversation.userId, userId),
      ),
    );

  await purgeCompanionConversations(userId);

  const remaining = await listCompanionConversations(userId, 1);
  if (remaining[0]) {
    const opened = await openCompanionConversation(userId, remaining[0].id);
    return {
      conversation: opened!.conversation,
      messages: opened!.messages,
      conversations: await listCompanionConversations(userId),
      count: 1,
    };
  }

  const conversation = await getOrCreateOpenConversation(userId);
  return {
    conversation,
    messages: [] as typeof listed.messages,
    conversations: await listCompanionConversations(userId),
    count: 1,
  };
}

/** 批量删除伴读会话 */
export async function deleteCompanionConversationsMany(
  userId: string,
  conversationIds: string[],
): Promise<
  | {
      ok: true;
      count: number;
      conversation: Awaited<ReturnType<typeof getOrCreateOpenConversation>>;
      messages: NonNullable<
        Awaited<ReturnType<typeof listConversationMessages>>
      >["messages"];
      conversations: Awaited<ReturnType<typeof listCompanionConversations>>;
    }
  | { ok: false; error: string }
> {
  const ids = [
    ...new Set(conversationIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (ids.length === 0) return { ok: false, error: "请先选择会话" };

  const owned = await getDb()
    .select({
      id: aiConversation.id,
      closedAt: aiConversation.closedAt,
    })
    .from(aiConversation)
    .where(
      and(eq(aiConversation.userId, userId), inArray(aiConversation.id, ids)),
    );
  if (owned.length === 0) return { ok: false, error: "未找到所选会话" };

  const deleteIds = owned.map((r) => r.id);
  const deletingOpen = owned.some((r) => r.closedAt == null);

  await getDb()
    .delete(aiConversation)
    .where(
      and(
        eq(aiConversation.userId, userId),
        inArray(aiConversation.id, deleteIds),
      ),
    );

  await purgeCompanionConversations(userId);

  if (deletingOpen) {
    const remaining = await listCompanionConversations(userId, 1);
    if (remaining[0]) {
      const opened = await openCompanionConversation(userId, remaining[0].id);
      return {
        ok: true,
        count: deleteIds.length,
        conversation: opened!.conversation,
        messages: opened!.messages,
        conversations: await listCompanionConversations(userId),
      };
    }
    const conversation = await getOrCreateOpenConversation(userId);
    return {
      ok: true,
      count: deleteIds.length,
      conversation,
      messages: [],
      conversations: await listCompanionConversations(userId),
    };
  }

  const open = await getOrCreateOpenConversation(userId);
  const packed = await listConversationMessages(userId, open.id);
  return {
    ok: true,
    count: deleteIds.length,
    conversation: open,
    messages: packed?.messages ?? [],
    conversations: await listCompanionConversations(userId),
  };
}

export async function listConversationMessages(
  userId: string,
  conversationId: string,
  limit = 80,
) {
  const conv = await getDb()
    .select()
    .from(aiConversation)
    .where(
      and(
        eq(aiConversation.id, conversationId),
        eq(aiConversation.userId, userId),
      ),
    )
    .limit(1);
  if (!conv[0]) return null;

  const messages = await getDb()
    .select()
    .from(aiMessage)
    .where(eq(aiMessage.conversationId, conversationId))
    .orderBy(asc(aiMessage.createdAt))
    .limit(limit);

  return { conversation: conv[0], messages };
}

export async function appendMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  intent?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  const id = newId();
  const now = new Date();
  await getDb().insert(aiMessage).values({
    id,
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    intent: input.intent ?? null,
    meta: input.meta ?? null,
    createdAt: now,
  });
  await getDb()
    .update(aiConversation)
    .set({ updatedAt: now })
    .where(eq(aiConversation.id, input.conversationId));
  return id;
}

export async function setConversationTitleIfEmpty(
  conversationId: string,
  userText: string,
) {
  const rows = await getDb()
    .select()
    .from(aiConversation)
    .where(eq(aiConversation.id, conversationId))
    .limit(1);
  const conv = rows[0];
  if (!conv || conv.title) return;
  const title = userText.trim().replace(/\s+/g, " ").slice(0, 40);
  if (!title) return;
  await getDb()
    .update(aiConversation)
    .set({ title, updatedAt: new Date() })
    .where(eq(aiConversation.id, conversationId));
}

export async function getRecentTurnsText(
  conversationId: string,
  take = 4,
): Promise<string> {
  const rows = await getDb()
    .select()
    .from(aiMessage)
    .where(eq(aiMessage.conversationId, conversationId))
    .orderBy(desc(aiMessage.createdAt))
    .limit(take);
  const ordered = [...rows].reverse();
  if (ordered.length === 0) return "";
  return ordered
    .map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content.slice(0, 200)}`)
    .join("\n");
}

export async function maybeCompressConversation(
  conversationId: string,
  summary: string | null,
) {
  const countRows = await getDb()
    .select({ id: aiMessage.id })
    .from(aiMessage)
    .where(eq(aiMessage.conversationId, conversationId));
  if (countRows.length < COMPRESS_AFTER_MESSAGES) return summary;

  const recent = await getDb()
    .select()
    .from(aiMessage)
    .where(eq(aiMessage.conversationId, conversationId))
    .orderBy(desc(aiMessage.createdAt))
    .limit(RECENT_MESSAGE_LIMIT);
  const ordered = [...recent].reverse();
  const transcript = ordered
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);

  try {
    const next = await chatCompletion(
      [
        { role: "system", content: SYSTEM_MEMORY_COMPRESS },
        {
          role: "user",
          content: `已有摘要：\n${summary || "（无）"}\n\n对话：\n${transcript}`,
        },
      ],
      { temperature: 0.2 },
    );
    const trimmed = next.trim().slice(0, 400);
    await getDb()
      .update(aiConversation)
      .set({ summary: trimmed, updatedAt: new Date() })
      .where(eq(aiConversation.id, conversationId));
    return trimmed;
  } catch {
    return summary;
  }
}
