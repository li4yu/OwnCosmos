import { MaterialsPanel } from "@/components/materials/materials-panel";
import { PageHeader } from "@/components/shell/page-header";
import {
  MATERIAL_PAGE_SIZE,
  parseMaterialListSearch,
} from "@/lib/material-query";
import { requireSession } from "@/lib/session";
import { queryMaterials } from "@/services/materials";

type Props = {
  searchParams: Promise<{
    q?: string;
    source?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
};

export default async function MaterialsPage({ searchParams }: Props) {
  const session = await requireSession();
  const sp = await searchParams;
  const parsed = parseMaterialListSearch(sp);
  const result = await queryMaterials(session.user.id, {
    titleQ: parsed.titleQ,
    sourceKind: parsed.source,
    createdFrom: parsed.createdFrom,
    createdTo: parsed.createdTo,
    page: parsed.page,
    pageSize: MATERIAL_PAGE_SIZE,
  });

  const hasFilters = Boolean(
    parsed.titleQ || parsed.source || parsed.fromInput || parsed.toInput,
  );

  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="素材匣"
        eyebrow="MATERIALS"
        description="收藏文字副本，写作时调取复用；源删除不影响已收藏内容"
        backHref="/app"
        backLabel="返回首页"
      />
      <MaterialsPanel
        items={result.items.map((m) => ({
          id: m.id,
          title: m.title,
          body: m.body,
          sourceKind: m.sourceKind,
        }))}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        filters={{
          q: parsed.titleQ ?? "",
          source: parsed.sourceInput,
          from: parsed.fromInput,
          to: parsed.toInput,
        }}
        emptyHint={
          hasFilters
            ? "没有符合条件的素材，试试放宽筛选。"
            : "素材匣为空。可从检索结果、随笔或馆藏收藏文字副本。"
        }
      />
    </main>
  );
}
