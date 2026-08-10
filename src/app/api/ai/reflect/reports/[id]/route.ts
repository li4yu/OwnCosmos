import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  archiveReflectReport,
  deleteReflectReport,
  getReflectReport,
  keepReflectReportInKnowledge,
  reflectReportToEssay,
} from "@/services/reflect";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const report = await getReflectReport(session.user.id, id);
  if (!report) {
    return NextResponse.json({ ok: false, error: "不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, report });
}

export async function POST(req: Request, ctx: Ctx) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const { id } = await ctx.params;
  let body: { action?: string } = {};
  try {
    body = (await req.json()) as { action?: string };
  } catch {
    /* empty */
  }

  try {
    if (body.action === "archive") {
      const result = await archiveReflectReport(session.user.id, id);
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "keep") {
      const result = await keepReflectReportInKnowledge(session.user.id, id);
      return NextResponse.json({ ok: true, ...result });
    }
    if (body.action === "essay") {
      const essayId = await reflectReportToEssay(session.user.id, id);
      if (!essayId) {
        return NextResponse.json({ ok: false, error: "创建随笔失败" }, { status: 400 });
      }
      return NextResponse.json({ ok: true, essayId });
    }
    if (body.action === "delete") {
      const result = await deleteReflectReport(session.user.id, id);
      if (!result) {
        return NextResponse.json({ ok: false, error: "不存在" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json({ ok: false, error: "未知操作" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "操作失败" },
      { status: 400 },
    );
  }
}
