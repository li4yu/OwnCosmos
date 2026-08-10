import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_FOCUS_RECORD } from "@/db/schema";

export default function GalleryFocusRecordRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_FOCUS_RECORD)}`,
  );
}
