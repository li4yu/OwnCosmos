import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_ESSAY_TOPIC } from "@/db/schema";

export default function GalleryEssayTopicRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_ESSAY_TOPIC)}`,
  );
}
