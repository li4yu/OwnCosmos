import Link from "next/link";
import { PlanListItem } from "@/components/plans/plan-list-item";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";
import { formatDueDateInput } from "@/lib/plan-dates";
import { listActivePlans } from "@/services/plans";

export default async function FuturePlansPage() {
  const session = await requireSession();
  const plans = await listActivePlans(session.user.id);

  return (
    <main className="flex flex-col gap-6">
      <PageHeader
        title="规划"
        description={
          <>
            <PoeticName
              name="规划"
              tip="来日途中的目标与日子；V1 先做单次事件"
            />
            · 单次事件；临期提醒与归档将在后续阶段接入
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

      {plans.length === 0 ? (
        <section className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--mist)]">
          还没有计划。点「新建」记下第一件要奔赴的事。
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((item) => (
            <PlanListItem
              key={item.id}
              id={item.id}
              title={item.title}
              body={item.body}
              dueLabel={formatDueDateInput(item.dueAt)}
              status={item.status}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
