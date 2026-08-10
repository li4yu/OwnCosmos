import Link from "next/link";
import { PlanListPanel } from "@/components/plans/plan-list-panel";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { formatDueDateInput } from "@/lib/plan-dates";
import { PLANNING_KINDS, planKindLabel } from "@/lib/plan-kinds";
import { parsePlanListSearch } from "@/lib/plan-query";
import { requireSession } from "@/lib/session";
import {
  queryCompletedPlanningPlans,
  queryOpenPlanningPlans,
} from "@/services/plans";

type Props = {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    from?: string;
    to?: string;
    page?: string;
    cpage?: string;
    size?: string;
  }>;
};

export default async function FuturePlansPage({ searchParams }: Props) {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const sp = await searchParams;
  const parsed = parsePlanListSearch(sp);

  const filterOpts = {
    titleQ: parsed.titleQ,
    kind: parsed.kind,
    kinds: PLANNING_KINDS,
    dueFrom: parsed.dueFrom,
    dueTo: parsed.dueTo,
    pageSize: parsed.pageSize,
  };

  const [open, done] = await Promise.all([
    queryOpenPlanningPlans(session.user.id, {
      ...filterOpts,
      page: parsed.page,
    }),
    queryCompletedPlanningPlans(session.user.id, {
      ...filterOpts,
      page: parsed.cpage,
    }),
  ]);

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="规划"
        backHref="/app/future"
        backLabel="返回来日途"
        description={
          <>
            <PoeticName
              name="规划"
              tip="单次与愿景；周期计划与胶囊见其它子功能"
            />
            · 未完成可编辑；「完成及归档」后仍在下方已完成中可查
          </>
        }
        actions={
          <Link
            href="/app/future/plans/new"
            className="ui-btn-primary ui-btn-sm shrink-0"
          >
            新建
          </Link>
        }
      />

      <PlanListPanel
        open={{
          items: open.items.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            dueLabel: item.dueAt ? formatDueDateInput(item.dueAt) : null,
            kindLabel: planKindLabel(item.kind),
          })),
          total: open.total,
          page: open.page,
          totalPages: open.totalPages,
        }}
        done={{
          items: done.items.map((item) => ({
            id: item.id,
            title: item.title,
            body: item.body,
            dueLabel: item.dueAt ? formatDueDateInput(item.dueAt) : null,
            archivedLabel: item.archivedAt
              ? formatDueDateInput(item.archivedAt)
              : null,
            archiveId: item.archiveId,
            kindLabel: planKindLabel(item.kind),
          })),
          total: done.total,
          page: done.page,
          totalPages: done.totalPages,
        }}
        pageSize={parsed.pageSize}
        filters={{
          q: parsed.titleQ ?? "",
          kind: parsed.kindInput,
          from: parsed.fromInput,
          to: parsed.toInput,
        }}
      />
    </main>
  );
}
