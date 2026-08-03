import { notFound } from "next/navigation";
import { EssayListPanel } from "@/components/essays/essay-list-panel";
import { TopicArchiveButton } from "@/components/essays/topic-archive-button";
import { PageHeader } from "@/components/shell/page-header";
import { parseEssayListSearch } from "@/lib/essay-query";
import { requireSession } from "@/lib/session";
import { getEssayFolder, countActiveEssaysInFolder } from "@/services/essay-folders";
import { queryActiveEssays } from "@/services/essays";
import { listActiveTags, mapEssayTagNames } from "@/services/tags";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

type Props = {
  params: Promise<{ folderId: string }>;
  searchParams: Promise<{
    q?: string;
    tag?: string;
    mood?: string;
    from?: string;
    to?: string;
    page?: string;
    size?: string;
  }>;
};

export default async function TopicEssaysPage({ params, searchParams }: Props) {
  const { folderId } = await params;
  const session = await requireSession();
  const folder = await getEssayFolder(session.user.id, folderId);
  if (!folder) notFound();

  const sp = await searchParams;
  const parsed = parseEssayListSearch(sp);
  const basePath = `/app/present/essays/topics/${folderId}`;

  const [result, tags, activeCount] = await Promise.all([
    queryActiveEssays(session.user.id, {
      folderId,
      titleQ: parsed.titleQ,
      tagId: parsed.tagId,
      mood: parsed.mood,
      updatedFrom: parsed.updatedFrom,
      updatedTo: parsed.updatedTo,
      page: parsed.page,
      pageSize: parsed.pageSize,
    }),
    listActiveTags(session.user.id),
    countActiveEssaysInFolder(session.user.id, folderId),
  ]);

  const tagMap = await mapEssayTagNames(
    session.user.id,
    result.items.map((i) => i.id),
  );

  const hasFilters = Boolean(
    parsed.titleQ ||
      parsed.tagId ||
      parsed.mood ||
      parsed.fromInput ||
      parsed.toInput,
  );

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title={folder.name}
        backHref="/app/present/essays/topics"
        backLabel="返回专题随笔"
        description={
          folder.body.trim()
            ? folder.body
            : "夹内单篇不可归档；整专题归档后写入馆藏并移除本夹"
        }
        actions={
          <TopicArchiveButton
            folderId={folder.id}
            folderName={folder.name}
            activeCount={activeCount}
          />
        }
      />

      <EssayListPanel
        basePath={basePath}
        allowArchive={false}
        items={result.items.map((item) => ({
          id: item.id,
          title: item.title,
          body: item.body,
          updatedLabel: formatWhen(item.updatedAt),
          mood: item.mood,
          tagNames: tagMap.get(item.id) ?? [],
        }))}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        filters={{
          q: parsed.titleQ ?? "",
          tag: parsed.tagInput,
          mood: parsed.moodInput,
          from: parsed.fromInput,
          to: parsed.toInput,
        }}
        tagOptions={tags.map((t) => ({ value: t.id, label: t.name }))}
        emptyHint={
          hasFilters
            ? "没有符合条件的随笔，试试放宽筛选。"
            : "这个专题还是空的。点「新建」写下第一篇。"
        }
      />
    </main>
  );
}
