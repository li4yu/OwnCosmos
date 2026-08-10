import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

/** RAG 召回测试入口已下线 */
export default async function AiRecallPage() {
  await requireSession();
  redirect("/app/settings");
}
