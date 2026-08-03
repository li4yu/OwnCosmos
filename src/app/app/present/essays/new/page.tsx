import { EssayEditor } from "@/components/essays/essay-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import { listActiveTags } from "@/services/tags";

export default async function NewEssayPage() {
  const session = await requireSession();
  const tags = await listActiveTags(session.user.id);

  return (
    <main>
      <PageHeader
        title="新建每日随笔"
        backHref="/app/present/essays/daily"
        backLabel="返回每日随笔"
        guardLeave
        description="手动保存；未保存离开会弹出确认小窗"
      />
      <div className="oc-sheet oc-sheet--ruled">
        <EssayEditor
          mode="create"
          returnHref="/app/present/essays/daily"
          allTags={tags.map((t) => ({ id: t.id, name: t.name, active: t.active }))}
        />
      </div>
    </main>
  );
}
