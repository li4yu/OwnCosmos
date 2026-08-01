import { redirect } from "next/navigation";

/** 旧「藏忆」分区 → 馆藏总览 */
export default async function GalleryKnowledgeRedirect() {
  redirect("/app/past/gallery");
}
