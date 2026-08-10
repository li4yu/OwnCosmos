import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_ESSAY_SEDIMENT } from "@/db/schema";

/** 旧分区路由 → 馆藏单页（预选类型） */
export default function GalleryEssaySedimentRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_ESSAY_SEDIMENT)}`,
  );
}
