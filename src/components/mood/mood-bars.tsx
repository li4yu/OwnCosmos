import { moodEmoji, moodLabel } from "@/lib/moods";
import type { MoodCount } from "@/services/review";

type MoodBarsProps = {
  items: MoodCount[];
  emptyHint?: string;
};

/** 情绪分布 · emoji + 横条 + 占比 */
export function MoodBars({
  items,
  emptyHint = "尚无带情绪标记的馆藏。归档时可选心情，或在馆藏详情补改。",
}: MoodBarsProps) {
  if (items.length === 0) {
    return <p className="text-xs text-[var(--mist)]">{emptyHint}</p>;
  }
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const pct = Math.round((item.count / total) * 100);
        const barPct = Math.max(8, Math.round((item.count / max) * 100));
        const emoji = moodEmoji(item.mood);
        const name = moodLabel(item.mood) || item.label;
        return (
          <li key={item.mood} className="group flex items-center gap-2">
            <span
              className="w-5 shrink-0 text-center text-sm leading-none"
              aria-hidden
            >
              {emoji || "·"}
            </span>
            <span className="w-8 shrink-0 text-[13px] text-[var(--paper)]">
              {name}
            </span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-[var(--line)]/50">
              <div
                className="ui-hover-bar h-full rounded-sm"
                style={{ width: `${barPct}%` }}
                title={`${name} · ${item.count} 条 · ${pct}%`}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-mono text-xs text-[var(--mist)] transition group-hover:text-[var(--amber)]">
              {pct}%
            </span>
            <span className="w-5 shrink-0 text-right font-mono text-xs text-[var(--mist)]/80">
              {item.count}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
