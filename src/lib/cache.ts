import { appRedisKey, getRedis } from "@/lib/redis";

async function withRedis<T>(
  fn: (client: NonNullable<ReturnType<typeof getRedis>>) => Promise<T>,
  fallback: T,
): Promise<T> {
  const client = getRedis();
  if (!client) return fallback;
  try {
    return await fn(client);
  } catch (err) {
    console.warn("[cache]", err instanceof Error ? err.message : err);
    return fallback;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  return withRedis(async (r) => r.get(appRedisKey(key)), null);
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSec: number,
): Promise<void> {
  await withRedis(async (r) => {
    if (ttlSec > 0) await r.set(appRedisKey(key), value, "EX", ttlSec);
    else await r.set(appRedisKey(key), value);
    return undefined;
  }, undefined);
}

export async function cacheSetJson(
  key: string,
  value: unknown,
  ttlSec: number,
): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSec);
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await withRedis(async (r) => {
    await r.del(...keys.map(appRedisKey));
    return undefined;
  }, undefined);
}

/**
 * 读穿缓存；无 Redis / 失败时直接 loader。
 */
export async function withCache<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>,
  revive?: (raw: unknown) => T,
): Promise<T> {
  const hit = await cacheGetJson<unknown>(key);
  if (hit !== null) {
    return revive ? revive(hit) : (hit as T);
  }
  const value = await loader();
  await cacheSetJson(key, value, ttlSec);
  return value;
}
