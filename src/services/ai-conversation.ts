import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { chatCompletion } from "@/ai/llm";
import { SYSTEM_MEMORY_COMPRESS } from "@/ai/prompts";
import { getDb } from "@/db";
import { aiConversation, aiMessage } from "@/db/schema";

const RECENT_MESSAGE_LIMIT = 12;
const COMPRESS_AFTER_MESSAGES = 16;

function newId() {
  return randomBytes(16).toString("hex");
}

export async function getOrCreateOpenConversation(userId: string) {
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
  const rows = await db
    .select()
    .from(aiConversation)
    .where(eq(aiConversation.id, id))
    .limit(1);
  return rows[0]!;
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
