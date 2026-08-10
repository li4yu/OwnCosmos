import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

/** 全文检索入口已下线 */
export default async function SearchPage() {
  await requireSession();
  redirect("/app");
}
