import { catchUpOverduePlanArchives } from "@/services/plans";

/** 进站补算：逾期未归档计划写入馆藏「规划归档」 */
export async function runPlanOverdueCatchUp(userId: string) {
  try {
    return await catchUpOverduePlanArchives(userId);
  } catch (err) {
    console.error("[plan overdue catch-up]", err);
    return 0;
  }
}
