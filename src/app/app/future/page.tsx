import { FuturePlanPreview } from "@/components/future/future-plan-preview";
import { FuturePulse } from "@/components/future/future-pulse";
import { FutureQuickActions } from "@/components/future/future-quick-actions";
import { FutureSidePreview } from "@/components/future/future-side-preview";
import { ModuleHubCards } from "@/components/shell/module-shell";
import { calendarDaysUntilDue } from "@/lib/plan-dates";
import { isCapsuleLocked } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";
import { listActiveHabits } from "@/services/daily";
import {
  listOpenCapsulePlans,
  listOpenCyclePlans,
  listOpenPlanningPlans,
  listUnlockReadyCapsules,
} from "@/services/plans";

export default async function FutureHubPage() {
  const session = await requireSession();
  const now = new Date();

  const [plans, cycles, habits, capsules, unlockReady] = await Promise.all([
    listOpenPlanningPlans(session.user.id),
    listOpenCyclePlans(session.user.id),
    listActiveHabits(session.user.id),
    listOpenCapsulePlans(session.user.id),
    listUnlockReadyCapsules(session.user.id, now),
  ]);

  const unlockIds = new Set(unlockReady.map((c) => c.id));

  const planPreview = [...plans]
    .sort((a, b) => {
      const ad = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bd = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      return ad - bd || a.updatedAt.getTime() - b.updatedAt.getTime();
    })
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      title: p.title,
      kind: p.kind,
      dueAt: p.dueAt,
      daysLeft: p.dueAt ? calendarDaysUntilDue(p.dueAt, now) : null,
    }));

  const cyclePreview = cycles.slice(0, 4).map((c) => ({
    id: c.id,
    title: c.title,
    dueAt: c.dueAt,
  }));

  const capsulePreview = [
    ...unlockReady,
    ...capsules.filter((c) => !unlockIds.has(c.id)),
  ]
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      title: c.title,
      dueAt: c.dueAt,
      unlockReady:
        unlockIds.has(c.id) ||
        Boolean(c.dueAt && !isCapsuleLocked(c.kind, c.dueAt, now)),
    }));

  return (
    <main className="flex flex-col gap-3">
      <ModuleHubCards moduleId="future" />
      <FutureQuickActions />
      <FuturePulse
        stats={{
          planCount: plans.length,
          cycleCount: cycles.length,
          habitCount: habits.length,
          capsuleCount: capsules.length,
          unlockReadyCount: unlockReady.length,
        }}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-start">
        <FuturePlanPreview items={planPreview} />
        <FutureSidePreview
          capsules={capsulePreview}
          cycles={cyclePreview}
        />
      </div>
    </main>
  );
}
