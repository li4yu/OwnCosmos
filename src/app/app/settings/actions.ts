"use server";

import { requireSession } from "@/lib/session";
import { buildOpenContentExportText } from "@/services/export-text";

/** Phase 15: 导出未归档随笔 / 进行中计划文本 */
export async function exportOpenContentAction(): Promise<
  | { ok: true; text: string; essayCount: number; planCount: number }
  | { ok: false; error: string }
> {
  const session = await requireSession();
  try {
    const data = await buildOpenContentExportText(session.user.id);
    return { ok: true, ...data };
  } catch {
    return { ok: false, error: "导出失败，请稍后重试" };
  }
}
