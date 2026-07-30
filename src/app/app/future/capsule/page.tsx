import { CapsuleChamber } from "@/components/capsule/capsule-chamber";
import { formatDueDateInput } from "@/lib/plan-dates";
import { isCapsuleLocked } from "@/lib/plan-kinds";
import { requireSession } from "@/lib/session";
import { listOpenCapsulePlans } from "@/services/plans";

type Props = {
  searchParams: Promise<{ compose?: string; open?: string }>;
};

export default async function FutureCapsulePage({ searchParams }: Props) {
  const session = await requireSession();
  const { compose, open } = await searchParams;
  const openPlans = await listOpenCapsulePlans(session.user.id);

  return (
    <CapsuleChamber
      initialCompose={compose === "1"}
      initialOpenId={open ?? null}
      items={openPlans.map((item) => {
        const locked = isCapsuleLocked(item.kind, item.dueAt);
        return {
          id: item.id,
          title: item.title,
          body: locked ? "" : item.body,
          dueLabel: item.dueAt ? formatDueDateInput(item.dueAt) : "—",
          locked,
        };
      })}
    />
  );
}
