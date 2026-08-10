import type { ChatMessage } from "@/ai/llm";

export const POLISH_STYLE_SMOOTH = "smooth" as const;
export const POLISH_STYLE_CONCISE = "concise" as const;
export const POLISH_STYLE_VIVID = "vivid" as const;
export const POLISH_STYLE_LITERARY = "literary" as const;

export const POLISH_STYLES = [
  POLISH_STYLE_SMOOTH,
  POLISH_STYLE_CONCISE,
  POLISH_STYLE_VIVID,
  POLISH_STYLE_LITERARY,
] as const;

export type PolishStyle = (typeof POLISH_STYLES)[number];
export type PolishScope = "selection" | "full";

export const POLISH_STYLE_OPTIONS: {
  value: PolishStyle;
  label: string;
  hint: string;
}[] = [
  {
    value: POLISH_STYLE_SMOOTH,
    label: "通顺",
    hint: "理顺语句，少改原意",
  },
  {
    value: POLISH_STYLE_CONCISE,
    label: "简洁",
    hint: "删冗句，更短更清楚",
  },
  {
    value: POLISH_STYLE_VIVID,
    label: "生动",
    hint: "稍增画面感，克制不煽情",
  },
  {
    value: POLISH_STYLE_LITERARY,
    label: "文雅",
    hint: "用词更细腻，仍贴原文",
  },
];

export const POLISH_MAX_CHARS = 12000;

const STYLE_LINE: Record<PolishStyle, string> = {
  [POLISH_STYLE_SMOOTH]: "风格：通顺自然，优先理顺语句与节奏，少改原意。",
  [POLISH_STYLE_CONCISE]: "风格：简洁；删去重复与虚词，长度偏短（约 0.6–1.0 倍），勿丢关键事实。",
  [POLISH_STYLE_VIVID]: "风格：生动一点；可略增具体感受与画面，但克制，禁止空洞鸡汤。",
  [POLISH_STYLE_LITERARY]: "风格：文雅细腻；用词更讲究，仍贴近用户原文语气，勿写成文言文堆砌。",
};

export function isPolishStyle(v: string): v is PolishStyle {
  return (POLISH_STYLES as readonly string[]).includes(v);
}

export function buildPolishMessages(input: {
  scope: PolishScope;
  style: PolishStyle;
  text: string;
}): ChatMessage[] {
  const scopeLine =
    input.scope === "selection"
      ? "你是自宇「随笔」的润色助手。用户会提供一段选中原文，请在保持原意与人称的前提下润色。"
      : "你是自宇「随笔」的润色助手。用户会提供一篇随笔全文，请整体润色。";

  const system = `${scopeLine}

要求：
1. ${STYLE_LINE[input.style]}
2. 不擅自改变事实、承诺与专有名词；不要扩写成另一篇文章。
3. 选区润色时长度与原文同量级（约 0.8–1.3 倍，简洁风格可更短）；全文可微调段落衔接，不重组为另一篇。
4. 不要解释你改了什么；不要加标题或「润色如下」等前言；不要用 Markdown 代码块包裹。
5. 不要删掉用户明显想保留的标记（如日期、@、链接原文）。
6. 输出只含润色后的纯文本（可用空行分段）。`;

  const user = `润色范围：${input.scope}
风格：${input.style}
原文：
${input.text}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
