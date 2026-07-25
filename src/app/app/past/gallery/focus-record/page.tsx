import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { getGallerySection } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

/** 拾忆馆藏 · 凝录分区 */
export default async function GalleryFocusRecordPage() {
  const session = await requireSession();
  const section = getGallerySection("focus-record")!;
  const items = await listArchiveItems(session.user.id, {
    type: section.filterType!,
  });

  return (
    <ArchiveItemList
      items={items}
      emptyHint={section.emptyHint}
      sectionId="focus-record"
      showTypeChip={false}
    />
  );
}
