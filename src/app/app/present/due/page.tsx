import { DueReminderSection } from "@/components/due/due-reminder-section";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { requireSession } from "@/lib/session";
import { listDueReminderPlans } from "@/services/plans";

export default async function DueRemindersPage() {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const items = await listDueReminderPlans(session.user.id);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="临期帖"
        description={
          <>
            <PoeticName
              name="临期帖"
              tip="来日途计划进入提醒窗口后的只读倒计时卡片"
            />
            · 只读副本；「完成」会回写并归档入馆藏
          </>
        }
      />
      <DueReminderSection items={items} showHeading={false} />
    </main>
  );
}
