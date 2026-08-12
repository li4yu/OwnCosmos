import type { redisStorage } from "@better-auth/redis-storage";

type Secondary = ReturnType<typeof redisStorage>;

/**
 * SecondaryStorage 包装：Redis 故障时 get→null、set/delete 吞错，
 * 配合 session.storeSessionInDatabase 回落 Postgres。
 */
export function resilientSecondaryStorage(inner: Secondary): Secondary {
  const warn = (op: string, err: unknown) => {
    console.warn(
      `[auth:redis] ${op}`,
      err instanceof Error ? err.message : err,
    );
  };

  return {
    async get(key) {
      try {
        return await inner.get(key);
      } catch (err) {
        warn("get", err);
        return null;
      }
    },
    async getAndDelete(key) {
      try {
        return await inner.getAndDelete(key);
      } catch (err) {
        warn("getAndDelete", err);
        return null;
      }
    },
    async increment(key, ttl) {
      try {
        return await inner.increment(key, ttl);
      } catch (err) {
        warn("increment", err);
        return 0;
      }
    },
    async set(key, value, ttl) {
      try {
        await inner.set(key, value, ttl);
      } catch (err) {
        warn("set", err);
      }
    },
    async delete(key) {
      try {
        await inner.delete(key);
      } catch (err) {
        warn("delete", err);
      }
    },
    async listKeys() {
      try {
        return await inner.listKeys();
      } catch (err) {
        warn("listKeys", err);
        return [];
      }
    },
    async clear() {
      try {
        await inner.clear();
      } catch (err) {
        warn("clear", err);
      }
    },
  };
}
