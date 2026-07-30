import { redirect } from "next/navigation";
import { PlanEditor } from "@/components/plans/plan-editor";
import { PageHeader } from "@/components/shell/page-header";
import { isPlanKind, type PlanKind } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";

type Props = {
  searchParams: Promise<{ kind?: string }>;
};

export default async function NewPlanPage({ searchParams }: Props) {
  await requireSession();
  const { kind: raw } = await searchParams;
  if (raw === "capsule") {
    redirect("/app/future/capsule?compose=1");
  }
  const defaultKind: PlanKind =
    raw && isPlanKind(raw) && raw !== "capsule" ? raw : "once";

  return (
    <main>
      <PageHeader
        title="新建计划"
        backHref="/app/future/plans"
        backLabel="返回规划"
        guardLeave
        description="单次 / 愿景 / 阶段：标题、日期、临期配与描述"
      />
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <PlanEditor mode="create" defaultKind={defaultKind} />
      </div>
    </main>
  );
}
