/** Phase 13: 固定心情选项（存 key，UI 用 emoji + 中文） */

export type MoodKey =
  | "calm"
  | "happy"
  | "focused"
  | "tired"
  | "anxious"
  | "sad"
  | "moved"
  | "neutral";

export type MoodOption = {
  key: MoodKey;
  label: string;
  emoji: string;
};

export const MOOD_OPTIONS: readonly MoodOption[] = [
  { key: "calm", label: "平静", emoji: "🙂" },
  { key: "happy", label: "开心", emoji: "😄" },
  { key: "focused", label: "专注", emoji: "🎯" },
  { key: "tired", label: "疲惫", emoji: "😮‍💨" },
  { key: "anxious", label: "焦虑", emoji: "😰" },
  { key: "sad", label: "低落", emoji: "😔" },
  { key: "moved", label: "触动", emoji: "🥹" },
  { key: "neutral", label: "无感", emoji: "😐" },
] as const;

const MOOD_MAP = new Map(MOOD_OPTIONS.map((m) => [m.key, m]));

export function isMoodKey(raw: string | null | undefined): raw is MoodKey {
  return Boolean(raw && MOOD_MAP.has(raw as MoodKey));
}

export function parseMoodKey(
  raw: string | null | undefined,
): MoodKey | null {
  if (!raw?.trim()) return null;
  const key = raw.trim();
  return isMoodKey(key) ? key : null;
}

export function moodLabel(key: string | null | undefined): string {
  if (!key) return "";
  return MOOD_MAP.get(key as MoodKey)?.label ?? key;
}

export function moodEmoji(key: string | null | undefined): string {
  if (!key) return "";
  return MOOD_MAP.get(key as MoodKey)?.emoji ?? "";
}

export function moodDisplay(key: string | null | undefined): string {
  if (!key) return "";
  const m = MOOD_MAP.get(key as MoodKey);
  if (!m) return key;
  return `${m.emoji} ${m.label}`;
}
