import { appRedisKey, getRedis } from "@/lib/redis";

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** 无 Redis 时为 true：放行且不计次 */
  degraded: boolean;
};

/**
 * 滑动窗口近似：INCR + 首次 EXPIRE。
 * Redis 不可用时降级放行（不挡业务）。
 */
export async function consumeRateLimit(
  key: string,
  opts: { windowSec: number; max: number },
): Promise<RateLimitResult> {
  const client = getRedis();
  if (!client) {
    return { ok: true, remaining: opts.max, degraded: true };
  }
  const full = appRedisKey(key);
  try {
    const n = await client.incr(full);
    if (n === 1) {
      await client.expire(full, Math.max(1, opts.windowSec));
    }
    return {
      ok: n <= opts.max,
      remaining: Math.max(0, opts.max - n),
      degraded: false,
    };
  } catch (err) {
    console.warn("[rate-limit]", err instanceof Error ? err.message : err);
    return { ok: true, remaining: opts.max, degraded: true };
  }
}

/** SET NX EX；无 Redis / 失败时返回 true（允许执行） */
export async function tryAcquireLock(
  key: string,
  ttlSec: number,
): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;
  try {
    const res = await client.set(
      appRedisKey(key),
      "1",
      "EX",
      Math.max(1, ttlSec),
      "NX",
    );
    return res === "OK";
  } catch (err) {
    console.warn("[lock]", err instanceof Error ? err.message : err);
    return true;
  }
}
