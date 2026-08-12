import { NextResponse } from "next/server";
import { runEssayArchiveCatchUpAllUsers } from "@/lib/archive-catchup";
import { cacheKeys } from "@/lib/cache-keys";
import { tryAcquireLock } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // 本地未配置时允许调用，便于自测；生产务必设置 CRON_SECRET
    return process.env.NODE_ENV !== "production";
  }
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  // Vercel Cron 会带 x-vercel-cron
  if (req.headers.get("x-vercel-cron") === "1") return true;
  return false;
}

/** 平台 Cron：空闲随笔归档（与进站补算双保险） */
export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const locked = await tryAcquireLock(cacheKeys.lockEssayArchive(), 55 * 60);
  if (!locked) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "lock_held",
    });
  }
  const result = await runEssayArchiveCatchUpAllUsers();
  return NextResponse.json({ ok: true, ...result });
}
