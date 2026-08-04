/**
 * 将 docs/操作手册-V1.0.md 按 ## / ### 切节写入 Milvus（project corpus）
 *
 * 用法：
 *   AI_ENABLED=true DASHSCOPE_API_KEY=... pnpm tsx scripts/rag-import-handbook.ts
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { upsertHandbookSectionRag, ensureRagCollection } from "../src/ai";

config({ path: ".env.local" });
config({ path: ".env" });

type Section = { sourceId: string; title: string; body: string };

function parseHandbook(md: string): Section[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const sections: Section[] = [];
  let h2 = "root";
  let h3: string | null = null;
  let buf: string[] = [];
  let title = "前言";

  const flush = () => {
    const body = buf.join("\n").trim();
    if (!body && title === "前言") {
      buf = [];
      return;
    }
    const slug = (h3 ? `${h2}/${h3}` : h2)
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff/-]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);
    sections.push({
      sourceId: `manual:v1:${slug || sections.length}`,
      title,
      body: body || title,
    });
    buf = [];
  };

  for (const line of lines) {
    const m2 = /^(##)\s+(.+)$/.exec(line);
    const m3 = /^(###)\s+(.+)$/.exec(line);
    if (m2) {
      flush();
      h2 = m2[2]!.trim();
      h3 = null;
      title = h2;
      continue;
    }
    if (m3) {
      flush();
      h3 = m3[2]!.trim();
      title = `${h2} · ${h3}`;
      continue;
    }
    buf.push(line);
  }
  flush();
  return sections.filter((s) => s.body.trim().length > 0);
}

async function main() {
  const file = path.join(process.cwd(), "docs", "操作手册-V1.0.md");
  const md = readFileSync(file, "utf8");
  const sections = parseHandbook(md);
  console.log(`解析 ${sections.length} 节，准备入库…`);
  await ensureRagCollection();
  let ok = 0;
  let fail = 0;
  for (const s of sections) {
    const r = await upsertHandbookSectionRag(s);
    if (r.ok) {
      ok += 1;
      console.log("OK", s.sourceId, s.title.slice(0, 40));
    } else {
      fail += 1;
      console.error("FAIL", s.sourceId, r.error);
    }
  }
  console.log(`完成：成功 ${ok}，失败 ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
