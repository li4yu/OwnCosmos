import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { getGallerySection } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

/** 拾忆馆藏 · 随笔沉淀分区 */
export default async function GalleryEssaySedimentPage() {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  const section = getGallerySection("essay-sediment")!;
  const items = await listArchiveItems(session.user.id, {
    type: section.filterType!,
  });

  return (
    <ArchiveItemList
      items={items}
      emptyHint={section.emptyHint}
      sectionId="essay-sediment"
      showTypeChip={false}
    />
  );
}
