/**
 * 将当前用户所有已藏忆馆藏回填进向量库
 *
 * 用法：
 *   AI_ENABLED=true DASHSCOPE_API_KEY=... pnpm tsx scripts/rag-backfill-user.ts <userId>
 */
import { config } from "dotenv";
import { eq, and } from "drizzle-orm";
import { upsertArchiveItemRag, ensureRagCollection } from "../src/ai";
import { getDb } from "../src/db";
import { archiveItem } from "../src/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const userId = process.argv[2]?.trim();
  if (!userId) {
    console.error("用法: pnpm tsx scripts/rag-backfill-user.ts <userId>");
    process.exit(1);
  }
  await ensureRagCollection();
  const rows = await getDb()
    .select({ id: archiveItem.id })
    .from(archiveItem)
    .where(
      and(eq(archiveItem.userId, userId), eq(archiveItem.inKnowledge, true)),
    );
  console.log(`待同步 ${rows.length} 条…`);
  let ok = 0;
  let fail = 0;
  for (const r of rows) {
    const res = await upsertArchiveItemRag(userId, r.id);
    if (res.ok) {
      ok += 1;
      console.log("OK", r.id);
    } else {
      fail += 1;
      console.error("FAIL", r.id, res.error);
    }
  }
  console.log(`完成：成功 ${ok}，失败 ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
