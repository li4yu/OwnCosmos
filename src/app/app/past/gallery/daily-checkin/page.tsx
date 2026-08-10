import { redirect } from "next/navigation";
import { ARCHIVE_TYPE_DAILY_CHECKIN } from "@/db/schema";

export default function GalleryDailyCheckinRedirect() {
  redirect(
    `/app/past/gallery?type=${encodeURIComponent(ARCHIVE_TYPE_DAILY_CHECKIN)}`,
  );
}
