import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_REFLECT_REPORT } from "@/db/schema";

export default function GalleryReflectReportRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_REFLECT_REPORT)}`,
  );
}
