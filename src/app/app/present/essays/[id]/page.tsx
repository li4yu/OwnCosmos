import { notFound } from "next/navigation";
import { EssayEditor } from "@/components/essays/essay-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import { getActiveEssay } from "@/services/essays";
import { getActivePlan } from "@/services/plans";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditEssayPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;
  const session = await requireSession();
  const item = await getActiveEssay(session.user.id, id);
  if (!item) notFound();

  let sourcePlanLink: { title: string; href: string } | null = null;
  if (item.sourcePlanId) {
    const planRow = await getActivePlan(session.user.id, item.sourcePlanId);
    if (planRow) {
      sourcePlanLink = {
        title: planRow.title,
        href: `/app/future/plans/${planRow.id}`,
      };
    } else {
      sourcePlanLink = {
        title: "原计划（已归档）",
        href: "/app/past/gallery/plan-archive",
      };
    }
  }

  return (
    <main>
      <PageHeader
        title="编辑随笔"
        backHref="/app/present/essays"
        backLabel="返回流思笺"
        guardLeave
        description="可删除；未保存离开会弹出确认小窗"
      />
      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
        <EssayEditor
          mode="edit"
          essayId={item.id}
          initialTitle={item.title}
          initialBody={item.body}
          justCreated={saved === "1"}
          sourcePlanLink={sourcePlanLink}
        />
      </div>
    </main>
  );
}
