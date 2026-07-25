import { ArchiveItemList } from "@/components/archive/archive-item-list";
import { ARCHIVE_TYPE_ESSAY_SEDIMENT } from "@/db/schema";
import { runEssayArchiveCatchUp } from "@/lib/archive-catchup";
import { requireSession } from "@/lib/session";
import { listArchiveItems } from "@/services/archive";

/** 拾忆馆藏 · 随笔沉淀分区 */
export default async function GalleryEssaySedimentPage() {
  const session = await requireSession();
  await runEssayArchiveCatchUp(session.user.id);
  const items = await listArchiveItems(session.user.id, {
    type: ARCHIVE_TYPE_ESSAY_SEDIMENT,
  });

  return (
    <ArchiveItemList
      items={items}
      emptyHint="还没有随笔沉淀。去流思笺写一条并归档，或等待自动沉淀。"
      detailBase="/app/past/gallery"
      showTypeChip={false}
    />
  );
}
