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
import {
  getActivePlanForEdit,
  resolvePlanSourceLink,
  seriesHasArchivedPeriodOnDate,
} from "@/services/plans";
import { listActiveTags, listPlanTagIds } from "@/services/tags";

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
  const [tasks, tags, tagIds] = await Promise.all([
    listPlanTasks(session.user.id, item.id),
    listActiveTags(session.user.id),
    listPlanTagIds(session.user.id, item.id),
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
        title="编辑计划"
        backHref={listHref}
        backLabel="返回列表"
        guardLeave
        description="可改标题、日期、描述、子任务与完成状态"
      />
      <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
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
          initialMood={item.mood}
          initialTagIds={tagIds}
          allTags={tags.map((t) => ({
            id: t.id,
            name: t.name,
            active: t.active,
          }))}
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
        />
      </div>
    </main>
  );
}
