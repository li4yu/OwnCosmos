import { EssayEditor } from "@/components/essays/essay-editor";
import { PageHeader } from "@/components/shell/page-header";
import { requireSession } from "@/lib/session";
import { listActiveTags } from "@/services/tags";

export default async function NewEssayPage() {
  const session = await requireSession();
  const tags = await listActiveTags(session.user.id);
  const today = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());

  return (
    <main className="oc-compose">
      <PageHeader
        title="新建每日随笔"
        eyebrow={today}
        backHref="/app/present/essays/daily"
        backLabel="返回每日随笔"
        guardLeave
        description="先记下此刻，标题可后补；保存前离开会确认"
      />
      <div className="oc-compose__sheet">
        <EssayEditor
          mode="create"
          returnHref="/app/present/essays/daily"
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
