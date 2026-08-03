export type DatedNoteBlock = { date: string; text: string };

/** 正文按「日期行 + 心得」分段；无法识别的旧正文保留为 legacy */
export function parseDatedNotes(body: string): {
  blocks: DatedNoteBlock[];
  legacy: string;
} {
  const trimmed = body.trim();
  if (!trimmed) return { blocks: [], legacy: "" };

  const blocks: DatedNoteBlock[] = [];
  const legacyLines: string[] = [];
  let current: DatedNoteBlock | null = null;

  for (const line of trimmed.split(/\r?\n/)) {
    const date = /^(\d{4}-\d{2}-\d{2})$/.exec(line)?.[1];
    if (date) {
      if (current) {
        blocks.push({ date: current.date, text: current.text.trimEnd() });
      }
      current = { date, text: "" };
      continue;
    }
    if (current) {
      current.text += (current.text ? "\n" : "") + line;
    } else {
      legacyLines.push(line);
    }
  }
  if (current) {
    blocks.push({ date: current.date, text: current.text.trimEnd() });
  }

  return { blocks, legacy: legacyLines.join("\n").trim() };
}

export function formatDatedNotes(blocks: DatedNoteBlock[], legacy: string) {
  const parts: string[] = [];
  if (legacy) parts.push(legacy);
  for (const block of blocks) {
    parts.push(`${block.date}\n${block.text || "（已打卡）"}`);
  }
  return parts.join("\n\n");
}

/** 按日追加心得；同日再写则改写该日段落 */
export function mergeDatedArchiveBody(
  prevBody: string,
  checkinDate: string,
  note: string,
  emptyFallback = "（已打卡）",
) {
  const text = note.trim() || emptyFallback;
  const { blocks, legacy } = parseDatedNotes(prevBody);
  const idx = blocks.findIndex((b) => b.date === checkinDate);
  if (idx >= 0) {
    blocks[idx] = { date: checkinDate, text };
  } else {
    blocks.push({ date: checkinDate, text });
    blocks.sort((a, b) => a.date.localeCompare(b.date));
  }
  return formatDatedNotes(blocks, legacy);
}

/** 取消某日打卡：去掉该日段落；若正文已空返回空串 */
export function removeDatedArchiveDay(prevBody: string, checkinDate: string) {
  const { blocks, legacy } = parseDatedNotes(prevBody);
  const next = blocks.filter((b) => b.date !== checkinDate);
  if (next.length === blocks.length) {
    return formatDatedNotes(blocks, legacy);
  }
  return formatDatedNotes(next, legacy);
}
