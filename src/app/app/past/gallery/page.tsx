import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { getGallerySection } from "@/lib/gallery-sections";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

export default async function GalleryPage() {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  const items = await listArchiveItems(session.user.id);
  const section = getGallerySection("all")!;

  return (
    <ArchiveItemList
      items={items}
      emptyHint={section.emptyHint}
      sectionId="all"
    />
  );
}
