export type ThemeId = "night" | "khaki";

export const THEME_STORAGE_KEY = "owncosmos-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return value === "night" || value === "khaki";
}

export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "night";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "khaki" ? "khaki" : "night";
}
