import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { essay, plan, PLAN_STATUS_OPEN } from "@/db/schema";
import { moodDisplay } from "@/lib/moods";
import { stripToPlainText } from "@/lib/rich-text";
import { planKindLabel } from "@/lib/plan-kinds";

function formatWhen(d: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** 导出未归档随笔 + 未完成计划为纯文本 */
export async function buildOpenContentExportText(userId: string) {
  const [essays, plans] = await Promise.all([
    getDb()
      .select()
      .from(essay)
      .where(and(eq(essay.userId, userId), isNull(essay.archivedAt)))
      .orderBy(asc(essay.updatedAt)),
    getDb()
      .select()
      .from(plan)
      .where(
        and(
          eq(plan.userId, userId),
          eq(plan.status, PLAN_STATUS_OPEN),
          isNull(plan.archivedAt),
        ),
      )
      .orderBy(asc(plan.updatedAt)),
  ]);

  const lines: string[] = [];
  const stamped = formatWhen(new Date());
  lines.push("自宇 · 未归档内容导出");
  lines.push(`导出时间：${stamped}`);
  lines.push("");

  lines.push("======== 随笔（未归档） ========");
  if (essays.length === 0) {
    lines.push("（无）");
  } else {
    for (const e of essays) {
      lines.push("");
      lines.push(`## ${e.title || "无标题"}`);
      lines.push(`更新：${formatWhen(e.updatedAt)}`);
      if (e.mood) lines.push(`心情：${moodDisplay(e.mood)}`);
      lines.push("");
      lines.push(stripToPlainText(e.body) || "（空正文）");
      lines.push("---");
    }
  }

  lines.push("");
  lines.push("======== 来日途 · 规划（进行中） ========");
  if (plans.length === 0) {
    lines.push("（无）");
  } else {
    for (const p of plans) {
      lines.push("");
      lines.push(`## ${p.title || "无标题"}`);
      lines.push(`类型：${planKindLabel(p.kind)}`);
      lines.push(
        `截止：${p.dueAt ? formatWhen(p.dueAt) : "（未设）"}`,
      );
      lines.push(`更新：${formatWhen(p.updatedAt)}`);
      if (p.mood) lines.push(`心情：${moodDisplay(p.mood)}`);
      lines.push("");
      lines.push(p.body || "（空正文）");
      lines.push("---");
    }
  }

  lines.push("");
  lines.push(
    `合计：随笔 ${essays.length} 篇 · 计划 ${plans.length} 条`,
  );

  return {
    text: lines.join("\n"),
    essayCount: essays.length,
    planCount: plans.length,
  };
}
