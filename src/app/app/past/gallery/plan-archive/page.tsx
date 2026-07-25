import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { getGallerySection } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

/** 拾忆馆藏 · 规划归档分区（P7 写入；本阶段空态预留） */
export default async function GalleryPlanArchivePage() {
  const session = await requireSession();
  const section = getGallerySection("plan-archive")!;
  const items = await listArchiveItems(session.user.id, {
    type: section.filterType!,
  });

  return (
    <ArchiveItemList
      items={items}
      emptyHint={section.emptyHint}
      sectionId="plan-archive"
      showTypeChip={false}
    />
  );
}
