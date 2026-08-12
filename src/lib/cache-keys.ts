/** 应用侧缓存 key（不含 REDIS_KEY_PREFIX；由 cache/redis 自动加前缀） */

export function localDayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function localHourKey(now = new Date()): string {
  return `${localDayKey(now)}-${String(now.getHours()).padStart(2, "0")}`;
}

export const cacheKeys = {
  companion: (userId: string) => `companion:${userId}`,
  tagsActive: (userId: string) => `tags:active:${userId}`,
  due: (userId: string, day = localDayKey()) => `due:${userId}:${day}`,
  homeSummary: (userId: string, day = localDayKey()) =>
    `home:summary:${userId}:${day}`,
  rateOtp: (email: string, bucket: string) => `rl:otp:${email}:${bucket}`,
  rateAi: (userId: string, route: string, bucket: string) =>
    `rl:ai:${userId}:${route}:${bucket}`,
  lockEssayArchive: (hour = localHourKey()) => `lock:essay-archive:${hour}`,
} as const;

export const cacheTtl = {
  companionSec: 600,
  tagsSec: 900,
  dueSec: 60,
  homeSummarySec: 30,
} as const;
