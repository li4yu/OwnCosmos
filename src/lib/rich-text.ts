import { BODY_FORMAT_HTML, BODY_FORMAT_PLAIN } from "@/db/schema";

const ALLOWED_UPLOAD_PREFIX = "/uploads/essays/";

/** 去掉标签，知识库 / 列表摘要只看纯文本 */
export function stripToPlainText(htmlOrText: string): string {
  const raw = htmlOrText ?? "";
  if (!raw.includes("<")) return raw.replace(/\u00a0/g, " ").trim();
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

/** 正文是否「空」（无字、可仅有空标签） */
export function isRichBodyEmpty(htmlOrText: string): boolean {
  return !stripToPlainText(htmlOrText);
}

/**
 * 轻量白名单：只留基础段落样式与本站 essay 插图。
 * 不做完整 HTML sanitizer；不信任外链图。
 */
export function sanitizeEssayHtml(input: string): string {
  let html = input ?? "";
  html = html.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "");
  html = html.replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "");
  html = html.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  html = html.replace(
    /<a\b([^>]*)>/gi,
    (_m, attrs: string) => {
      const href = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const raw = href?.[2] ?? href?.[3] ?? href?.[4] ?? "";
      if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) {
        return "<a>";
      }
      return `<a href="${raw.replace(/"/g, "")}" rel="noopener noreferrer" target="_blank">`;
    },
  );
  html = html.replace(/<img\b([^>]*)>/gi, (_m, attrs: string) => {
    const src = /src\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const raw = (src?.[2] ?? src?.[3] ?? src?.[4] ?? "").trim();
    if (!raw.startsWith(ALLOWED_UPLOAD_PREFIX)) return "";
    const altMatch = /alt\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    const alt = (altMatch?.[2] ?? altMatch?.[3] ?? "").replace(/"/g, "");
    return `<img src="${raw}" alt="${alt}">`;
  });
  return html.trim();
}

/** 从 HTML 抽出本站插图 URL（去重保序） */
export function extractEssayImageUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const re = /<img\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const url = (m[2] ?? m[3] ?? m[4] ?? "").trim();
    if (!url.startsWith(ALLOWED_UPLOAD_PREFIX) || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export function resolveBodyFormat(
  raw: string | null | undefined,
): typeof BODY_FORMAT_PLAIN | typeof BODY_FORMAT_HTML {
  return raw === BODY_FORMAT_HTML ? BODY_FORMAT_HTML : BODY_FORMAT_PLAIN;
}

/** plain → 编辑器初始 HTML */
export function plainToEditorHtml(plain: string): string {
  const text = plain ?? "";
  if (!text.trim()) return "";
  if (text.includes("<p>") || text.includes("<br")) return text;
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((l) => escapeHtml(l))
        .join("<br>");
      return `<p>${lines || "<br>"}</p>`;
    })
    .join("");
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export { ALLOWED_UPLOAD_PREFIX };
