import { TopicFolderList } from "@/components/essays/topic-folder-list";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { requireSession } from "@/lib/session";
import { listEssayFolders } from "@/services/essay-folders";

export default async function EssayTopicsPage() {
  const session = await requireSession();
  const folders = await listEssayFolders(session.user.id);

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="专题随笔"
        backHref="/app/present/essays"
        backLabel="返回流思笺"
        description={
          <>
            先建
            <PoeticName
              name="专题"
              tip="一个主题一个夹，例如「工作」；夹里可写多篇相关随笔"
              className="mx-1"
            />
            ，再往夹里写；单篇不可归档，只能整专题归档
          </>
        }
      />
      <TopicFolderList
        folders={folders.map((f) => ({
          id: f.id,
          name: f.name,
          body: f.body,
          activeCount: f.activeCount,
        }))}
      />
    </main>
  );
}
