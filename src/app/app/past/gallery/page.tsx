import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

export default async function GalleryPage() {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  const items = await listArchiveItems(session.user.id);

  return (
    <ArchiveItemList
      items={items}
      emptyHint="馆藏尚空。可在流思笺中手动归档，或等待超过设定小时数未编辑后自动沉淀。"
      detailBase="/app/past/gallery"
    />
  );
}
