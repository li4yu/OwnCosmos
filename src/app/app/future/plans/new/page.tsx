import { PlanEditor } from "@/components/plans/plan-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";

export default async function NewPlanPage() {
  await requireSession();

  return (
    <main>
      <PageHeader
        title="新建计划"
        backHref="/app/future/plans"
        backLabel="返回规划"
        guardLeave
        description="单次事件：标题、描述与截止日期；手动保存"
      />
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <PlanEditor mode="create" />
      </div>
    </main>
  );
}
