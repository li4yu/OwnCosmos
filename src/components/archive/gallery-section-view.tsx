import { ArchiveBatchPanel } from "@/components/archive/archive-batch-panel";
import {
  GALLERY_TYPE_OPTIONS,
  parseGalleryListSearch,
} from "@/lib/archive-query";
import {
  getGallerySection,
  type GallerySectionId,
} from "@/lib/gallery-sections";
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

export async function GallerySectionView({
  userId,
  sectionId,
  searchParams,
}: {
  userId: string;
  sectionId: GallerySectionId;
  searchParams: SearchParams;
}) {
  const section = getGallerySection(sectionId)!;
  const parsed = parseGalleryListSearch(searchParams);
  const lockedType = section.filterType;
  const [result, tags] = await Promise.all([
    queryArchiveItems(userId, {
      type: lockedType ?? parsed.type,
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
      basePath={section.href}
      sectionId={sectionId}
      items={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      filters={{
        q: parsed.titleQ ?? "",
        type: lockedType ? "" : parsed.typeInput,
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
      typeOptions={lockedType ? undefined : GALLERY_TYPE_OPTIONS}
      emptyHint={section.emptyHint}
      allowWipe
      showTypeChip={!lockedType}
    />
  );
}
