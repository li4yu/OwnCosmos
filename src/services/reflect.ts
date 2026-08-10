import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { chatCompletion } from "@/ai/llm";
import { semanticSearchUser } from "@/ai/search";
import { isRagInfraReady } from "@/ai/config";
import {
  SYSTEM_REFLECT_ECHO,
  SYSTEM_REFLECT_PERIOD,
  SYSTEM_REFLECT_DUAL,
  SYSTEM_REFLECT_PROFILE_UPDATE,
} from "@/ai/prompts";
import { getDb } from "@/db";
import {
  ARCHIVE_REASON_REFLECT_ARCHIVE,
  ARCHIVE_TYPE_REFLECT_REPORT,
  REFLECT_KIND_DUAL,
  REFLECT_KIND_PERIOD,
  aiReflectConversation,
  aiReflectMessage,
  aiReflectProfile,
  aiReflectReport,
  archiveItem,
} from "@/db/schema";
import { scheduleArchiveRagUpsert } from "@/ai";
import { createEssay } from "@/services/essays";
import { wipeInflowArchivesByIds } from "@/services/archive";

function newId() {
  return randomBytes(16).toString("hex");
}

export async function getOrCreateReflectConversation(userId: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(aiReflectConversation)
    .where(
      and(
        eq(aiReflectConversation.userId, userId),
        isNull(aiReflectConversation.closedAt),
      ),
    )
    .orderBy(desc(aiReflectConversation.updatedAt))
    .limit(1);
  if (existing[0]) return existing[0];

  const id = newId();
  const now = new Date();
  await db.insert(aiReflectConversation).values({
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
    .from(aiReflectConversation)
    .where(eq(aiReflectConversation.id, id))
    .limit(1);
  return rows[0]!;
}

export async function startNewReflectConversation(userId: string) {
  const db = getDb();
  const now = new Date();
  await db
    .update(aiReflectConversation)
    .set({ closedAt: now, updatedAt: now })
    .where(
      and(
        eq(aiReflectConversation.userId, userId),
        isNull(aiReflectConversation.closedAt),
      ),
    );
  const id = newId();
  await db.insert(aiReflectConversation).values({
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
    .from(aiReflectConversation)
    .where(eq(aiReflectConversation.id, id))
    .limit(1);
  return rows[0]!;
}

/** 近期对镜会话（含已拭镜关闭的），供下拉切换 */
export async function listReflectConversations(userId: string, limit = 40) {
  return getDb()
    .select({
      id: aiReflectConversation.id,
      title: aiReflectConversation.title,
      updatedAt: aiReflectConversation.updatedAt,
      closedAt: aiReflectConversation.closedAt,
    })
    .from(aiReflectConversation)
    .where(eq(aiReflectConversation.userId, userId))
    .orderBy(desc(aiReflectConversation.updatedAt))
    .limit(limit);
}

/** 切到指定会话：设为当前打开，其余关闭 */
export async function openReflectConversation(
  userId: string,
  conversationId: string,
) {
  const listed = await listReflectMessages(userId, conversationId, 1);
  if (!listed?.conversation) return null;
  const db = getDb();
  const now = new Date();
  await db
    .update(aiReflectConversation)
    .set({ closedAt: now, updatedAt: now })
    .where(
      and(
        eq(aiReflectConversation.userId, userId),
        isNull(aiReflectConversation.closedAt),
      ),
    );
  await db
    .update(aiReflectConversation)
    .set({ closedAt: null, updatedAt: now })
    .where(
      and(
        eq(aiReflectConversation.id, conversationId),
        eq(aiReflectConversation.userId, userId),
      ),
    );
  return listReflectMessages(userId, conversationId);
}

/** 删除对镜会话（消息级联；报告仅解除 conversation 关联） */
export async function deleteReflectConversation(
  userId: string,
  conversationId: string,
) {
  const listed = await listReflectMessages(userId, conversationId, 1);
  if (!listed?.conversation) return null;

  await getDb()
    .delete(aiReflectConversation)
    .where(
      and(
        eq(aiReflectConversation.id, conversationId),
        eq(aiReflectConversation.userId, userId),
      ),
    );

  const remaining = await listReflectConversations(userId, 1);
  if (remaining[0]) {
    const opened = await openReflectConversation(userId, remaining[0].id);
    return {
      conversation: opened!.conversation,
      messages: opened!.messages,
      conversations: await listReflectConversations(userId),
    };
  }

  const conversation = await getOrCreateReflectConversation(userId);
  return {
    conversation,
    messages: [] as typeof listed.messages,
    conversations: await listReflectConversations(userId),
  };
}

export async function listReflectMessages(
  userId: string,
  conversationId: string,
  limit = 80,
) {
  const conv = await getDb()
    .select()
    .from(aiReflectConversation)
    .where(
      and(
        eq(aiReflectConversation.id, conversationId),
        eq(aiReflectConversation.userId, userId),
      ),
    )
    .limit(1);
  if (!conv[0]) return null;
  const messages = await getDb()
    .select()
    .from(aiReflectMessage)
    .where(eq(aiReflectMessage.conversationId, conversationId))
    .orderBy(asc(aiReflectMessage.createdAt))
    .limit(limit);
  return { conversation: conv[0], messages };
}

export async function appendReflectMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  meta?: Record<string, unknown> | null;
}) {
  const id = newId();
  const now = new Date();
  await getDb().insert(aiReflectMessage).values({
    id,
    conversationId: input.conversationId,
    role: input.role,
    content: input.content,
    meta: input.meta ?? null,
    createdAt: now,
  });
  await getDb()
    .update(aiReflectConversation)
    .set({ updatedAt: now })
    .where(eq(aiReflectConversation.id, input.conversationId));
  return id;
}

export async function getReflectProfile(userId: string) {
  const rows = await getDb()
    .select()
    .from(aiReflectProfile)
    .where(eq(aiReflectProfile.userId, userId))
    .limit(1);
  return (
    rows[0] ?? {
      userId,
      toneNotes: null as string | null,
      habitNotes: null as string | null,
      updatedAt: new Date(),
    }
  );
}

export async function upsertReflectProfile(
  userId: string,
  patch: { toneNotes?: string | null; habitNotes?: string | null },
) {
  const now = new Date();
  const current = await getReflectProfile(userId);
  const toneNotes =
    patch.toneNotes !== undefined ? patch.toneNotes : current.toneNotes;
  const habitNotes =
    patch.habitNotes !== undefined ? patch.habitNotes : current.habitNotes;
  await getDb()
    .insert(aiReflectProfile)
    .values({
      userId,
      toneNotes,
      habitNotes,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiReflectProfile.userId,
      set: { toneNotes, habitNotes, updatedAt: now },
    });
}

function formatHits(
  hits: Awaited<ReturnType<typeof semanticSearchUser>>,
): string {
  if (!hits.length) return "（本轮未检索到已进知识库的馆藏）";
  return hits
    .slice(0, 6)
    .map((h, i) => {
      const id = h.archiveItemId || h.sourceId || h.id;
      const excerpt = (h.text || "").slice(0, 280);
      return `${i + 1}. [${id}] ${h.title || "无标题"} · ${h.archiveType || "-"}\n${excerpt}`;
    })
    .join("\n\n");
}

export async function* streamReflectTurn(input: {
  userId: string;
  message: string;
  conversationId?: string | null;
  signal?: AbortSignal;
}): AsyncGenerator<Record<string, unknown>> {
  const conv = input.conversationId
    ? (
        await listReflectMessages(input.userId, input.conversationId, 1)
      )?.conversation
    : null;
  const conversation =
    conv ?? (await getOrCreateReflectConversation(input.userId));

  await appendReflectMessage({
    conversationId: conversation.id,
    role: "user",
    content: input.message.trim(),
  });

  if (!conversation.title) {
    await getDb()
      .update(aiReflectConversation)
      .set({
        title: input.message.trim().slice(0, 40),
        updatedAt: new Date(),
      })
      .where(eq(aiReflectConversation.id, conversation.id));
  }

  yield { type: "conversation", conversationId: conversation.id };

  const profile = await getReflectProfile(input.userId);
  let hits: Awaited<ReturnType<typeof semanticSearchUser>> = [];
  if (isRagInfraReady()) {
    try {
      hits = await semanticSearchUser(input.userId, input.message.trim(), 6);
    } catch {
      hits = [];
    }
  }

  const listed = await listReflectMessages(
    input.userId,
    conversation.id,
    12,
  );
  const history =
    listed?.messages
      .slice(0, -1)
      .map((m) => `${m.role === "user" ? "用户" : "缩影"}：${m.content}`)
      .join("\n") || "（尚无更早对话）";

  const system = `${SYSTEM_REFLECT_ECHO}

【观察笔记·语气】
${profile.toneNotes?.trim() || "（尚无）"}

【观察笔记·习惯】
${profile.habitNotes?.trim() || "（尚无）"}

【本轮检索到的已进知识库馆藏】
${formatHits(hits)}`;

  const userPrompt = `【近期对话】
${history}

【用户本轮】
${input.message.trim()}

请以「过去自己的缩影」回应。依据不足则提问，不要臆造记忆。`;

  let answer = "";
  try {
    const out = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.55, signal: input.signal },
    );
    answer = out.trim();
  } catch (e) {
    if (input.signal?.aborted) throw e;
    answer =
      "此刻我有些恍惚，没能把那段过往拼清楚。你愿意再多说一点关键词，或换个时间段吗？";
  }

  const meta = {
    archiveIds: hits
      .map((h) => h.archiveItemId || h.sourceId)
      .filter(Boolean)
      .slice(0, 6),
  };
  await appendReflectMessage({
    conversationId: conversation.id,
    role: "assistant",
    content: answer,
    meta,
  });

  yield {
    type: "delta",
    text: answer,
  };
  yield {
    type: "done",
    conversationId: conversation.id,
    jumps: (meta.archiveIds as string[]).map((id) => ({
      kind: "archive",
      id,
      label: "馆藏",
    })),
  };

  // 轻量更新观察笔记（失败忽略）
  void maybeUpdateReflectProfile(input.userId, input.message, answer, hits);
}

