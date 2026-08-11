import fs from "node:fs";
import { execSync } from "node:child_process";

const keep = ["昔时往", "今时际", "来日途", "凝时"];
const old = [
  "流思笺",
  "临期帖",
  "拾忆馆藏",
  "往迹廊",
  "心绪鉴",
  "逾时沉淀",
  "藏忆",
  "抹忆",
  "缘想",
  "借忆",
  "绪签",
  "轮期",
  "日课",
  "临期配",
  "同年回望",
  "随笔沉淀",
  "顺钟",
  "逆漏",
  "凝录",
];

console.log("=== major modules still present ===");
for (const k of keep) {
  try {
    const n = execSync(`rg -c "${k}" --glob "*.{ts,tsx}" src`, {
      encoding: "utf8",
    }).trim();
    console.log(k, "ok", n.split("\n").length, "files");
  } catch {
    console.log(k, "MISSING?");
  }
}

console.log("=== old names leftover ===");
for (const o of old) {
  try {
    const out = execSync(`rg -l "${o}" --glob "*.{ts,tsx,md}" src docs AGENTS.md`, {
      encoding: "utf8",
    }).trim();
    if (out) console.log(o, "->", out.split(/\r?\n/).join(", "));
  } catch {
    /* none */
  }
}

console.log("=== modules.ts subfeatures ===");
const t = fs.readFileSync("src/lib/modules.ts", "utf8");
for (const m of t.matchAll(/name: "([^"]+)"/g)) console.log("-", m[1]);

console.log("=== awkward doubles scan ===");
const awkward = [
  "随笔随笔",
  "馆藏馆藏",
  "每日每日打卡",
  "周期计划计划",
  "进知识库进知识库",
  "删除归档删除",
  "标签标签",
  "临期提醒提醒",
];
for (const a of awkward) {
  try {
    const out = execSync(`rg -n "${a}" --glob "*.{ts,tsx,md}" src docs`, {
      encoding: "utf8",
    });
    console.log("FOUND", a, out);
  } catch {
    /* ok */
  }
}

console.log("=== sample keep button ===");
console.log(fs.readFileSync("src/components/archive/keep-archive-button.tsx", "utf8").slice(0, 800));
