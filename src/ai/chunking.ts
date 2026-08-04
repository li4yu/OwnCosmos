import { createHash } from "node:crypto";
import {
  CHUNK_OVERLAP,
  CHUNK_SHORT_MAX,
  CHUNK_SIZE_MAX,
  CHUNK_SIZE_MIN,
} from "@/ai/config";
import { stripToPlainText } from "@/lib/rich-text";

export function hashContent(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function normalizeArchivePlainText(input: {
  title: string;
  body: string;
  bodyFormat?: string | null;
}): string {
  const title = input.title.trim();
  const body = stripToPlainText(input.body ?? "").trim();
  return [title, body].filter(Boolean).join("\n");
}

export type TextChunk = {
  index: number;
  text: string;
};

/**
 * 馆藏切分：短文整篇一块；长文约 500–700 字 + overlap。
 * 手册可直接传入已按节切好的 plain。
 */
export function chunkPlainText(plain: string): TextChunk[] {
  const text = plain.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  if (text.length <= CHUNK_SHORT_MAX) {
    return [{ index: 0, text }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE_MAX, text.length);
    if (end < text.length) {
      const window = text.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf("\n"),
        window.lastIndexOf("。"),
        window.lastIndexOf("；"),
        window.lastIndexOf("！"),
        window.lastIndexOf("？"),
        window.lastIndexOf(". "),
      );
      if (breakAt >= CHUNK_SIZE_MIN) {
        end = start + breakAt + 1;
      }
    }
    const slice = text.slice(start, end).trim();
    if (slice) {
      chunks.push({ index, text: slice });
      index += 1;
    }
    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP, start + 1);
  }
  return chunks;
}

export function withMetaPrefix(
  meta: Record<string, string | null | undefined>,
  body: string,
): string {
  const parts = Object.entries(meta)
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `[${k}=${String(v).trim()}]`);
  return `${parts.join("")}\n${body}`.trim();
}
