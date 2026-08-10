import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

/** 素材匣入口已下线 */
export default async function MaterialsPage() {
  await requireSession();
  redirect("/app");
}
