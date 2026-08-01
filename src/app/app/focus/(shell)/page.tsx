import { FocusPulse } from "@/components/focus/focus-pulse";
import { FocusQuickActions } from "@/components/focus/focus-quick-actions";
import { FocusRecentSessions } from "@/components/focus/focus-recent-sessions";
import { ModuleHubCards } from "@/components/shell/module-shell";
import { requireSession } from "@/lib/session";
import {
  getActiveFocusSession,
  getFocusShortStats,
  listCompletedFocusSessions,
} from "@/services/focus";

export default async function FocusHubPage() {
  const session = await requireSession();
  const [stats, active, recent] = await Promise.all([
    getFocusShortStats(session.user.id),
    getActiveFocusSession(session.user.id),
    listCompletedFocusSessions(session.user.id, 5),
  ]);

  return (
    <main className="flex flex-col gap-3">
      <ModuleHubCards moduleId="focus" />
      <FocusQuickActions />
      <FocusPulse
        stats={{
          todayMs: stats.todayMs,
          todayCount: stats.todayCount,
          weekMs: stats.weekMs,
          weekCount: stats.weekCount,
          hasActive: Boolean(active),
        }}
      />
      <FocusRecentSessions
        items={recent.map((s) => ({
          id: s.id,
          title: s.title || "凝录",
          mode: s.mode,
          accumulatedMs: s.accumulatedMs,
          endedAt: s.endedAt,
          archiveItemId: s.archiveId ?? null,
        }))}
      />
    </main>
  );
}
