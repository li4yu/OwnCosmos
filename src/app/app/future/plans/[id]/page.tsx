import { notFound } from "next/navigation";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import { getActivePlan } from "@/services/plans";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditPlanPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;
  const session = await requireSession();
  const item = await getActivePlan(session.user.id, id);
  if (!item) notFound();

  return (
    <main>
      <PageHeader
        title="编辑计划"
        backHref="/app/future/plans"
        backLabel="返回规划"
        guardLeave
        description="可改标题、截止日期、临期配、描述与完成状态"
      />
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <PlanEditor
          mode="edit"
          planId={item.id}
          initialTitle={item.title}
          initialBody={item.body}
          initialDueAt={item.dueAt}
          initialRemindDays={item.remindDays}
          initialStatus={item.status}
          justCreated={saved === "1"}
        />
      </div>
    </main>
  );
}
