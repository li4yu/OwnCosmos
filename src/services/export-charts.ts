import {
  getRecentCheckinDayCounts,
  getRecentFocusDayStats,
} from "@/services/home-pulse";
import { getPastHubSnapshot } from "@/services/review";

export type ChartExportPayload = {
  meta: {
    product: string;
    title: string;
    exportedAt: string;
    version: 1;
  };
  homePulse: {
    checkinDays: Awaited<ReturnType<typeof getRecentCheckinDayCounts>>;
    focusDays: Awaited<ReturnType<typeof getRecentFocusDayStats>>;
  };
  pastHub: Awaited<ReturnType<typeof getPastHubSnapshot>>;
};

function formatStamp(d = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** 聚合首页脉搏 + 昔时往沉淀一览，供设置页导出 */
export async function buildChartExportPayload(
  userId: string,
): Promise<ChartExportPayload> {
  const [pastHub, checkinDays, focusDays] = await Promise.all([
    getPastHubSnapshot(userId),
    getRecentCheckinDayCounts(userId, 7),
    getRecentFocusDayStats(userId, 7),
  ]);

  return {
    meta: {
      product: "OwnCosmos",
      title: "自宇 · 图表导出",
      exportedAt: new Date().toISOString(),
      version: 1,
    },
    homePulse: { checkinDays, focusDays },
    pastHub,
  };
}

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function barRow(
  y: number,
  label: string,
  value: number,
  max: number,
  barColor: string,
  width = 520,
) {
  const labelW = 88;
  const valueW = 48;
  const trackX = labelW + 8;
  const trackW = width - trackX - valueW - 8;
  const fillW =
    max <= 0 || value <= 0
      ? 0
      : Math.max(2, Math.round((value / max) * trackW));
  return `
  <text x="0" y="${y + 11}" fill="#9db0c4" font-size="11" font-family="ui-monospace, monospace">${esc(label)}</text>
  <rect x="${trackX}" y="${y + 2}" width="${trackW}" height="10" rx="2" fill="#1c2a3a"/>
  <rect x="${trackX}" y="${y + 2}" width="${fillW}" height="10" rx="2" fill="${barColor}"/>
  <text x="${width}" y="${y + 11}" fill="#c9d6e4" font-size="11" font-family="ui-monospace, monospace" text-anchor="end">${value}</text>`;
}

function sectionTitle(y: number, title: string) {
  return `<text x="0" y="${y}" fill="#e8eef5" font-size="14" font-family="Georgia, 'Noto Serif SC', serif" letter-spacing="0.08em">${esc(title)}</text>`;
}

/** 将图表载荷画成可下载 SVG（深色笺面，不依赖运行时主题） */
export function buildChartExportSvg(payload: ChartExportPayload): string {
  const width = 560;
  const pad = 28;
  const innerW = width - pad * 2;
  const blocks: string[] = [];
  let y = 36;

  blocks.push(`
  <text x="0" y="${y}" fill="#e8eef5" font-size="20" font-family="Georgia, 'Noto Serif SC', serif">${esc(payload.meta.title)}</text>
  <text x="0" y="${y + 22}" fill="#6f91a8" font-size="11" font-family="ui-monospace, monospace">导出时间 ${esc(formatStamp(new Date(payload.meta.exportedAt)))} · 馆藏合计 ${payload.pastHub.total}</text>`);
  y += 56;

  const checkins = payload.homePulse.checkinDays;
  const checkMax = Math.max(
    1,
    ...checkins.map((d) => d.habitCount + d.cycleCount),
  );
  blocks.push(sectionTitle(y, "近七日打卡（日课 + 轮期）"));
  y += 18;
  for (const d of checkins) {
    const total = d.habitCount + d.cycleCount;
    blocks.push(
      barRow(y, d.label, total, checkMax, "#3d9e8f", innerW),
    );
    y += 20;
  }
  y += 18;

  const focusDays = payload.homePulse.focusDays;
  const focusMax = Math.max(1, ...focusDays.map((d) => d.ms));
  blocks.push(sectionTitle(y, "近七日凝时（分钟）"));
  y += 18;
  for (const d of focusDays) {
    const minutes = Math.round(d.ms / 60000);
    blocks.push(
      barRow(
        y,
        d.label,
        minutes,
        Math.ceil(focusMax / 60000) || 1,
        "#d4a35c",
        innerW,
      ),
    );
    y += 20;
  }
  y += 18;

  const dens = payload.pastHub.last30Days;
  const densMax = Math.max(1, ...dens.map((p) => p.count));
  blocks.push(sectionTitle(y, "近三十日沉淀密度"));
  y += 18;
  for (const p of dens) {
    blocks.push(barRow(y, p.label, p.count, densMax, "#6f91a8", innerW));
    y += 20;
  }
  y += 18;

  const types = payload.pastHub.byType;
  const typeMax = Math.max(1, ...types.map((t) => t.count), 1);
  blocks.push(sectionTitle(y, "馆藏类型"));
  y += 18;
  if (types.length === 0) {
    blocks.push(
      `<text x="0" y="${y + 12}" fill="#9db0c4" font-size="12">（暂无）</text>`,
    );
    y += 28;
  } else {
    for (const t of types) {
      blocks.push(barRow(y, t.label, t.count, typeMax, "#d4a35c", innerW));
      y += 20;
    }
  }
  y += 18;

  const moods = payload.pastHub.byMood;
  const moodMax = Math.max(1, ...moods.map((m) => m.count), 1);
  blocks.push(sectionTitle(y, "绪印分布"));
  y += 18;
  if (moods.length === 0) {
    blocks.push(
      `<text x="0" y="${y + 12}" fill="#9db0c4" font-size="12">（暂无）</text>`,
    );
    y += 28;
  } else {
    for (const m of moods) {
      blocks.push(barRow(y, m.label, m.count, moodMax, "#3d9e8f", innerW));
      y += 20;
    }
  }

  const height = y + 36;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0f1720"/>
  <g transform="translate(${pad}, 0)">
    ${blocks.join("\n")}
  </g>
</svg>`;
}

/** 多段 CSV：便于表格软件打开 */
export function buildChartExportCsv(payload: ChartExportPayload): string {
  const lines: string[] = [];
  lines.push("# 自宇 · 图表导出");
  lines.push(`# exportedAt,${payload.meta.exportedAt}`);
  lines.push(`# archiveTotal,${payload.pastHub.total}`);
  lines.push("");
  lines.push("## home_pulse_checkin");
  lines.push("date,label,habitCount,cycleCount");
  for (const d of payload.homePulse.checkinDays) {
    lines.push(`${d.date},${d.label},${d.habitCount},${d.cycleCount}`);
  }
  lines.push("");
  lines.push("## home_pulse_focus");
  lines.push("date,label,ms,count,minutes");
  for (const d of payload.homePulse.focusDays) {
    lines.push(
      `${d.date},${d.label},${d.ms},${d.count},${Math.round(d.ms / 60000)}`,
    );
  }
  lines.push("");
  lines.push("## past_density_30d");
  lines.push("key,label,count");
  for (const p of payload.pastHub.last30Days) {
    lines.push(`${p.key},${p.label},${p.count}`);
  }
  lines.push("");
  lines.push("## past_by_type");
  lines.push("type,label,count");
  for (const t of payload.pastHub.byType) {
    lines.push(`${t.type},${t.label},${t.count}`);
  }
  lines.push("");
  lines.push("## past_by_mood");
  lines.push("mood,label,count");
  for (const m of payload.pastHub.byMood) {
    lines.push(`${m.mood},${m.label},${m.count}`);
  }
  return lines.join("\n");
}
