import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { getGallerySection } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

/** 拾忆馆藏 · 轮期归档（系列计次） */
export default async function GalleryPlanCyclePage() {
  const session = await requireSession();
  const section = getGallerySection("plan-cycle")!;
  const items = await listArchiveItems(session.user.id, {
    type: section.filterType!,
  });

  return (
    <ArchiveItemList
      items={items}
      emptyHint={section.emptyHint}
      sectionId="plan-cycle"
      showTypeChip={false}
    />
  );
}
