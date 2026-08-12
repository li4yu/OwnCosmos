import Redis from "ioredis";

type GlobalRedis = {
  ownCosmosRedis?: Redis | null;
  ownCosmosRedisUrl?: string;
};

const globalForRedis = globalThis as unknown as GlobalRedis;

/**
 * 可选 Redis。未配置 REDIS_URL 或连接失败时返回 null，调用方降级直连 Postgres。
 */
export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    globalForRedis.ownCosmosRedis = null;
    globalForRedis.ownCosmosRedisUrl = undefined;
    return null;
  }

  if (
    globalForRedis.ownCosmosRedis &&
    globalForRedis.ownCosmosRedisUrl === url
  ) {
    return globalForRedis.ownCosmosRedis;
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 2) return null;
        return Math.min(times * 200, 1000);
      },
    });
    client.on("error", (err) => {
      console.warn("[redis]", err.message);
    });
    globalForRedis.ownCosmosRedis = client;
    globalForRedis.ownCosmosRedisUrl = url;
    return client;
  } catch (err) {
    console.warn("[redis] init failed", err);
    globalForRedis.ownCosmosRedis = null;
    return null;
  }
}

export function redisKeyPrefix(): string {
  const raw = process.env.REDIS_KEY_PREFIX?.trim();
  return raw && raw.length > 0 ? raw : "oc:";
}

export function appRedisKey(suffix: string): string {
  return `${redisKeyPrefix()}${suffix}`;
}

/** 探测连通；失败则视为不可用（降级） */
export async function pingRedis(): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  try {
    if (client.status !== "ready") {
      await client.connect().catch(() => undefined);
    }
    return (await client.ping()) === "PONG";
  } catch {
    return false;
  }
}
