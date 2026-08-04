import type { Metadata } from "next";
import { GuideArticle } from "@/components/guide/guide-article";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = {
  title: "使用说明 · 自宇",
  description: "自宇（My Own Cosmos）详细使用指南：模块、闭环、操作步骤与硬规则",
};

export default function AppGuidePage() {
  return (
    <main className="flex flex-col gap-3">
      <PageHeader
        title="使用说明"
        eyebrow="USER GUIDE"
        description="怎么理解自宇、怎么操作各模块，以及沉淀与归档等硬规则"
        backHref="/app"
        backLabel="返回首页"
      />
      <GuideArticle mode="app" loggedIn />
    </main>
  );
}
