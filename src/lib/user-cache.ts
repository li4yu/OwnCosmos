import { cacheDel } from "@/lib/cache";
import { cacheKeys, localDayKey } from "@/lib/cache-keys";

export async function invalidateCompanionCache(userId: string) {
  await cacheDel(cacheKeys.companion(userId));
}

export async function invalidateTagsCache(userId: string) {
  await cacheDel(cacheKeys.tagsActive(userId));
}

/** 临期 + 首页摘要（同日） */
export async function invalidateDueAndHomeCache(
  userId: string,
  now = new Date(),
) {
  const day = localDayKey(now);
  await cacheDel(
    cacheKeys.due(userId, day),
    cacheKeys.homeSummary(userId, day),
  );
}

export async function invalidateHomeCache(userId: string, now = new Date()) {
  await cacheDel(cacheKeys.homeSummary(userId, localDayKey(now)));
}
