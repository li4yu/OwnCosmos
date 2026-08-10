import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_PLAN_CYCLE } from "@/db/schema";

export default function GalleryPlanCycleRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_PLAN_CYCLE)}`,
  );
}
