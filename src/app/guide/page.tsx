import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/guide-article";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "使用说明 · 自宇",
  description: "自宇（My Own Cosmos）详细使用指南：模块、闭环、操作步骤与硬规则",
};

export default async function GuidePage() {
  const session = await getSession();
  return <GuideArticle mode="guest" loggedIn={Boolean(session)} />;
}
