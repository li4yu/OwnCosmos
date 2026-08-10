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
  getOrCreateOpenConversation,
  listConversationMessages,
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

/** GET：当前开放会话 + 消息 + 推荐问题 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  const conv = await getOrCreateOpenConversation(session.user.id);
  const packed = await listConversationMessages(session.user.id, conv.id);
  return NextResponse.json({
    ok: true,
    infraReady: isRagInfraReady(),
    conversation: {
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      updatedAt: conv.updatedAt,
    },
    messages: (packed?.messages ?? []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      intent: m.intent,
      jumps: jumpsOfMessage(m),
      createdAt: m.createdAt,
    })),
    recommended: RECOMMENDED_QUESTIONS,
  });
}

/** POST：新开对话 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const conv = await startNewConversation(session.user.id);
  return NextResponse.json({
    ok: true,
    conversation: {
      id: conv.id,
      title: conv.title,
      summary: conv.summary,
      updatedAt: conv.updatedAt,
    },
    messages: [],
    recommended: RECOMMENDED_QUESTIONS,
  });
}
