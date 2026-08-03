import { notFound, redirect } from "next/navigation";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PageHeader } from "@/components/shell/page-header";
import { PLAN_KIND_CAPSULE, PLAN_KIND_CYCLE } from "@/db/schema";
import { isPlanKind } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";
import {
  listPlanTasks,
  localTaskCheckinDate,
  taskCheckedInOnDate,
} from "@/services/plan-tasks";
import { sumFocusMsForPlan } from "@/services/focus";
import {
  getActivePlanForEdit,
  resolvePlanSourceLink,
  seriesHasArchivedPeriodOnDate,
} from "@/services/plans";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditPlanPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;
  const session = await requireSession();
  const item = await getActivePlanForEdit(session.user.id, id);
  if (!item) notFound();
  if (item.kind === PLAN_KIND_CAPSULE) {
    redirect(`/app/future/capsule?open=${id}`);
  }

  const kind = isPlanKind(item.kind) ? item.kind : "once";
  const sourceLink = await resolvePlanSourceLink(
    session.user.id,
    item.sourceEssayId,
  );
  const [tasks, focusAgg] = await Promise.all([
    listPlanTasks(session.user.id, item.id),
    sumFocusMsForPlan(session.user.id, item.id),
  ]);
  const todayKey = localTaskCheckinDate();
  const periodDoneToday =
    kind === PLAN_KIND_CYCLE
      ? await seriesHasArchivedPeriodOnDate(
          session.user.id,
          item.seriesId ?? item.id,
          todayKey,
        )
      : false;
  const listHref =
    kind === "cycle" ? "/app/future/cycles" : "/app/future/plans";

  return (
    <main>
      <PageHeader
        title={kind === PLAN_KIND_CYCLE ? "编辑轮期" : "编辑计划"}
        backHref={listHref}
        backLabel="返回列表"
        guardLeave
        description={
          kind === PLAN_KIND_CYCLE
            ? "可改周期、描述、子任务与完成本期"
            : "可改标题、日期、描述与完成状态"
        }
      />
      <div className="oc-sheet">
        <PlanEditor
          mode="edit"
          planId={item.id}
          initialTitle={item.title}
          initialBody={item.body}
          initialDueAt={item.dueAt}
          initialRemindDays={item.remindDays}
          initialStatus={item.status}
          initialKind={kind}
          initialCycleUnit={item.cycleUnit}
          initialCycleEveryDays={item.cycleEveryDays}
          sourceLink={sourceLink}
          periodDoneToday={periodDoneToday}
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            checkCount: t.checkCount,
            checkedInToday: taskCheckedInOnDate(t.lastCheckinDate, todayKey),
            status: t.status,
          }))}
          justCreated={saved === "1"}
          listHref={listHref}
          focusTotalMs={focusAgg.totalMs}
          focusSessionCount={focusAgg.count}
        />
      </div>
    </main>
  );
}
