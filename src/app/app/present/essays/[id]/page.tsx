import { notFound } from "next/navigation";
import { EssayEditor } from "@/components/essays/essay-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import { getEssayFolder } from "@/services/essay-folders";
import { getActiveEssay } from "@/services/essays";
import { getActivePlan } from "@/services/plans";
import { listActiveTags, listEssayTagIds } from "@/services/tags";

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

  const [tags, tagIds, folder] = await Promise.all([
    listActiveTags(session.user.id),
    listEssayTagIds(session.user.id, id),
    item.folderId
      ? getEssayFolder(session.user.id, item.folderId)
      : Promise.resolve(null),
  ]);

  const returnHref = item.folderId
    ? `/app/present/essays/topics/${item.folderId}`
    : "/app/present/essays/daily";

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
        title={folder ? `编辑 · ${folder.name}` : "编辑每日随笔"}
        backHref={returnHref}
        backLabel={folder ? "返回专题" : "返回每日随笔"}
        guardLeave
        description={
          folder
            ? "专题篇请整专题归档；未保存离开会弹出确认小窗"
            : "可删除；未保存离开会弹出确认小窗"
        }
      />
      <div className="oc-sheet oc-sheet--ruled">
        <EssayEditor
          mode="edit"
          essayId={item.id}
          initialTitle={item.title}
          initialBody={item.body}
          initialMood={item.mood}
          initialTagIds={tagIds}
          returnHref={returnHref}
          topicEssay={Boolean(item.folderId)}
          allTags={tags.map((t) => ({
            id: t.id,
            name: t.name,
            active: t.active,
          }))}
          justCreated={saved === "1"}
          sourcePlanLink={sourcePlanLink}
        />
      </div>
    </main>
  );
}