async function maybeUpdateReflectProfile(
  userId: string,
  userMsg: string,
  answer: string,
  hits: Awaited<ReturnType<typeof semanticSearchUser>>,
) {
  if (!isRagInfraReady() || hits.length === 0) return;
  try {
    const profile = await getReflectProfile(userId);
    const raw = await chatCompletion(
      [
        { role: "system", content: SYSTEM_REFLECT_PROFILE_UPDATE },
        {
          role: "user",
          content: JSON.stringify({
            prevTone: profile.toneNotes,
            prevHabit: profile.habitNotes,
            userMsg: userMsg.slice(0, 400),
            answer: answer.slice(0, 400),
            excerpts: hits.slice(0, 3).map((h) => (h.text || "").slice(0, 200)),
          }),
        },
      ],
      { temperature: 0.2 },
    );
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return;
    const parsed = JSON.parse(m[0]) as {
      toneNotes?: string | null;
      habitNotes?: string | null;
    };
    await upsertReflectProfile(userId, {
      toneNotes:
        typeof parsed.toneNotes === "string"
          ? parsed.toneNotes.slice(0, 800)
          : profile.toneNotes,
      habitNotes:
        typeof parsed.habitNotes === "string"
          ? parsed.habitNotes.slice(0, 800)
          : profile.habitNotes,
    });
  } catch {
    /* ignore */
  }
}

