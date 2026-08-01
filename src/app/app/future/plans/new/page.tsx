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
  // 不做「阶段」类型；capsule 另走胶囊舱
  let defaultKind: PlanKind = "once";
  if (raw === "cycle" || raw === "vision" || raw === "once") {
    defaultKind = raw;
  } else if (raw && isPlanKind(raw) && raw !== "capsule" && raw !== "stage") {
    defaultKind = raw;
  }

  return (
    <main>
      <PageHeader
        title="新建计划"
        backHref="/app/future/plans"
        backLabel="返回规划"
        guardLeave
        description="单次 / 愿景：标题、日期、临期配与描述"
      />
      <div className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 sm:p-4">
        <PlanEditor mode="create" defaultKind={defaultKind} />
      </div>
    </main>
  );
}
