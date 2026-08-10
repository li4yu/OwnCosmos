import { ArchiveBatchPanel } from "@/components/archive/archive-batch-panel";
import {
  GALLERY_TYPE_OPTIONS,
  parseGalleryListSearch,
} from "@/lib/archive-query";
import { queryArchiveItems } from "@/services/archive";
import { listAllTags } from "@/services/tags";

type SearchParams = {
  q?: string;
  type?: string;
  kept?: string;
  from?: string;
  to?: string;
  tag?: string;
  page?: string;
  size?: string;
};

/** 馆藏单页列表：类型等筛选都在面板内完成 */
export async function GalleryListView({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: SearchParams;
}) {
  const parsed = parseGalleryListSearch(searchParams);
  const [result, tags] = await Promise.all([
    queryArchiveItems(userId, {
      type: parsed.type,
      inKnowledge: parsed.inKnowledge,
      titleQ: parsed.titleQ,
      archivedFrom: parsed.archivedFrom,
      archivedTo: parsed.archivedTo,
      tagId: parsed.tagId,
      page: parsed.page,
      pageSize: parsed.pageSize,
    }),
    listAllTags(userId),
  ]);

  return (
    <ArchiveBatchPanel
      basePath="/app/past/gallery"
      items={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      filters={{
        q: parsed.titleQ ?? "",
        type: parsed.typeInput,
        kept: parsed.keptInput,
        from: parsed.fromInput,
        to: parsed.toInput,
        tag: parsed.tagInput,
      }}
      tagOptions={tags
        .filter((t) => t.active)
        .map((t) => ({
          value: t.id,
          label: t.name,
        }))}
      typeOptions={GALLERY_TYPE_OPTIONS}
      emptyHint="馆藏尚空。可在随笔中手动归档，或等待超过设定小时数未编辑后自动沉淀；亦可上传记忆碎片。"
      allowWipe
      showTypeChip
    />
  );
}
