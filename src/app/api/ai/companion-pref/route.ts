import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  clampCompanionName,
  clampUserAddress,
  isCompanionTone,
} from "@/lib/companion-persona";
import {
  getCompanionPref,
  upsertCompanionPref,
} from "@/services/companion";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const pref = await getCompanionPref(session.user.id);
  return NextResponse.json({ ok: true, pref });
}

type Body = {
  dnd?: boolean;
  dailyBubbleCap?: number;
  quietStartMin?: number | null;
  quietEndMin?: number | null;
  companionName?: string;
  tone?: string;
  userAddress?: string;
  personaReady?: boolean;
  /** 跳过引导：用默认人格并标记已完成 */
  skipPersonaSetup?: boolean;
};

export async function PATCH(req: Request) {
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

  const patch: Parameters<typeof upsertCompanionPref>[1] = {};
  if (typeof body.dnd === "boolean") patch.dnd = body.dnd;
  if (
    typeof body.dailyBubbleCap === "number" &&
    body.dailyBubbleCap >= 0 &&
    body.dailyBubbleCap <= 20
  ) {
    patch.dailyBubbleCap = Math.floor(body.dailyBubbleCap);
  }
  if (body.quietStartMin === null || typeof body.quietStartMin === "number") {
    patch.quietStartMin = body.quietStartMin;
  }
  if (body.quietEndMin === null || typeof body.quietEndMin === "number") {
    patch.quietEndMin = body.quietEndMin;
  }
  if (typeof body.companionName === "string") {
    patch.companionName = clampCompanionName(body.companionName);
  }
  if (typeof body.tone === "string") {
    if (!isCompanionTone(body.tone)) {
      return NextResponse.json({ ok: false, error: "无效语气" }, { status: 400 });
    }
    patch.tone = body.tone;
  }
  if (typeof body.userAddress === "string") {
    patch.userAddress = clampUserAddress(body.userAddress);
  }
  if (typeof body.personaReady === "boolean") {
    patch.personaReady = body.personaReady;
  }
  if (body.skipPersonaSetup === true) {
    patch.personaReady = true;
  }

  const pref = await upsertCompanionPref(session.user.id, patch);
  return NextResponse.json({ ok: true, pref });
}
