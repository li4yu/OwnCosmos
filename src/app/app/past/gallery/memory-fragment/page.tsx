import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_MEMORY_FRAGMENT } from "@/db/schema";

/** 旧「记忆碎片」分区列表 → 馆藏单页预选类型；上传入口仍在 memory-fragment/new */
export default function GalleryMemoryFragmentRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_MEMORY_FRAGMENT)}`,
  );
}
