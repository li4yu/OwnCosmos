import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { getGallerySection } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

/** 拾忆馆藏 · 日课归档（习惯计次） */
export default async function GalleryDailyCheckinPage() {
  const session = await requireSession();
  const section = getGallerySection("daily-checkin")!;
  const items = await listArchiveItems(session.user.id, {
    type: section.filterType!,
  });

  return (
    <ArchiveItemList
      items={items}
      emptyHint={section.emptyHint}
      sectionId="daily-checkin"
      showTypeChip={false}
    />
  );
}
