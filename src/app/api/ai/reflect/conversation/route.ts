import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isRagInfraReady } from "@/ai/config";
import { auth } from "@/lib/auth";
import {
  getOrCreateReflectConversation,
  listReflectConversations,
  listReflectMessages,
  startNewReflectConversation,
  openReflectConversation,
  deleteReflectConversation,
  getReflectProfile,
} from "@/services/reflect";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const conversation = await getOrCreateReflectConversation(session.user.id);
  const listed = await listReflectMessages(
    session.user.id,
    conversation.id,
  );
  const conversations = await listReflectConversations(session.user.id);
  const profile = await getReflectProfile(session.user.id);
  return NextResponse.json({
    ok: true,
    infraReady: isRagInfraReady(),
    conversation,
    conversations,
    messages: listed?.messages ?? [],
    profile: {
      toneNotes: profile.toneNotes,
      habitNotes: profile.habitNotes,
    },
  });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  let body: { action?: string; conversationId?: string } = {};
  try {
    body = (await req.json()) as {
      action?: string;
      conversationId?: string;
    };
  } catch {
    /* empty */
  }
  if (body.action === "new") {
    const conversation = await startNewReflectConversation(session.user.id);
    const conversations = await listReflectConversations(session.user.id);
    return NextResponse.json({
      ok: true,
      conversation,
      conversations,
      messages: [],
    });
  }
  if (body.action === "open" && body.conversationId?.trim()) {
    const opened = await openReflectConversation(
      session.user.id,
      body.conversationId.trim(),
    );
    if (!opened) {
      return NextResponse.json({ ok: false, error: "会话不存在" }, { status: 404 });
    }
    const conversations = await listReflectConversations(session.user.id);
    return NextResponse.json({
      ok: true,
      conversation: opened.conversation,
      conversations,
      messages: opened.messages,
    });
  }
  if (body.action === "delete" && body.conversationId?.trim()) {
    const result = await deleteReflectConversation(
      session.user.id,
      body.conversationId.trim(),
    );
    if (!result) {
      return NextResponse.json({ ok: false, error: "会话不存在" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      conversation: result.conversation,
      conversations: result.conversations,
      messages: result.messages,
    });
  }
  return NextResponse.json({ ok: false, error: "未知操作" }, { status: 400 });
}
