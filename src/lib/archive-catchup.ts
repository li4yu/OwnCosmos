import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { user } from "@/db/schema";
import {
  catchUpIdleEssayArchives,
} from "@/services/archive";
import { DEFAULT_ESSAY_IDLE_HOURS } from "@/lib/archive-constants";

export async function getUserEssayIdleHours(userId: string) {
  const rows = await getDb()
    .select({ essayIdleHours: user.essayIdleHours })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return rows[0]?.essayIdleHours ?? DEFAULT_ESSAY_IDLE_HOURS;
}

/**
 * 进站补算：按用户设置的小时数，将超期未编辑随笔自动归档。
 */
export async function runEssayArchiveCatchUp(userId: string) {
  try {
    const hours = await getUserEssayIdleHours(userId);
    return await catchUpIdleEssayArchives(userId, hours);
  } catch (err) {
    console.error("[archive catch-up]", err);
    return 0;
  }
}
