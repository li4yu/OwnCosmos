import Link from "next/link";
import { EssayListPanel } from "@/components/essays/essay-list-panel";
import { PageHeader } from "@/components/shell/page-header";
import { PoeticName } from "@/components/ui/poetic-name";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { ESSAY_PAGE_SIZE, parseEssayListSearch } from "@/lib/essay-query";
import { requireSession } from "@/lib/session";
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
  searchParams: Promise<{
    q?: string;
    tag?: string;
    mood?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

export default async function EssaysPage({ searchParams }: Props) {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  const sp = await searchParams;
  const parsed = parseEssayListSearch(sp);

  const [result, tags] = await Promise.all([
    queryActiveEssays(session.user.id, {
      titleQ: parsed.titleQ,
      tagId: parsed.tagId,
      mood: parsed.mood,
      updatedFrom: parsed.updatedFrom,
      updatedTo: parsed.updatedTo,
      page: parsed.page,
      pageSize: ESSAY_PAGE_SIZE,
    }),
    listActiveTags(session.user.id),
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
        title="流思笺"
        backHref="/app/present"
        backLabel="返回今时际"
        description={
          <>
            <PoeticName
              name="流思笺"
              tip="快速记下当下灵感与草稿，未归档前可随时改"
            />
            · 流动中；超过设定小时数未编辑将自动
            <PoeticName
              name="逾时沉淀"
              tip="久未改动的随笔会沉淀进昔时往；也可提前归档；小时数可在设置中修改"
              className="mx-1"
            />
            （默认见设置）
          </>
        }
        actions={
          <Link
            href="/app/present/essays/new"
            className="ui-btn-primary ui-btn-sm shrink-0"
          >
            新建
          </Link>
        }
      />

      <EssayListPanel
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
            : "还没有流动中的思绪。点「新建」写下第一条。"
        }
      />
    </main>
  );
}
