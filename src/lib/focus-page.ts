import { getActiveFocusSession } from "@/services/focus";
import { listActiveHabits } from "@/services/daily";
import { getActivePlan } from "@/services/plans";

/** 计时页共用的 active 快照 */
export async function loadFocusTimerActive(userId: string) {
  const active = await getActiveFocusSession(userId);
  if (!active) return null;
  let bindLabel: string | null = null;
  if (active.planId) {
    const p = await getActivePlan(userId, active.planId);
    bindLabel = p?.title?.trim() || "（无标题）";
  } else if (active.habitId) {
    const habits = await listActiveHabits(userId);
    const h = habits.find((x) => x.id === active.habitId);
    bindLabel = h?.title?.trim() || "（无标题）";
  }
  return {
    id: active.id,
    status: active.status,
    mode: active.mode,
    accumulatedMs: active.accumulatedMs,
    targetMs: active.targetMs,
    planId: active.planId,
    habitId: active.habitId,
    bindLabel,
    runningSince: active.runningSince
      ? active.runningSince.toISOString()
      : null,
  };
}
