import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isRagInfraReady } from "@/ai/config";
import { auth } from "@/lib/auth";
import {
  generateDualReport,
  generatePeriodReport,
  listReflectReports,
} from "@/services/reflect";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  const reports = await listReflectReports(session.user.id);
  return NextResponse.json({ ok: true, reports, infraReady: isRagInfraReady() });
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }
  if (!isRagInfraReady()) {
    return NextResponse.json(
      { ok: false, error: "AI 未启用或未配置密钥" },
      { status: 503 },
    );
  }

  let body: {
    kind?: string;
    rangeStart?: string;
    rangeEnd?: string;
    pastArchiveId?: string;
    presentNote?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "无效 JSON" }, { status: 400 });
  }

  try {
    if (body.kind === "period") {
      const start = body.rangeStart ? new Date(body.rangeStart) : null;
      const end = body.rangeEnd ? new Date(body.rangeEnd) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return NextResponse.json(
          { ok: false, error: "请提供有效时段" },
          { status: 400 },
        );
      }
      const report = await generatePeriodReport(session.user.id, start, end);
      return NextResponse.json({ ok: true, report });
    }
    if (body.kind === "dual") {
      const pastId = body.pastArchiveId?.trim();
      const note = body.presentNote?.trim();
      if (!pastId || !note) {
        return NextResponse.json(
          { ok: false, error: "请选择馆藏并填写此刻自述" },
          { status: 400 },
        );
      }
      const report = await generateDualReport(session.user.id, pastId, note);
      return NextResponse.json({ ok: true, report });
    }
    return NextResponse.json({ ok: false, error: "未知 kind" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "生成失败" },
      { status: 400 },
    );
  }
}
