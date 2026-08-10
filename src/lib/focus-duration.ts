/** 专注时长展示：毫秒 →「1 时 02 分 03 秒」或紧凑 HH:MM:SS */

export function formatFocusDurationMs(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h} 时 ${pad(m)} 分 ${pad(s)} 秒`;
  if (m > 0) return `${m} 分 ${pad(s)} 秒`;
  return `${s} 秒`;
}

export function formatFocusClock(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

/** 专注记录默认标题 */
export function defaultFocusTitle(mode: string, ms: number) {
  const modeLabel = mode === "countdown" ? "倒计时" : "正向计时";
  return `${modeLabel} · ${formatFocusDurationMs(ms)}`;
}
