import { cacheKeys } from "@/lib/cache-keys";
import { consumeRateLimit } from "@/lib/rate-limit";

/** AI 路由共用限流；无 Redis 时放行 */
export async function assertAiRateLimit(
  userId: string,
  route: string,
  opts: { windowSec?: number; max?: number } = {},
): Promise<Response | null> {
  const windowSec = opts.windowSec ?? 60;
  const max = opts.max ?? 40;
  const result = await consumeRateLimit(
    cacheKeys.rateAi(userId, route, "w"),
    { windowSec, max },
  );
  if (result.ok) return null;
  return Response.json(
    { ok: false, error: "请求过于频繁，请稍后再试" },
    { status: 429 },
  );
}
