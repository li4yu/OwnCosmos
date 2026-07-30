import Link from "next/link";
import {
  PlanCompletedListItem,
  PlanListItem,
} from "@/components/plans/plan-list-item";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { runPlanOverdueCatchUp } from "@/lib/plan-catchup";
import { formatDueDateInput } from "@/lib/plan-dates";
import { PLANNING_KINDS, planKindLabel } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";
import {
  listCompletedPlans,
  listOpenPlanningPlans,
} from "@/services/plans";

export default async function FuturePlansPage() {
  const session = await requireSession();
  await runPlanOverdueCatchUp(session.user.id);
  const openPlans = await listOpenPlanningPlans(session.user.id);
  const completedPlans = await listCompletedPlans(
    session.user.id,
    PLANNING_KINDS,
  );

  return (
    <main className="flex flex-col gap-8">
      <PageHeader
        title="规划"
        description={
          <>
            <PoeticName
              name="规划"
              tip="单次、愿景与阶段目标；轮期与胶囊见其它子功能"
            />
            · 未完成可编辑；「完成及归档」后仍在下方已完成中可查
          </>
        }
        actions={
          <Link
            href="/app/future/plans/new"
            className="ui-btn-primary !w-auto px-4 py-2 text-xs"
          >
            新建
          </Link>
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
          未完成
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
            {openPlans.length}
          </span>
        </h2>
        {openPlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--mist)]">
            暂无进行中的计划。点「新建」，或从流思笺「提炼」。
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {openPlans.map((item) => (
              <PlanListItem
                key={item.id}
                id={item.id}
                title={item.title}
                body={item.body}
                dueLabel={item.dueAt ? formatDueDateInput(item.dueAt) : null}
                kindLabel={planKindLabel(item.kind)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm tracking-[0.12em] text-[var(--paper)]">
          已完成
          <span className="ml-2 font-mono text-[10px] text-[var(--mist)]">
            {completedPlans.length}
          </span>
        </h2>
        {completedPlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-sm text-[var(--mist)]">
            还没有已完成的计划。「完成及归档」后会出现在这里，并可跳转馆藏。
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {completedPlans.map((item) => (
              <PlanCompletedListItem
                key={item.id}
                id={item.id}
                title={item.title}
                body={item.body}
                dueLabel={item.dueAt ? formatDueDateInput(item.dueAt) : null}
                archivedLabel={
                  item.archivedAt
                    ? formatDueDateInput(item.archivedAt)
                    : null
                }
                archiveId={item.archiveId}
                kindLabel={planKindLabel(item.kind)}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
