export type ThemeId = "night" | "khaki" | "mono";

export const THEME_STORAGE_KEY = "owncosmos-theme";

export const THEME_OPTIONS: {
  id: ThemeId;
  label: string;
  hint: string;
  /** 设置页色卡预览 */
  swatches: [string, string, string, string];
}[] = [
  {
    id: "night",
    label: "深空夜色",
    hint: "深蓝夜空",
    swatches: ["#070b14", "#10182a", "#d4b072", "#6a9ea3"],
  },
  {
    id: "khaki",
    label: "时光卡其",
    hint: "暖纸时光",
    swatches: ["#c4b28a", "#efe6d2", "#6e4e28", "#5c6a52"],
  },
  {
    id: "mono",
    label: "墨白",
    hint: "银月炭黑",
    swatches: ["#14171c", "#1e242c", "#e6dfd0", "#8fa8b8"],
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return value === "night" || value === "khaki" || value === "mono";
}

export function themeLabel(id: ThemeId): string {
  return THEME_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function nextTheme(current: ThemeId): ThemeId {
  const i = THEME_OPTIONS.findIndex((o) => o.id === current);
  const idx = i < 0 ? 0 : (i + 1) % THEME_OPTIONS.length;
  return THEME_OPTIONS[idx]!.id;
}

export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "night";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(stored) ? stored : "night";
}
