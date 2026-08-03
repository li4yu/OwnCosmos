import { notFound } from "next/navigation";
import { EssayEditor } from "@/components/essays/essay-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import { getEssayFolder } from "@/services/essay-folders";
import { listActiveTags } from "@/services/tags";

type Props = {
  params: Promise<{ folderId: string }>;
};

export default async function NewTopicEssayPage({ params }: Props) {
  const { folderId } = await params;
  const session = await requireSession();
  const folder = await getEssayFolder(session.user.id, folderId);
  if (!folder) notFound();
  const tags = await listActiveTags(session.user.id);
  const returnHref = `/app/present/essays/topics/${folderId}`;

  return (
    <main>
      <PageHeader
        title={`新建 · ${folder.name}`}
        backHref={returnHref}
        backLabel="返回专题"
        guardLeave
        description="写入本专题；单篇不可归档，请在专题列表或本夹顶栏「归档专题」"
      />
      <div className="oc-sheet oc-sheet--ruled">
        <EssayEditor
          mode="create"
          folderId={folderId}
          returnHref={returnHref}
          allTags={tags.map((t) => ({
            id: t.id,
            name: t.name,
            active: t.active,
          }))}
        />
      </div>
    </main>
  );
}
