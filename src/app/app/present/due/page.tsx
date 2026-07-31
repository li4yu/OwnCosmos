import { DueReminderSection } from "@/components/due/due-reminder-section";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { planKindLabel } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";
import { listDueReminderPlans } from "@/services/plans";

export default async function DueRemindersPage() {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const rows = await listDueReminderPlans(session.user.id);
  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    dueAt: row.dueAt,
    daysLeft: row.daysLeft,
    remindDays: row.remindDays,
    kindLabel: planKindLabel(row.kind),
  }));

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="临期帖"
        description={
          <>
            <PoeticName
              name="临期帖"
              tip="来日途计划进入提醒窗口后的倒计时卡片：可完成、延期或缘想"
            />
            · 完成归档；延期回写来日途；缘想生成流思笺
          </>
        }
      />
      <DueReminderSection items={items} showHeading={false} />
    </main>
  );
}
