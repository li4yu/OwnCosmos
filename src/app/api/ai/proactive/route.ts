import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  dismissProactiveBubble,
  emitCheckinCheerBubble,
  pickProactiveBubble,
} from "@/services/companion";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const bubble = await pickProactiveBubble(
    session.user.id,
    session.user.name,
  );
  return NextResponse.json({ ok: true, bubble });
}

type Body = {
  eventId?: string;
  /** dismiss | checkin_cheer */
  action?: string;
  title?: string;
};

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }

  if (body.action === "checkin_cheer") {
    const bubble = await emitCheckinCheerBubble(session.user.id, {
      title: typeof body.title === "string" ? body.title : null,
      displayName: session.user.name,
    });
    return NextResponse.json({ ok: true, bubble });
  }

  const eventId = typeof body.eventId === "string" ? body.eventId : "";
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "缺少 eventId" }, { status: 400 });
  }
  await dismissProactiveBubble(session.user.id, eventId);
  return NextResponse.json({ ok: true });
}
