import { redirect } from "next/navigation";

/** 旧「进知识库」分区 → 馆藏总览 */
export default async function GalleryKnowledgeRedirect() {
  redirect("/app/past/gallery");
}
