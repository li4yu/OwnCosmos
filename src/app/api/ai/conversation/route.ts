import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { RECOMMENDED_QUESTIONS } from "@/ai/recommended-questions";
import {
  type CompanionJump,
  jumpsFromAgentMeta,
} from "@/ai/companion-jumps";
import { isRagInfraReady } from "@/ai/config";
import { auth } from "@/lib/auth";
import {
  deleteCompanionConversation,
  deleteCompanionConversationsMany,
  getOrCreateOpenConversation,
  listCompanionConversations,
  listConversationMessages,
  openCompanionConversation,
  startNewConversation,
} from "@/services/ai-conversation";

export const runtime = "nodejs";

function jumpsOfMessage(m: {
  intent: string | null;
  meta: unknown;
}): CompanionJump[] {
  const meta =
    m.meta && typeof m.meta === "object"
      ? (m.meta as Record<string, unknown>)
      : {};
  if (Array.isArray(meta.jumps) && meta.jumps.length > 0) {
    return meta.jumps as CompanionJump[];
  }
  return jumpsFromAgentMeta(m.intent || "", meta);
}

function mapMessages(
  messages: {
    id: string;
    role: string;
    content: string;
    intent: string | null;
    meta: unknown;
    createdAt: Date;
  }[],
) {
  return messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    intent: m.intent,
    jumps: jumpsOfMessage(m),
    createdAt: m.createdAt,
  }));
}

/** GET：当前开放会话 + 历史列表 + 消息 + 推荐问题 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  const conv = await getOrCreateOpenConversation(session.user.id);
  const packed = await listConversationMessages(session.user.id, conv.id);
  const conversations = await listCompanionConversations(session.user.id);
  return NextResponse.json({
    ok: true,
    infraReady: isRagInfraReady(),
    conversation: {
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      updatedAt: conv.updatedAt,
      closedAt: conv.closedAt,
    },
    conversations,
    messages: mapMessages(packed?.messages ?? []),
    recommended: RECOMMENDED_QUESTIONS,
  });
}

/** POST：new | open | delete */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  let body: {
    action?: string;
    conversationId?: string;
    conversationIds?: string[];
  } = {};
  try {
    body = (await req.json()) as {
      action?: string;
      conversationId?: string;
      conversationIds?: string[];
    };
  } catch {
    /* 兼容旧客户端：无 body = 新开 */
  }

  const action = body.action?.trim() || "new";

  function packConversation(conv: {
    id: string;
    title: string | null;
    summary: string | null;
    updatedAt: Date;
    closedAt: Date | null;
  }) {
    return {
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      updatedAt: conv.updatedAt,
      closedAt: conv.closedAt,
    };
  }

  if (action === "new") {
    const conv = await startNewConversation(session.user.id);
    const conversations = await listCompanionConversations(session.user.id);
    return NextResponse.json({
      ok: true,
      conversation: {
        id: conv.id,
        title: conv.title,
        summary: conv.summary,
        updatedAt: conv.updatedAt,
        closedAt: conv.closedAt,
      },
      conversations,
      messages: [],
      recommended: RECOMMENDED_QUESTIONS,
    });
  }

  if (action === "open" && body.conversationId?.trim()) {
    const opened = await openCompanionConversation(
      session.user.id,
      body.conversationId.trim(),
    );
    if (!opened) {
      return NextResponse.json({ ok: false, error: "会话不存在" }, { status: 404 });
    }
    const conversations = await listCompanionConversations(session.user.id);
    return NextResponse.json({
      ok: true,
      conversation: {
        id: opened.conversation.id,
        title: opened.conversation.title,
        summary: opened.conversation.summary,
        updatedAt: opened.conversation.updatedAt,
        closedAt: opened.conversation.closedAt,
      },
      conversations,
      messages: mapMessages(opened.messages),
      recommended: RECOMMENDED_QUESTIONS,
    });
  }

  if (action === "delete" && body.conversationId?.trim()) {
    const result = await deleteCompanionConversation(
      session.user.id,
      body.conversationId.trim(),
    );
    if (!result) {
      return NextResponse.json({ ok: false, error: "会话不存在" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      count: result.count,
      conversation: packConversation(result.conversation),
      conversations: result.conversations,
      messages: mapMessages(result.messages),
      recommended: RECOMMENDED_QUESTIONS,
    });
  }

  if (action === "deleteMany") {
    const ids = Array.isArray(body.conversationIds)
      ? body.conversationIds
      : [];
    const result = await deleteCompanionConversationsMany(
      session.user.id,
      ids,
    );
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      count: result.count,
      conversation: packConversation(result.conversation),
      conversations: result.conversations,
      messages: mapMessages(result.messages),
      recommended: RECOMMENDED_QUESTIONS,
    });
  }

  return NextResponse.json({ ok: false, error: "未知操作" }, { status: 400 });
}
