import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_PLAN_ARCHIVE } from "@/db/schema";

export default function GalleryPlanArchiveRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_PLAN_ARCHIVE)}`,
  );
}
