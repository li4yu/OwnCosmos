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
  const isCycle = defaultKind === "cycle";

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title={isCycle ? "新建周期计划" : "新建计划"}
        backHref={isCycle ? "/app/future/cycles" : "/app/future/plans"}
        backLabel={isCycle ? "返回周期计划" : "返回规划"}
        guardLeave
        description={
          isCycle
            ? "周期单位、子任务与本期结束日"
            : "单次 / 愿景：标题、日期、提前提醒与描述"
        }
      />
      <div className="oc-sheet">
        <PlanEditor mode="create" defaultKind={defaultKind} />
      </div>
    </main>
  );
}