export async function listReflectReports(userId: string, limit = 30) {
  return getDb()
    .select()
    .from(aiReflectReport)
    .where(eq(aiReflectReport.userId, userId))
    .orderBy(desc(aiReflectReport.createdAt))
    .limit(limit);
}

export async function getReflectReport(userId: string, id: string) {
  const rows = await getDb()
    .select()
    .from(aiReflectReport)
    .where(and(eq(aiReflectReport.id, id), eq(aiReflectReport.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function generatePeriodReport(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  if (!isRagInfraReady()) {
    throw new Error("AI 未启用或未配置密钥");
  }
  const query = `我在 ${rangeStart.toISOString().slice(0, 10)} 到 ${rangeEnd.toISOString().slice(0, 10)} 这段时间写过什么、想过什么`;
  const hits = await semanticSearchUser(userId, query, 10);
  const useHits = hits;

  const profile = await getReflectProfile(userId);
  const body = await chatCompletion(
    [
      { role: "system", content: SYSTEM_REFLECT_PERIOD },
      {
        role: "user",
        content: `时段：${rangeStart.toISOString().slice(0, 10)} ~ ${rangeEnd.toISOString().slice(0, 10)}

观察笔记：
语气：${profile.toneNotes || "无"}
习惯：${profile.habitNotes || "无"}

馆藏检索：
${formatHits(useHits)}

请生成时段自省报告。依据不足处标明不确定并提问式收尾。`,
      },
    ],
    { temperature: 0.45 },
  );

  const id = newId();
  const now = new Date();
  const title = `时段自省 · ${rangeStart.toISOString().slice(0, 10)} ~ ${rangeEnd.toISOString().slice(0, 10)}`;
  const links = {
    archiveIds: useHits
      .map((h) => h.archiveItemId || h.sourceId)
      .filter(Boolean)
      .slice(0, 10),
  };
  await getDb().insert(aiReflectReport).values({
    id,
    userId,
    kind: REFLECT_KIND_PERIOD,
    title,
    body: body.trim(),
    rangeStart,
    rangeEnd,
    pastArchiveId: null,
    presentNote: null,
    links,
    conversationId: null,
    archiveItemId: null,
    createdAt: now,
    updatedAt: now,
  });
  return getReflectReport(userId, id);
}

export async function generateDualReport(
  userId: string,
  pastArchiveId: string,
  presentNote: string,
) {
  if (!isRagInfraReady()) {
    throw new Error("AI 未启用或未配置密钥");
  }
  const past = await getDb()
    .select()
    .from(archiveItem)
    .where(
      and(
        eq(archiveItem.id, pastArchiveId),
        eq(archiveItem.userId, userId),
      ),
    )
    .limit(1);
  if (!past[0]) throw new Error("找不到该馆藏");

  const profile = await getReflectProfile(userId);
  const body = await chatCompletion(
    [
      { role: "system", content: SYSTEM_REFLECT_DUAL },
      {
        role: "user",
        content: `【昔时馆藏】
标题：${past[0].title}
类型：${past[0].type}
归档：${past[0].archivedAt.toISOString().slice(0, 10)}
正文摘录：
${past[0].body.replace(/<[^>]+>/g, " ").slice(0, 2000)}

【此刻自述】
${presentNote.trim()}

观察笔记：语气 ${profile.toneNotes || "无"}；习惯 ${profile.habitNotes || "无"}

请做双程对照。不确定处要问，不要硬下定论。`,
      },
    ],
    { temperature: 0.45 },
  );

  const id = newId();
  const now = new Date();
  const title = `双程对照 · ${past[0].title.slice(0, 24)}`;
  await getDb().insert(aiReflectReport).values({
    id,
    userId,
    kind: REFLECT_KIND_DUAL,
    title,
    body: body.trim(),
    rangeStart: null,
    rangeEnd: null,
    pastArchiveId: past[0].id,
    presentNote: presentNote.trim(),
    links: { archiveIds: [past[0].id] },
    conversationId: null,
    archiveItemId: null,
    createdAt: now,
    updatedAt: now,
  });
  return getReflectReport(userId, id);
}

export async function archiveReflectReport(userId: string, reportId: string) {
  const report = await getReflectReport(userId, reportId);
  if (!report) throw new Error("报告不存在");
  if (report.archiveItemId) {
    return { archiveItemId: report.archiveItemId, already: true };
  }
  const now = new Date();
  const archiveId = newId();
  await getDb().insert(archiveItem).values({
    id: archiveId,
    userId,
    type: ARCHIVE_TYPE_REFLECT_REPORT,
    title: report.title,
    body: report.body,
    bodyFormat: "plain",
    sourceModule: "reflect",
    archiveReason: ARCHIVE_REASON_REFLECT_ARCHIVE,
    archivedAt: now,
    sourceCreatedAt: report.createdAt,
    sourceUpdatedAt: report.updatedAt,
    inKnowledge: false,
    keptAt: null,
    updatedAt: now,
  });
  await getDb()
    .update(aiReflectReport)
    .set({ archiveItemId: archiveId, updatedAt: now })
    .where(eq(aiReflectReport.id, reportId));
  return { archiveItemId: archiveId, already: false };
}

export async function keepReflectReportInKnowledge(
  userId: string,
  reportId: string,
) {
  let report = await getReflectReport(userId, reportId);
  if (!report) throw new Error("报告不存在");
  if (!report.archiveItemId) {
    const archived = await archiveReflectReport(userId, reportId);
    report = await getReflectReport(userId, reportId);
    if (!report?.archiveItemId) throw new Error("归档失败");
    void archived;
  }
  const now = new Date();
  await getDb()
    .update(archiveItem)
    .set({ inKnowledge: true, keptAt: now, updatedAt: now })
    .where(
      and(
        eq(archiveItem.id, report.archiveItemId!),
        eq(archiveItem.userId, userId),
      ),
    );
  scheduleArchiveRagUpsert(userId, report.archiveItemId!);
  return { archiveItemId: report.archiveItemId! };
}

export async function reflectReportToEssay(userId: string, reportId: string) {
  const report = await getReflectReport(userId, reportId);
  if (!report) throw new Error("报告不存在");
  const essay = await createEssay(userId, {
    title: `自省落笔 · ${report.title}`.slice(0, 80),
    body: report.body,
    bodyFormat: "plain",
  });
  return essay;
}

/** 删除自省报告；若已归档则同步硬删馆藏（含知识库） */
export async function deleteReflectReport(userId: string, reportId: string) {
  const report = await getReflectReport(userId, reportId);
  if (!report) return null;

  const archiveId = report.archiveItemId;
  await getDb()
    .delete(aiReflectReport)
    .where(
      and(eq(aiReflectReport.id, reportId), eq(aiReflectReport.userId, userId)),
    );

  if (archiveId) {
    await wipeInflowArchivesByIds(userId, [archiveId]);
  }

  return { deleted: true as const, archiveItemId: archiveId };
}
