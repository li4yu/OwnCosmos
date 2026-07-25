import { DueReminderSection } from "@/components/due/due-reminder-section";
import { ModuleHubCards } from "@/components/shell/module-shell";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { requireSession } from "@/lib/session";
import { listDueReminderPlans } from "@/services/plans";

export default async function PresentHubPage() {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const dueItems = await listDueReminderPlans(session.user.id);

  return (
    <main className="flex flex-col gap-8">
      <ModuleHubCards moduleId="present" />
      <DueReminderSection items={dueItems} />
    </main>
  );
}
