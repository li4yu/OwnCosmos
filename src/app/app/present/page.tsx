import { AnniversaryTip } from "@/components/corridor/anniversary-tip";
import { DueReminderSection } from "@/components/due/due-reminder-section";
import { PresentEssayPreview } from "@/components/present/present-essay-preview";
import { PresentPulse } from "@/components/present/present-pulse";
import { PresentQuickActions } from "@/components/present/present-quick-actions";
import { ModuleHubCards } from "@/components/shell/module-shell";
import { getUserEssayIdleHours } from "@/lib/archive-catchup";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { planKindLabel } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";
import { listActiveEssays } from "@/services/essays";
import { listDueReminderPlans } from "@/services/plans";
import { listAnniversaryHits } from "@/services/review";

function countNearIdle(
  essays: { updatedAt: Date }[],
  idleHours: number,
  now = new Date(),
) {
  const idleMs = Math.max(1, idleHours) * 3600 * 1000;
  const threshold = idleMs * 0.75;
  return essays.filter((e) => {
    const age = now.getTime() - e.updatedAt.getTime();
    return age >= threshold;
  }).length;
}

export default async function PresentHubPage() {
  const session = await requireSession();
  const user = session.user as typeof session.user & {
    anniversaryRemind?: boolean;
    essayIdleHours?: number;
  };
  await runPlanOverdueCatchUp(session.user.id);

  const [rows, anniversaryHits, essays, idleHours] = await Promise.all([
    listDueReminderPlans(session.user.id),
    user.anniversaryRemind
      ? listAnniversaryHits(session.user.id)
      : Promise.resolve([]),
    listActiveEssays(session.user.id, { folderId: null }),
    getUserEssayIdleHours(session.user.id),
  ]);

  const dueItems = rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt,
    daysLeft: row.daysLeft,
    remindDays: row.remindDays,
    kindLabel: planKindLabel(row.kind),
  }));

  const previewEssays = essays.slice(0, 5).map((e) => ({
    id: e.id,
    title: e.title,
    body: e.body,
    updatedAt: e.updatedAt,
    mood: e.mood,
  }));

  return (
    <main className="flex flex-col gap-3">
      <ModuleHubCards moduleId="present" />
      <PresentQuickActions />
      <PresentPulse
        stats={{
          essayCount: essays.length,
          dueCount: dueItems.length,
          nearIdleCount: countNearIdle(essays, idleHours),
        }}
      />
      {user.anniversaryRemind ? (
        <AnniversaryTip hits={anniversaryHits} />
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start">
        <DueReminderSection items={dueItems} compact />
        <PresentEssayPreview items={previewEssays} />
      </div>
    </main>
  );
}
