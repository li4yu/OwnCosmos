"use server";

import { requireSession } from "@/lib/session";
import {
  buildChartExportCsv,
  buildChartExportPayload,
  buildChartExportSvg,
} from "@/services/export-charts";
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

/** 图表导出：首页脉搏 + 昔时往沉淀一览 */
export async function exportChartsAction(): Promise<
  | {
      ok: true;
      json: string;
      csv: string;
      svg: string;
      archiveTotal: number;
    }
  | { ok: false; error: string }
> {
  const session = await requireSession();
  try {
    const payload = await buildChartExportPayload(session.user.id);
    return {
      ok: true,
      json: JSON.stringify(payload, null, 2),
      csv: buildChartExportCsv(payload),
      svg: buildChartExportSvg(payload),
      archiveTotal: payload.pastHub.total,
    };
  } catch {
    return { ok: false, error: "图表导出失败，请稍后重试" };
  }
}
