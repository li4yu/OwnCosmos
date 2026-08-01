import { DueReminderSection } from "@/components/due/due-reminder-section";
import { ModuleHubCards } from "@/components/shell/module-shell";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { planKindLabel } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";
import { listDueReminderPlans } from "@/services/plans";

export default async function PresentHubPage() {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const rows = await listDueReminderPlans(session.user.id);
  const dueItems = rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt,
    daysLeft: row.daysLeft,
    remindDays: row.remindDays,
    kindLabel: planKindLabel(row.kind),
  }));

  return (
    <main className="flex flex-col gap-3">
      <ModuleHubCards moduleId="present" />
      <DueReminderSection items={dueItems} compact />
    </main>
  );
}
